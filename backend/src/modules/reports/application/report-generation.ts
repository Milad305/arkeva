import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { Notifier } from '../../notifications/index.js';
import type { Format, SectionKey, TemplateDef } from '../domain/catalog.js';
import { pageTemplates, renderHtml } from '../domain/render-html.js';
import { renderXls } from '../domain/render-xls.js';
import { GeneratedReport } from '../domain/report.entities.js';
import { PdfRenderer, reportFontCss } from '../infrastructure/pdf-renderer.js';
import { CONTENT_TYPE, ReportDelivery } from './report-delivery.js';
import { ReportData } from './report-data.js';
import { ReportLibrary } from './report-library.js';
import type { RangeOption } from './report-ranges.js';

// تولید فایل گزارش (management-reports.md ۷.۲، ۷.۴؛ D06): ردیف queued و کار صف `report.generate` (۳ تلاش)؛ کارگر محتوا را از
// اعداد ذخیره‌شده می‌سازد، PDF (Chromium) یا Excel (SpreadsheetML) را در ذخیره‌ساز می‌گذارد و تحویل می‌دهد. گزارش دورهٔ بسته با
// اجرای دوباره همان فایل را می‌دهد (۷.۱). مشترک میان تولید دستی، ارسال و زمان‌بندی.

export const REPORT_QUEUE: QueueDef = {
  name: 'report.generate',
  policy: 'standard',
  // ۷.۲ بند ۱: ۳ تلاش
  retryLimit: 2,
  retryDelaySec: 2,
  retryBackoff: true,
  expireInSeconds: 600,
  priority: 20,
  concurrency: 1,
};

interface ReportJob extends JobData {
  readonly orgId: string;
  readonly reportId: string;
}

export interface EnqueueSpec {
  readonly orgId: string;
  readonly projectId: string | null;
  readonly template: TemplateDef;
  readonly range: RangeOption;
  readonly format: Format;
  readonly disabled: readonly SectionKey[];
  readonly amounts: boolean;
  readonly projectIds: readonly string[];
  readonly scopeLabel: string;
  readonly requestedByUserId: string | null;
  readonly scheduleId: string | null;
  readonly deliveries: { readonly users: readonly string[]; readonly emails: readonly string[] };
}

@Injectable()
export class ReportGeneration implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly jobs: Jobs,
    private readonly storage: ObjectStorage,
    private readonly library: ReportLibrary,
    private readonly data: ReportData,
    private readonly renderer: PdfRenderer,
    private readonly notifier: Notifier,
    private readonly delivery: ReportDelivery,
  ) {}

  onModuleInit(): void {
    this.jobs.work<ReportJob>(REPORT_QUEUE, (job) => this.run(job.data.reportId, job.retryCount >= REPORT_QUEUE.retryLimit));
  }

  /** درون تراکنش فراخوان: ردیف و کار صف. دورهٔ بستهٔ تکراری بی گیرنده همان لحظه done با همان فایل (D06). */
  async enqueue(tx: EntityManager, spec: EnqueueSpec): Promise<GeneratedReport> {
    const same = spec.range.closed
      ? await tx.findOne(
          GeneratedReport,
          {
            templateId: spec.template.id,
            projectId: spec.projectId,
            rangeId: spec.range.id,
            format: spec.format,
            includesAmounts: spec.amounts,
            status: 'done',
            storageKey: { $ne: null },
          },
          { orderBy: { createdAt: 'asc' } },
        )
      : null;
    const reuse = same && spec.disabled.length === 0 && same.disabledSections.length === 0 ? same : null;
    const deliver = spec.deliveries.users.length + spec.deliveries.emails.length > 0;
    const now = this.clock.now();
    const row = tx.create(GeneratedReport, {
      id: newId(),
      orgId: spec.orgId,
      projectId: spec.projectId,
      templateId: spec.template.id,
      templateName: spec.template.name,
      scopeLabel: spec.scopeLabel,
      rangeId: spec.range.id,
      rangeLabel: spec.range.label,
      rangeFrom: spec.range.from,
      rangeTo: spec.range.to,
      format: spec.format,
      sourceKind: spec.range.closed ? 'period_snapshot' : 'live',
      includesAmounts: spec.amounts,
      watermark: spec.range.closed ? 'none' : 'open_period',
      disabledSections: [...spec.disabled],
      projectIds: [...spec.projectIds],
      status: reuse && !deliver ? 'done' : 'queued',
      error: null,
      attempts: 0,
      requestedByUserId: spec.requestedByUserId,
      // فایل دورهٔ بسته از پیش هست؛ کار صف فقط تحویل می‌دهد
      storageKey: reuse?.storageKey ?? null,
      sizeBytes: reuse?.sizeBytes ?? null,
      pageCount: reuse?.pageCount ?? 0,
      createdAt: now,
      finishedAt: reuse && !deliver ? now : null,
      scheduleId: spec.scheduleId,
      deliveries: { users: [...spec.deliveries.users], emails: [...spec.deliveries.emails] },
    });
    await tx.flush();
    if (row.status === 'queued') await this.jobs.send(tx, REPORT_QUEUE, { orgId: spec.orgId, reportId: row.id });
    this.audit.record(tx, {
      action: 'report.generated',
      entityType: 'GeneratedReport',
      entityId: row.id,
      projectId: spec.projectId,
      orgId: spec.orgId,
      ...(spec.requestedByUserId ? {} : { actor: 'system' as const }),
      after: {
        templateId: spec.template.id,
        format: spec.format,
        includesAmounts: spec.amounts,
        scheduleId: spec.scheduleId,
        recipients: spec.deliveries.users.length + spec.deliveries.emails.length,
      },
    });
    return row;
  }

  /** کار صف: ساخت و تحویل؛ شکست آخرین تلاش ← failed، اعلان و وضعیت زمان‌بندی (AC-MR-10). */
  async run(reportId: string, final: boolean): Promise<void> {
    const report = await this.em.findOne(GeneratedReport, { id: reportId });
    if (!report || report.status === 'done') return;
    await this.em.nativeUpdate(GeneratedReport, { id: reportId }, { status: 'running', attempts: report.attempts + 1 });
    let ready: GeneratedReport;
    try {
      let key = report.storageKey ?? null;
      let size = report.sizeBytes ?? null;
      let pages = report.pageCount;
      if (!key) {
        const file = await this.render(report);
        key = report.projectId ? fileKey(report.orgId, report.projectId, 'report', report.id) : `org/${report.orgId}/reports/${report.id}`;
        await this.storage.put(key, file.body, CONTENT_TYPE[report.format]);
        size = file.body.length;
        pages = file.pages;
      }
      ready = await this.em.transactional(async (tx) => {
        const row = await tx.findOneOrFail(GeneratedReport, { id: reportId });
        Object.assign(row, { status: 'done', storageKey: key, sizeBytes: size, pageCount: pages, error: null, finishedAt: this.clock.now() });
        await this.delivery.notifyReady(tx, row);
        return row;
      });
    } catch (error) {
      await this.failed(report, error, final);
      throw error;
    }
    const failed = await this.delivery.sendExternal(ready);
    await this.delivery.scheduleOutcome(ready.scheduleId ?? null, {
      ok: failed.length === 0,
      message: failed.length > 0 ? `ارسال ناموفق به ${failed.join('، ')}؛ نشانی را بررسی کنید.` : null,
    });
  }

  private async failed(report: GeneratedReport, error: unknown, final: boolean): Promise<void> {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'خطای ناشناخته';
    await this.em.transactional(async (tx) => {
      const row = await tx.findOneOrFail(GeneratedReport, { id: report.id });
      Object.assign(row, { status: final ? 'failed' : 'queued', error: final ? `ساخت فایل پس از ۳ تلاش ناموفق بود: ${message}` : message });
      if (final && row.requestedByUserId) {
        await this.notifier.notify(tx, {
          code: 'NT-RPT-01',
          projectId: row.projectId ?? null,
          recipients: [row.requestedByUserId],
          subjectId: row.id,
          title: `ساخت گزارش «${row.templateName}» ناموفق بود.`,
          body: 'دوباره «ساخت» را بزنید یا با پشتیبانی تماس بگیرید.',
          link: '/reports',
        });
      }
    });
    if (final) await this.delivery.scheduleOutcome(report.scheduleId ?? null, { ok: false, message: `ساخت گزارش ناموفق بود: ${message}` });
  }

  private async render(report: GeneratedReport): Promise<{ body: Buffer; pages: number }> {
    const template = await this.library.template(report.templateId);
    const period = report.rangeId.startsWith('period:');
    const range: RangeOption = {
      id: report.rangeId,
      kind: period ? 'period' : 'last_week',
      label: report.rangeLabel,
      from: report.rangeFrom,
      to: report.rangeTo,
      closed: report.sourceKind === 'period_snapshot',
      periodId: period ? report.rangeId.slice('period:'.length) : null,
    };
    const content = await this.data.build({
      orgId: report.orgId,
      projectId: report.projectId ?? null,
      template,
      range,
      disabled: report.disabledSections,
      amounts: report.includesAmounts,
      projectIds: report.projectIds,
      now: this.clock.now(),
    });
    if (report.format === 'xlsx') return { body: Buffer.from(renderXls(content), 'utf8'), pages: content.sections.length };
    const photos = new Map<string, string>();
    for (const section of content.sections) {
      if (section['key'] !== 'photos' || !Array.isArray(section['items'])) continue;
      for (const item of section['items'] as { storageKey?: string }[]) {
        const body = item.storageKey ? await this.storage.get(item.storageKey) : null;
        // عکس مفقود ← جای‌نما (۱۲)
        if (body && item.storageKey) photos.set(item.storageKey, `data:image/jpeg;base64,${body.toString('base64')}`);
      }
    }
    const fontCss = reportFontCss();
    const { pdf, pages } = await this.renderer.render(renderHtml(content, { fontCss, photos }), pageTemplates(content, fontCss));
    return { body: pdf, pages };
  }
}
