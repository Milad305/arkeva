import { defineEntity, p } from '@mikro-orm/postgresql';

// دوره‌های گزارش و عکس دوره (`02` ۸؛ progress-calculation.md ۴.۳، ۵.۸؛ D06). مالک: computation (01 ۴).

export const PERIOD_STATUSES = ['open', 'closed'] as const;

export interface ClosePreview {
  readonly pendingItems: number;
  readonly draftCostEntries: number;
  readonly costsCompleteThrough: string | null;
  /** تاریخ کامل بودن هزینه‌ها به پایان دوره رسیده؟ هشدار، نه مانع. */
  readonly costsComplete: boolean;
}

const ReportingPeriodSchema = defineEntity({
  name: 'ReportingPeriod',
  tableName: 'reporting_period',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    startDate: p.date(),
    endDate: p.date(),
    status: p.enum(PERIOD_STATUSES).default('open'),
    closedByUserId: p.uuid().nullable(),
    closedAt: p.datetime().nullable(),
    closedWithPendingCount: p.integer().nullable(),
    closePreview: p.json<ClosePreview>().nullable(),
    createdAt: p.datetime(),
  },
});
export class ReportingPeriod extends ReportingPeriodSchema.class {}
ReportingPeriodSchema.setClass(ReportingPeriod);

/** کپی تغییرناپذیر اعداد پایان دوره (تصمیم 1405/08/23: snapshot روزانهٔ تاریخ پایان دوره). */
const PeriodSnapshotSchema = defineEntity({
  name: 'PeriodSnapshot',
  tableName: 'period_snapshot',
  properties: {
    periodId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    date: p.date(),
    project: p.json<Record<string, unknown>>(),
    items: p.json<Record<string, unknown>[]>(),
    createdAt: p.datetime(),
  },
});
export class PeriodSnapshot extends PeriodSnapshotSchema.class {}
PeriodSnapshotSchema.setClass(PeriodSnapshot);
