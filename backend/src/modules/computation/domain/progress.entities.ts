import { defineEntity, p } from '@mikro-orm/postgresql';

// جدول‌های مشتق پیشرفت و شاخص‌ها (`02` ۷؛ progress-calculation.md ۴). فقط computation می‌نویسد و هر زمان از واقعیت‌ها
// بازسازی‌پذیرند (D06، D07). مبالغ رشتهٔ ریال (bigint؛ C02)، درصدها عدد با چهار رقم ذخیره (C04)، نسبت‌ها دقت کامل.

export const COMPUTE_STATES = ['fresh', 'updating', 'failed'] as const;
export type ComputeState = (typeof COMPUTE_STATES)[number];
export const PROGRESS_STATUSES = ['not_started', 'on_track', 'ahead', 'warning', 'critical', 'completed'] as const;
export const COMPUTE_RUN_STATUSES = ['queued', 'running', 'done', 'failed'] as const;

export interface LeafCounts {
  readonly total: number;
  readonly not_started: number;
  readonly on_track: number;
  readonly ahead: number;
  readonly warning: number;
  readonly critical: number;
  readonly completed: number;
}

export interface OutOfReference {
  readonly count: number;
  readonly currentBac: string;
  readonly earnedValue: string;
}

const WbsItemProgressSchema = defineEntity({
  name: 'WbsItemProgress',
  tableName: 'wbs_item_progress',
  properties: {
    wbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    dataDate: p.date(),
    plannedPercent: p.decimal('number'),
    actualPercent: p.decimal('number'),
    actualQuantity: p.decimal('number').nullable(),
    pendingPercent: p.decimal('number').nullable(),
    deviation: p.decimal('number'),
    status: p.enum(PROGRESS_STATUSES),
    bac: p.bigint('string'),
    pv: p.bigint('string'),
    ev: p.bigint('string'),
    forecastFinish: p.date().nullable(),
    lastApprovedAt: p.datetime().nullable(),
    inReference: p.boolean(),
    weightInProject: p.decimal('number'),
    overTotalQuantity: p.boolean().default(false),
    computedAt: p.datetime(),
  },
});
export class WbsItemProgress extends WbsItemProgressSchema.class {}
WbsItemProgressSchema.setClass(WbsItemProgress);

const ProjectProgressSchema = defineEntity({
  name: 'ProjectProgress',
  tableName: 'project_progress',
  properties: {
    projectId: p.uuid().primary(),
    orgId: p.uuid(),
    dataDate: p.date().nullable(),
    plannedPercent: p.decimal('number').default(0),
    actualPercent: p.decimal('number').default(0),
    financialPercent: p.decimal('number').default(0),
    bac: p.bigint('string').default('0'),
    pv: p.bigint('string').default('0'),
    ev: p.bigint('string').default('0'),
    ac: p.bigint('string').default('0'),
    cv: p.bigint('string').default('0'),
    sv: p.bigint('string').default('0'),
    eac: p.bigint('string').default('0'),
    vac: p.bigint('string').default('0'),
    cpi: p.double().nullable(),
    spi: p.double().nullable(),
    tcpi: p.double().nullable(),
    eacLowConfidence: p.boolean().default(false),
    forecastFinish: p.date().nullable(),
    delayDays: p.integer().nullable(),
    costIndicesDate: p.date().nullable(),
    unallocatedBudget: p.bigint('string').default('0'),
    leafCounts: p.json<LeafCounts>().nullable(),
    outOfReference: p.json<OutOfReference>().nullable(),
    computeState: p.enum(COMPUTE_STATES).default('updating'),
    pendingCount: p.integer().default(0),
    lastError: p.text().nullable(),
    computedAt: p.datetime().nullable(),
  },
});
export class ProjectProgress extends ProjectProgressSchema.class {}
ProjectProgressSchema.setClass(ProjectProgress);

const CbsItemProgressSchema = defineEntity({
  name: 'CbsItemProgress',
  tableName: 'cbs_item_progress',
  properties: {
    cbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    dataDate: p.date(),
    costIndicesDate: p.date(),
    ac: p.bigint('string'),
    consumedPercent: p.double().nullable(),
    ev: p.bigint('string'),
    cpi: p.double().nullable(),
    eac: p.bigint('string'),
    eacVariancePercent: p.double().nullable(),
    eacLowConfidence: p.boolean(),
    consumedQuantity: p.decimal('number').nullable(),
    earnedQuantity: p.decimal('number').nullable(),
    excessQuantity: p.decimal('number').nullable(),
    computedAt: p.datetime(),
  },
});
export class CbsItemProgress extends CbsItemProgressSchema.class {}
CbsItemProgressSchema.setClass(CbsItemProgress);

const WbsItemDailySnapshotSchema = defineEntity({
  name: 'WbsItemDailySnapshot',
  tableName: 'wbs_item_daily_snapshot',
  properties: {
    wbsItemId: p.uuid().primary(),
    date: p.date().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    plannedPercent: p.decimal('number'),
    actualPercent: p.decimal('number'),
    actualQuantity: p.decimal('number').nullable(),
    deviation: p.decimal('number'),
    status: p.enum(PROGRESS_STATUSES),
    bac: p.bigint('string'),
    pv: p.bigint('string'),
    ev: p.bigint('string'),
    inReference: p.boolean(),
  },
});
export class WbsItemDailySnapshot extends WbsItemDailySnapshotSchema.class {}
WbsItemDailySnapshotSchema.setClass(WbsItemDailySnapshot);

const ProjectDailySnapshotSchema = defineEntity({
  name: 'ProjectDailySnapshot',
  tableName: 'project_daily_snapshot',
  properties: {
    projectId: p.uuid().primary(),
    date: p.date().primary(),
    orgId: p.uuid(),
    plannedPercent: p.decimal('number'),
    actualPercent: p.decimal('number'),
    financialPercent: p.decimal('number'),
    bac: p.bigint('string'),
    pv: p.bigint('string'),
    ev: p.bigint('string'),
    ac: p.bigint('string'),
    eac: p.bigint('string'),
    cpi: p.double().nullable(),
    spi: p.double().nullable(),
    costIndicesDate: p.date(),
  },
});
export class ProjectDailySnapshot extends ProjectDailySnapshotSchema.class {}
ProjectDailySnapshotSchema.setClass(ProjectDailySnapshot);

/** اجرای بازمحاسبه (progress-calculation.md ۴.۲) — عملیاتی؛ رویدادهای نزدیک در یک ردیف `queued` تجمیع می‌شوند. */
const ComputeRunSchema = defineEntity({
  name: 'ComputeRun',
  tableName: 'compute_run',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    fromDate: p.date().nullable(),
    triggerEventIds: p.json<string[]>(),
    scope: p.enum(['item', 'project'] as const).default('project'),
    status: p.enum(COMPUTE_RUN_STATUSES),
    startedAt: p.datetime().nullable(),
    finishedAt: p.datetime().nullable(),
    error: p.text().nullable(),
    createdAt: p.datetime(),
  },
});
export class ComputeRun extends ComputeRunSchema.class {}
ComputeRunSchema.setClass(ComputeRun);

export const COMPUTATION_ENTITY_LIST = [WbsItemProgress, ProjectProgress, CbsItemProgress, WbsItemDailySnapshot, ProjectDailySnapshot, ComputeRun];
