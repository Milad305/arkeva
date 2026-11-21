import { Injectable } from '@nestjs/common';
import { type EntityManager, LockMode } from '@mikro-orm/postgresql';
import { newId } from '../../../platform/database/ids.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { toJalali } from '../../../platform/time/jalali.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { FieldPhoto, FieldReport, FieldReportItem, type ItemStatus, type Resolution } from '../domain/field.entities.js';
import type { ItemValues } from '../domain/values.js';

// دسترسی approvals به محتوای گزارش (F08 ← F09). field مالک محتواست؛ approvals فقط وضعیت و مقادیر محاسبه‌شده را از راه
// `transition` می‌نویسد (`03` ۲؛ ۰۱ ۴: «field محتوای آیتم را فقط در submitted و needs_revision می‌نویسد»).

export type ReportRecord = FieldReport;
export type ItemRecord = FieldReportItem;
export type PhotoRecord = FieldPhoto;

/** آنچه approvals روی آیتم می‌نویسد — هیچ مقدار گزارش‌شده‌ای در آن نیست (D08). */
export interface ItemPatch {
  readonly status?: ItemStatus;
  readonly currentStage?: 1 | 2 | null;
  readonly requiresStage2?: boolean;
  readonly autoApproved?: boolean;
  readonly flags?: string[];
  readonly computedPercent?: number;
  readonly lastApprovedPercent?: number;
  readonly deltaPercent?: number;
  readonly plannedPercentAtDate?: number;
  readonly approvedAt?: Date | null;
  readonly resolution?: Resolution | null;
}

export interface ItemFilter {
  readonly projectId?: string;
  readonly projectIds?: readonly string[];
  readonly reportIds?: readonly string[];
  readonly ids?: readonly string[];
  readonly wbsItemIds?: readonly string[];
  readonly statuses?: readonly ItemStatus[];
}

@Injectable()
export class FieldRecords {
  async report(em: EntityManager, projectId: string, reportId: string): Promise<ReportRecord> {
    const report = await em.findOne(FieldReport, { id: reportId, projectId });
    if (!report) throw new NotFoundError('FIELD_REPORT_NOT_FOUND');
    return report;
  }

  reports(
    em: EntityManager,
    filter: { readonly projectIds?: readonly string[]; readonly ids?: readonly string[]; readonly since?: Date | null },
  ): Promise<ReportRecord[]> {
    return em.find(
      FieldReport,
      {
        ...(filter.projectIds ? { projectId: { $in: [...filter.projectIds] } } : {}),
        ...(filter.ids ? { id: { $in: [...filter.ids] } } : {}),
        ...(filter.since ? { serverReceivedAt: { $gte: filter.since } } : {}),
      },
      { orderBy: { serverReceivedAt: 'desc' } },
    );
  }

  items(em: EntityManager, filter: ItemFilter): Promise<ItemRecord[]> {
    return em.find(
      FieldReportItem,
      {
        ...(filter.projectId ? { projectId: filter.projectId } : {}),
        ...(filter.projectIds ? { projectId: { $in: [...filter.projectIds] } } : {}),
        ...(filter.reportIds ? { reportId: { $in: [...filter.reportIds] } } : {}),
        ...(filter.ids ? { id: { $in: [...filter.ids] } } : {}),
        ...(filter.wbsItemIds ? { wbsItemId: { $in: [...filter.wbsItemIds] } } : {}),
        ...(filter.statuses ? { status: { $in: [...filter.statuses] } } : {}),
      },
      { orderBy: { createdAt: 'asc' } },
    );
  }

  /** جستجوی W43: گزارش با شمارهٔ نرمال‌شده یا نویسندهٔ یافته‌شده؛ تازه‌تر اول. */
  async searchReports(em: EntityManager, projectIds: readonly string[], pattern: string, authorIds: readonly string[], limit: number) {
    if (projectIds.length === 0) return [];
    return em.transactional((tx) =>
      tx.getConnection().execute<{ id: string; project_id: string; report_no: string; author_user_id: string; work_date: string }[]>(
        `select id, project_id, report_no, author_user_id, to_char(work_date, 'YYYY-MM-DD') as work_date from field_report
            where project_id in (?) and (search_norm(report_no) like ?${authorIds.length > 0 ? ' or author_user_id in (?)' : ''})
            order by server_received_at desc limit ?`,
        authorIds.length > 0 ? [[...projectIds], pattern, [...authorIds], limit] : [[...projectIds], pattern, limit],
        'all',
        tx.getTransactionContext(),
      ),
    );
  }

  photos(em: EntityManager, reportIds: readonly string[]): Promise<PhotoRecord[]> {
    return reportIds.length === 0 ? Promise.resolve([]) : em.find(FieldPhoto, { reportId: { $in: [...reportIds] } }, { orderBy: { takenAt: 'asc' } });
  }

  async lockItem(tx: EntityManager, projectId: string, itemId: string): Promise<ItemRecord> {
    const item = await tx.findOne(FieldReportItem, { id: itemId, projectId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!item) throw new NotFoundError('FIELD_ITEM_NOT_FOUND');
    return item;
  }

  transition(item: ItemRecord, patch: ItemPatch): void {
    Object.assign(item, patch);
  }

  async markUnsuitable(tx: EntityManager, reportId: string, photoIds: readonly string[]): Promise<void> {
    if (photoIds.length === 0) return;
    const photos = await tx.find(FieldPhoto, { reportId, id: { $in: [...photoIds] } });
    for (const photo of photos) photo.markedUnsuitable = true;
  }

  /** FR-<سال شمسی>-<چهار رقم> (C05)؛ شمارندهٔ هر سازمان و سال، درون تراکنش دریافت. */
  async nextReportNo(tx: EntityManager, orgId: string, at: Date): Promise<string> {
    const year = toJalali(tehranClock(at).date).year;
    const rows = await tx.getConnection().execute<{ last_value: number }[]>(
      `insert into field_report_counter (org_id, year, last_value) values (?, ?, 1)
         on conflict (org_id, year) do update set last_value = field_report_counter.last_value + 1 returning last_value`,
      [orgId, year],
      'all',
      tx.getTransactionContext(),
    );
    return `FR-${year}-${String(rows[0]?.last_value ?? 1).padStart(4, '0')}`;
  }

  /**
   * اصلاح بعد از تأیید (approval-workflow.md ۴.۷؛ D08): گزارش تازه با منبع `correction` و یک آیتم با همان workDate و
   * `supersedesItemId`. وضعیت را approvals می‌گذارد.
   */
  async createCorrection(
    tx: EntityManager,
    input: {
      readonly original: ItemRecord;
      readonly report: ReportRecord;
      readonly values: ItemValues;
      readonly authorUserId: string;
      readonly note: string;
      readonly now: Date;
    },
  ): Promise<{ report: ReportRecord; item: ItemRecord }> {
    const report = tx.create(FieldReport, {
      id: newId(),
      orgId: input.report.orgId,
      projectId: input.report.projectId,
      source: 'correction',
      authorUserId: input.authorUserId,
      workDate: input.report.workDate,
      reportNo: await this.nextReportNo(tx, input.report.orgId, input.now),
      deviceRecordedAt: input.now,
      serverReceivedAt: input.now,
      appVersion: null,
      gpsLat: null,
      gpsLng: null,
      gpsAccuracyM: null,
      distanceFromSiteM: null,
      weather: null,
      temperatureC: null,
      note: input.note,
      attestedAt: null,
      flags: [],
    });
    await tx.flush();
    const item = tx.create(FieldReportItem, {
      id: newId(),
      orgId: input.report.orgId,
      projectId: input.report.projectId,
      reportId: report.id,
      wbsItemId: input.original.wbsItemId,
      ...input.values,
      status: 'submitted',
      currentStage: null,
      flags: [],
      resolution: null,
      supersedesItemId: input.original.id,
      crewCount: input.original.crewCount ?? null,
      note: input.note,
      approvedAt: null,
    });
    await tx.flush();
    return { report, item };
  }
}
