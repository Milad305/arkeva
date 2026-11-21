import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { approvedQuantity, leafPercent, stepPercents } from '../../computation/index.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { type CurrentItem, PlanningService } from '../../planning/index.js';
import { ProjectPendingCounts, ProjectRules } from '../../projects/index.js';
import type { LeafForEntry } from '../domain/values.js';
import { FieldRecords, type ItemRecord, type ReportRecord } from './field-records.js';

// خواندن‌های field: زمینهٔ فرم ثبت دستی و اصلاح (approval-workflow.md ۸) و تبدیل آیتم‌ها به ورودی فرمول پیشرفت.

export function leafForEntry(item: CurrentItem): LeafForEntry {
  return {
    code: item.code,
    title: item.title,
    isLeaf: item.isLeaf,
    isMilestone: item.isMilestone,
    measurementMethod: item.measurementMethod,
    unit: item.unit,
    totalQuantity: item.totalQuantity === null ? null : Number(item.totalQuantity),
    steps: item.steps,
  };
}

/** آیتم‌ها ← ورودی فرمول پیشرفت (ترتیب «آخرین»: workDate سپس زمان ثبت گزارش). */
export function entriesOf(items: readonly ItemRecord[], reports: readonly ReportRecord[]) {
  const byId = new Map(reports.map((report) => [report.id, report]));
  return items.map((item) => {
    const report = byId.get(item.reportId);
    return {
      workDate: report?.workDate ?? '',
      recordedAt: report?.deviceRecordedAt.toISOString() ?? '',
      quantityToday: item.quantityToday ?? null,
      reportedPercent: item.reportedPercent ?? null,
      stepsProgress: item.stepsProgress ?? null,
    };
  });
}

@Injectable()
export class FieldReads {
  constructor(
    private readonly em: EntityManager,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
    private readonly records: FieldRecords,
  ) {}

  /** `GET /projects/:pid/wbs/:itemId/report-context` — آنچه فرم G10 و اصلاح لازم دارد. */
  async reportContext(projectId: string, wbsItemId: string) {
    await this.rules.of(projectId);
    const leaf = (await this.planning.currentItems(projectId)).find((entry) => entry.id === wbsItemId);
    if (!leaf) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
    const shape = leafForEntry(leaf);
    const approved = await this.approvedEntries(this.em, projectId, wbsItemId);
    const method =
      shape.measurementMethod === 'quantity' || shape.measurementMethod === 'percent' || shape.measurementMethod === 'steps' ? shape.measurementMethod : null;
    const steps = method === 'steps' ? stepPercents(approved) : null;
    return {
      wbsItemId,
      code: leaf.code,
      title: leaf.title,
      method: leaf.measurementMethod,
      unit: leaf.unit,
      totalQuantity: shape.totalQuantity,
      approvedPercent: method ? leafPercent({ method, totalQuantity: shape.totalQuantity, steps: shape.steps }, approved) : 0,
      approvedQuantity: method === 'quantity' ? approvedQuantity(approved) : null,
      steps: shape.steps
        ? shape.steps.map((step) => ({ key: step.key, title: step.title, weight: step.weight, approvedPercent: steps?.get(step.key) ?? 0 }))
        : null,
    };
  }

  /**
   * واقعیت‌های پیشرفت پروژه برای محاسبات (F10 ۵.۲؛ ۶): آیتم‌های تأییدشده به شکل ورودی فرمول، و آیتم‌های در انتظار فقط برای
   * `pendingPercent` و `pendingCount` (هرگز در شاخص).
   */
  async progressFacts(em: EntityManager, projectId: string) {
    const items = await this.records.items(em, { projectId, statuses: ['approved', 'submitted', 'stage1', 'stage2'] });
    const reports = await this.records.reports(em, { ids: [...new Set(items.map((item) => item.reportId))] });
    const entries = entriesOf(items, reports);
    const approved = [];
    const pending = [];
    for (const [index, item] of items.entries()) {
      const entry = { ...(entries[index] as ReturnType<typeof entriesOf>[number]), wbsItemId: item.wbsItemId };
      if (item.status === 'approved') approved.push({ ...entry, approvedAt: item.approvedAt?.toISOString() ?? null });
      else pending.push({ ...entry, computedPercent: item.computedPercent });
    }
    return { approved, pending };
  }

  /** تاریخ کار آیتم — `fromDate` بازمحاسبه پس از تأیید، برگشت یا جایگزینی (۵.۱). */
  async workDateOf(em: EntityManager, projectId: string, itemId: string): Promise<string | null> {
    const [item] = await this.records.items(em, { projectId, ids: [itemId] });
    if (!item) return null;
    const [report] = await this.records.reports(em, { ids: [item.reportId] });
    return report?.workDate ?? null;
  }

  /** آیتم‌های در انتظار بررسی (ارسال‌شده، مرحلهٔ ۱ و ۲) — شمارندهٔ سربرگ پروژه. */
  async pendingCount(projectId: string, em: EntityManager = this.em): Promise<number> {
    return (await this.records.items(em, { projectId, statuses: ['submitted', 'stage1', 'stage2'] })).length;
  }

  /** آیتم‌های تأییدشدهٔ یک برگ به شکل ورودی فرمول (همهٔ گزارش‌ها). */
  async approvedEntries(em: EntityManager, projectId: string, wbsItemId: string, exceptItemId?: string) {
    const items = (await this.records.items(em, { projectId, wbsItemIds: [wbsItemId], statuses: ['approved'] })).filter((item) => item.id !== exceptItemId);
    return entriesOf(items, await this.records.reports(em, { ids: [...new Set(items.map((item) => item.reportId))] }));
  }
}

@Injectable()
export class FieldPendingCounts extends ProjectPendingCounts {
  constructor(private readonly reads: FieldReads) {
    super();
  }

  pendingItems(projectId: string): Promise<number> {
    return this.reads.pendingCount(projectId);
  }
}
