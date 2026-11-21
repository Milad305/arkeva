import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { formatJalali } from '../../../platform/time/jalali.js';
import { ProgressReads } from '../../computation/reads.js';
import { FieldReads } from '../../field/index.js';
import { PlanningService, ScheduleProposals } from '../../planning/index.js';
import { ProjectBasicsCatalog, ProjectRules } from '../../projects/index.js';
import { ExternalIdMap, MspLink, ProgressExportItem } from '../domain/msp.entities.js';
import { patchProgress, replaceCalendar } from '../domain/xml-export.js';
import { MspAccess, mspConflict } from './msp-access.js';

// جهت «از پروژه‌یار به MSP» (msp-integration.md ۵.۱، ۷.۴؛ AC-MS-09). ردیف پیشرفت با تأیید یا برگشت آیتم کارگاه ساخته یا به‌روز
// می‌شود؛ درصد زنده از محاسبات (F10). خروجی = آخرین XML بارگذاری‌شده با درصد و تاریخ‌های واقعی هر UID؛ فایل ورودی دست‌نخورده.

const FIELD_LABEL = { plannedStart: 'شروع برنامه‌ای', plannedFinish: 'پایان برنامه‌ای' } as const;
const jalali = (iso: string | null) => (iso ? toFaDigits(formatJalali(iso)) : '—');

@Injectable()
@OnEvents({ name: 'msp.progress-export', events: ['FieldReportItemApproved', 'FieldReportItemRevoked', 'FieldReportItemSuperseded'] })
export class ProgressExportConsumer implements EventConsumer {
  constructor(
    private readonly clock: Clock,
    private readonly field: FieldReads,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const wbsItemId = event.payload['wbsItemId'];
    if (!event.projectId || typeof wbsItemId !== 'string') return;
    if (!(await tx.findOne(MspLink, { projectId: event.projectId }))) return;
    const dates = (await this.field.approvedEntries(tx, event.projectId, wbsItemId)).map((entry) => entry.workDate).sort();
    const existing = await tx.findOne(ProgressExportItem, { projectId: event.projectId, wbsItemId });
    const now = this.clock.now();
    if (dates.length === 0) {
      if (existing?.status === 'pending') Object.assign(existing, { status: 'withdrawn', updatedAt: now });
      return;
    }
    const fields = { asOfDate: dates.at(-1) as string, actualStart: dates[0] as string, status: 'pending' as const, updatedAt: now };
    if (existing) Object.assign(existing, fields);
    else
      tx.create(ProgressExportItem, {
        id: newId(),
        orgId: event.orgId,
        projectId: event.projectId,
        wbsItemId,
        percent: null,
        actualFinish: null,
        exportedAt: null,
        ...fields,
      });
  }
}

@Injectable()
export class ProgressExport {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly storage: ObjectStorage,
    private readonly access: MspAccess,
    private readonly planning: PlanningService,
    private readonly proposals: ScheduleProposals,
    private readonly progress: ProgressReads,
    private readonly rules: ProjectRules,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  /** وضعیت اتصال برای بخش «یکپارچه‌سازی» گزارش مدیریتی (F18 ۴). */
  async status(projectId: string) {
    const link = await this.em.findOne(MspLink, { projectId });
    return { linked: !!link, lastSyncAt: link?.lastSyncAt?.toISOString() ?? null, pending: link ? await this.pending(projectId) : null };
  }

  /** شمار منتظر ارسال برای W36 و AL-INT-02. */
  async pending(projectId: string): Promise<{ progress: number; proposals: number; since: string | null }> {
    const rows = await this.em.find(ProgressExportItem, { projectId, status: 'pending' }, { orderBy: { asOfDate: 'asc' } });
    return { progress: rows.length, proposals: await this.proposals.pendingCount(projectId), since: rows[0]?.asOfDate ?? null };
  }

  private async rows(projectId: string) {
    const [pending, current, ids, live] = await Promise.all([
      this.em.find(ProgressExportItem, { projectId, status: 'pending' }, { orderBy: { asOfDate: 'asc' } }),
      this.planning.currentContent(projectId),
      this.em.find(ExternalIdMap, { system: 'msp', projectId, entityType: 'wbs_item' }),
      this.progress.items(projectId),
    ]);
    const byId = new Map(current.wbs.map((node) => [node.id, node]));
    const uidOf = new Map(ids.map((row) => [row.entityId, Number(row.externalId)]));
    return pending.flatMap((row) => {
      const node = byId.get(row.wbsItemId);
      if (!node) return [];
      const percent = live.get(row.wbsItemId)?.actualPercent ?? 0;
      return [
        {
          id: row.id,
          wbsItemId: row.wbsItemId,
          uid: uidOf.get(row.wbsItemId) ?? null,
          code: node.code,
          title: node.title,
          percent,
          asOfDate: row.asOfDate,
          actualStart: row.actualStart ?? null,
          actualFinish: percent >= 100 ? row.asOfDate : null,
          withoutUid: !uidOf.has(row.wbsItemId),
        },
      ];
    });
  }

  /** `GET /projects/:pid/msp/export-preview` */
  async preview(projectId: string) {
    this.access.require(projectId, 'msp.export');
    const [rows, proposals, current, link, [card]] = await Promise.all([
      this.rows(projectId),
      this.proposals.open(projectId),
      this.planning.currentContent(projectId),
      this.em.findOne(MspLink, { projectId }),
      this.catalog.cards([projectId]),
    ]);
    const byId = new Map(current.wbs.map((node) => [node.id, node]));
    return {
      projectId,
      fileName: `${card?.code ?? 'project'}_progress.xml`,
      rows: rows.map(({ wbsItemId: _wbsItemId, ...row }) => row),
      proposals: [
        ...proposals.flatMap((proposal) => {
          const node = byId.get(proposal.wbsItemId);
          return node
            ? [
                {
                  id: proposal.id,
                  code: node.code,
                  title: node.title,
                  text: `${FIELD_LABEL[proposal.field]} از ${jalali(proposal.baseValue)} به ${jalali(proposal.proposedValue)}؛ در MS Project اعمال و دوباره همگام‌سازی کنید.`,
                },
              ]
            : [];
        }),
        ...rows
          .filter((row) => row.withoutUid)
          .map((row) => ({
            id: row.id,
            code: row.code,
            title: row.title,
            text: 'این آیتم در پروژه‌یار ساخته شده و در فایل MSP UID ندارد؛ آن را دستی در MSP اضافه کنید.',
          })),
      ],
      sinceLabel: jalali(rows[0]?.asOfDate ?? null),
      calendarReplaceable: !!link?.lastStorageKey,
    };
  }

  /** `POST /projects/:pid/msp/export {replaceCalendar}` (AC-MS-09). */
  async export(projectId: string, input: { readonly replaceCalendar: boolean }) {
    const { actor } = this.access.actor();
    this.access.require(projectId, 'msp.export');
    const link = await this.em.findOne(MspLink, { projectId });
    if (!link?.lastStorageKey) throw mspConflict('این پروژه هنوز فایل MSP ندارد؛ اول ساختار را از MSP وارد یا همگام‌سازی کنید.');
    const source = await this.storage.get(link.lastStorageKey);
    if (!source) throw mspConflict('آخرین فایل MSP این پروژه در ذخیره‌ساز پیدا نشد؛ فایل را دوباره همگام‌سازی کنید.');
    const rows = (await this.rows(projectId)).filter((row) => !row.withoutUid);
    const patched = patchProgress(source.toString('utf8'), new Map(rows.map((row) => [row.uid as number, row])));
    let xml = patched.xml;
    if (input.replaceCalendar) {
      const calendar = await this.rules.calendarDetail(projectId);
      if (calendar) xml = replaceCalendar(xml, { name: 'تقویم پروژه‌یار', ...calendar });
    }
    const [card] = await this.catalog.cards([projectId]);
    const fileName = `${card?.code ?? 'project'}_progress.xml`;
    // نسخهٔ ساخته‌شده نگه داشته می‌شود (W41: «پشتیبان گرفته می‌شود»)
    const backupKey = fileKey(actor.orgId, projectId, 'export', newId());
    await this.storage.put(backupKey, Buffer.from(xml, 'utf8'), 'application/xml');
    await this.em.transactional(async (tx) => {
      const now = this.clock.now();
      const exported = await tx.find(ProgressExportItem, { id: { $in: rows.map((row) => row.id) } });
      const byId = new Map(rows.map((row) => [row.id, row]));
      for (const item of exported) {
        const row = byId.get(item.id);
        Object.assign(item, { status: 'exported', exportedAt: now, percent: row?.percent ?? null, actualFinish: row?.actualFinish ?? null, updatedAt: now });
      }
      const proposals = await this.proposals.markExported(tx, projectId);
      await this.outbox.emit(tx, { type: 'MspProgressExported', projectId, payload: { v: 1, progress: exported.length, proposals } });
      this.audit.record(tx, {
        action: 'msp.progress_exported',
        entityType: 'MspLink',
        entityId: projectId,
        projectId,
        after: { progress: exported.length, proposals, replaceCalendar: input.replaceCalendar, backupKey },
      });
    });
    return { fileName, xml, exportedCount: patched.updated };
  }
}
