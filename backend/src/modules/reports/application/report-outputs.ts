import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { DomainError, ForbiddenError, NotFoundError } from '../../../platform/http/errors.js';
import { ObjectStorage } from '../../../platform/storage/object-storage.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectBasicsCatalog, ProjectRules } from '../../projects/index.js';
import { type Format, hasAmounts, type SectionKey, type TemplateDef } from '../domain/catalog.js';
import { fa } from '../domain/format.js';
import { GeneratedReport } from '../domain/report.entities.js';
import { ReportAccess } from './report-access.js';
import { CONTENT_TYPE, ReportDelivery } from './report-delivery.js';
import { ReportGeneration } from './report-generation.js';
import { ReportLibrary } from './report-library.js';
import { ReportRanges } from './report-ranges.js';
import { type RecipientRef, ReportRecipients } from './report-recipients.js';

// خروجی‌ها از سمت درخواست (W25؛ management-reports.md ۷.۳، ۷.۵، ۱۱): تولید دستی، «ارسال به گیرندگان» (دو نسخه برای گیرندگان
// مختلط؛ AC-MR-03، AC-MR-08)، فهرست، حذف و دانلود.

const invalid = (reason: string) => new DomainError('REPORT_INVALID', 422, { reason });
const sizeLabel = (bytes: number | null) =>
  bytes === null
    ? null
    : bytes < 1_048_576
      ? `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`
      : `${fa((bytes / 1_048_576).toFixed(1)).replace('.', '٫')} مگابایت`;

@Injectable()
export class ReportOutputs {
  constructor(
    private readonly em: EntityManager,
    private readonly audit: Audit,
    private readonly storage: ObjectStorage,
    private readonly access: ReportAccess,
    private readonly library: ReportLibrary,
    private readonly ranges: ReportRanges,
    private readonly generation: ReportGeneration,
    private readonly recipients: ReportRecipients,
    private readonly delivery: ReportDelivery,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly rules: ProjectRules,
  ) {}

  async dtos(rows: readonly GeneratedReport[]) {
    const people = await this.identity.personRefs(rows.flatMap((row) => (row.requestedByUserId ? [row.requestedByUserId] : [])));
    return rows.map((row) => ({
      id: row.id,
      templateId: row.templateId,
      templateName: row.templateName,
      scopeLabel: row.scopeLabel,
      rangeLabel: row.rangeLabel,
      format: row.format,
      sourceKind: row.sourceKind,
      includesAmounts: row.includesAmounts,
      watermark: row.watermark,
      status: row.status,
      error: row.error ?? null,
      requestedByName: row.requestedByUserId ? (people.get(row.requestedByUserId)?.fullName ?? '') : 'زمان‌بندی',
      createdAt: row.createdAt.toISOString(),
      pageCount: row.pageCount,
      sizeLabel: row.status === 'done' ? sizeLabel(row.sizeBytes ?? null) : null,
    }));
  }

  async scopeLabel(projectId: string | null): Promise<string> {
    return projectId ? ((await this.catalog.cards([projectId]))[0]?.name ?? '') : 'همهٔ پروژه‌های فعال';
  }

  async projectIds(projectId: string | null): Promise<string[]> {
    return projectId ? [projectId] : this.access.projects('reports.view');
  }

  private sections(template: TemplateDef, disabled: readonly SectionKey[]) {
    const sections = template.sections.filter((key) => !disabled.includes(key));
    if (sections.length === 0) throw invalid('دست‌کم یک بخش روشن باشد.');
    return sections;
  }

  /** `POST /projects/:scope/reports {templateId, rangeId, format}` */
  async generate(
    rawScope: string,
    input: { readonly templateId: string; readonly rangeId: string; readonly format: Format; readonly disabledSections?: readonly SectionKey[] },
  ) {
    const { actor } = this.access.actor();
    const template = await this.library.template(input.templateId);
    const projectId = this.library.scopeFor(template, rawScope, 'reports.generate');
    if (!template.formats.includes(input.format)) throw invalid(`این قالب فقط ${template.formats.map((format) => format.toUpperCase()).join(' و ')} می‌دهد.`);
    const disabled = [...new Set(input.disabledSections ?? [])];
    const sections = this.sections(template, disabled);
    const range = await this.ranges.resolve(projectId, input.rangeId);
    const spec = {
      orgId: actor.orgId,
      projectId,
      template,
      range,
      format: input.format,
      disabled,
      amounts: hasAmounts(sections, template.audience) && this.access.amounts(projectId),
      projectIds: await this.projectIds(projectId),
      scopeLabel: await this.scopeLabel(projectId),
      requestedByUserId: actor.userId,
      scheduleId: null,
      deliveries: { users: [], emails: [] },
    };
    const row = await this.em.transactional((tx) => this.generation.enqueue(tx, spec));
    return (await this.dtos([row]))[0];
  }

  /** `POST /projects/:scope/reports/send` — گیرندهٔ بیرونی فقط با `reports.send_external` (AC-MR-08). */
  async send(rawScope: string, input: { readonly templateId: string; readonly rangeId: string; readonly recipients: readonly RecipientRef[] }) {
    const { actor } = this.access.actor();
    const template = await this.library.template(input.templateId);
    const projectId = this.library.scopeFor(template, rawScope, 'reports.generate');
    const recipients = this.recipients.validate(input.recipients);
    if (recipients.some((entry) => entry.kind === 'email') && !this.access.canSendExternal(projectId)) {
      throw new ForbiddenError('PERMISSION_DENIED', {
        requiredPermission: 'reports.send_external',
        reason: 'ارسال به نشانی بیرون از سازمان دسترسی «ارسال به گیرندهٔ بیرونی» می‌خواهد. گیرندهٔ بیرونی را بردارید یا از مدیر پروژه بخواهید بفرستد.',
      });
    }
    const range = await this.ranges.resolve(projectId, input.rangeId);
    const versions = await this.recipients.versions({ orgId: actor.orgId, projectId, template, senderUserId: actor.userId, recipients });
    if (versions.length === 0) throw invalid('هیچ گیرندهٔ فعالی پیدا نشد؛ گیرندگان را بررسی کنید.');
    const format: Format = template.formats.includes('pdf') ? 'pdf' : (template.formats[0] as Format);
    const base = {
      orgId: actor.orgId,
      projectId,
      template,
      range,
      format,
      disabled: [] as SectionKey[],
      projectIds: await this.projectIds(projectId),
      scopeLabel: await this.scopeLabel(projectId),
      requestedByUserId: actor.userId,
      scheduleId: null,
    };
    await this.em.transactional(async (tx) => {
      for (const version of versions) await this.generation.enqueue(tx, { ...base, amounts: version.amounts, deliveries: version });
    });
    const internal = versions.reduce((sum, version) => sum + version.users.length, 0);
    const external = versions.reduce((sum, version) => sum + version.emails.length, 0);
    const split = versions.length > 1;
    return {
      internalCount: internal,
      externalCount: external,
      splitAmounts: split,
      message: split
        ? `گزارش برای ${fa(internal + external)} گیرنده فرستاده می‌شود؛ چون همه دسترسی مبالغ ندارند، دو نسخه با و بدون مبلغ ساخته شد.`
        : `گزارش برای ${fa(internal + external)} گیرنده فرستاده می‌شود.`,
    };
  }

  /** `GET /reports` — خروجی‌های پروژه‌های دیدنی و گزارش‌های سازمانی خود کاربر (مدیر سازمان: همه). */
  async list() {
    const { actor, access } = this.access.actor();
    const projectIds = await this.access.projects('reports.view');
    const rows = await this.em.find(
      GeneratedReport,
      { $or: [{ projectId: { $in: projectIds } }, access.isOrgAdmin ? { projectId: null } : { projectId: null, requestedByUserId: actor.userId }] },
      { orderBy: { createdAt: 'desc' }, limit: 50 },
    );
    return this.dtos(rows);
  }

  private async own(id: string, code: 'reports.view' | 'reports.generate'): Promise<GeneratedReport> {
    const { actor, access } = this.access.actor();
    const row = await this.em.findOne(GeneratedReport, { id });
    const visible = row && (row.projectId ? this.access.has(row.projectId, 'reports.view') : access.isOrgAdmin || row.requestedByUserId === actor.userId);
    if (!row || !visible) throw new NotFoundError('REPORT_NOT_FOUND');
    if (row.projectId && !this.access.has(row.projectId, code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
    return row;
  }

  /** `DELETE /reports/:id` — فقط مدیر پروژه یا سازنده (۷.۵). */
  async remove(id: string) {
    const { actor, access } = this.access.actor();
    const row = await this.own(id, 'reports.generate');
    const manager = row.projectId ? (await this.rules.of(row.projectId)).managerUserId : null;
    if (!access.isOrgAdmin && row.requestedByUserId !== actor.userId && manager !== actor.userId) {
      throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'reports.generate', reason: 'فقط سازندهٔ خروجی یا مدیر پروژه آن را حذف می‌کند.' });
    }
    const key = row.storageKey ?? null;
    await this.em.transactional(async (tx) => {
      tx.remove(await tx.findOneOrFail(GeneratedReport, { id }));
      this.audit.record(tx, {
        action: 'report.deleted',
        entityType: 'GeneratedReport',
        entityId: id,
        projectId: row.projectId ?? null,
        before: { templateId: row.templateId },
      });
    });
    // فایل مشترک گزارش دورهٔ بسته تا آخرین ردیف می‌ماند
    if (key && (await this.em.count(GeneratedReport, { storageKey: key })) === 0) await this.storage.delete(key);
    return { id };
  }

  /** `GET /reports/:id/download` — لینک امضاشدهٔ کوتاه‌مدت. */
  async download(id: string) {
    const row = await this.own(id, 'reports.view');
    if (row.status !== 'done' || !row.storageKey) throw new DomainError('REPORT_INVALID', 409, { reason: 'فایل این خروجی هنوز آماده نیست.' });
    const fileName = this.delivery.fileName(row);
    return { url: await this.storage.signedUrl(row.storageKey, { ttlSec: 300, fileName, contentType: CONTENT_TYPE[row.format] }), fileName };
  }
}
