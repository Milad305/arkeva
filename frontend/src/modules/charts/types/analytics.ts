import type { AlertSeverity, WbsProgressStatus } from '@/config/constants';
import type { EntityId, IsoDate, Percent, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { PersonRef } from '@/modules/projects/types';
import type { ChartMeta } from './index';

// F17 — W21 تا W24 (charts.md ۶.۳–۶.۶). همهٔ اعداد از سرور (F10، F11)؛ React فقط رسم
// می‌کند (AC-CH-09). مبالغ بدون `cbs.view_amounts` تهی‌اند.

/** میانبرهای بازه (charts.md ۷؛ تصمیم 1405/08/15: بازه فقط سری‌های زمانی را محدود می‌کند). */
export type ChartRangePreset = 'month' | 'quarter' | 'all' | 'closed_period';

export interface ChartRangeDto {
  preset: ChartRangePreset;
  from: IsoDate;
  to: IsoDate;
  label: string;
  closedPeriod: boolean;
}

export interface ChartQuery {
  projectId: EntityId;
  preset: ChartRangePreset;
  canViewAmounts: boolean;
}

// ── W21 ──

export interface CurvePoint {
  date: IsoDate;
  /** برنامهٔ اولیه از `PlanVersionCurve(baseline)` — پس از بازنگری تغییر نمی‌کند (AC-CH-03). */
  baseline: Percent | null;
  /** برنامهٔ بازنگری‌شده (مرجع PV) — فقط اگر با مبنا فرق دارد. */
  revised: Percent | null;
  actual: Percent | null;
  forecast: Percent | null;
}

export interface EvmMonthDto {
  date: IsoDate;
  pv: RialAmount | null;
  ev: RialAmount | null;
  /** فقط تا `t_c`. */
  ac: RialAmount | null;
}

export interface GanttMilestoneDto {
  date: IsoDate;
  title: string;
  late: boolean;
}

export interface GanttRowDto {
  id: EntityId;
  code: string;
  title: string;
  depth: number;
  plannedStart: IsoDate;
  plannedFinish: IsoDate;
  /** از اولین و آخرین آیتم تأییدشده با پیشرفت (charts.md ۶.۳). */
  actualStart: IsoDate | null;
  actualEnd: IsoDate | null;
  actualPercent: Percent;
  status: WbsProgressStatus;
  milestones: GanttMilestoneDto[];
}

export interface ProgressChartsDto extends ChartMeta {
  range: ChartRangeDto;
  hasRevision: boolean;
  revisionLabel: string | null;
  curve: CurvePoint[];
  kpis: {
    actualPercent: Percent;
    plannedPercent: Percent;
    deviation: Percent;
    forecastFinish: IsoDate | null;
    delayWorkingDays: number | null;
  };
  evm: {
    months: EvmMonthDto[];
    cv: RialAmount | null;
    sv: RialAmount | null;
    cpi: number | null;
    spi: number | null;
    eac: RialAmount | null;
    pv: RialAmount | null;
    ev: RialAmount | null;
    ac: RialAmount | null;
  };
  gantt: { start: IsoDate; finish: IsoDate; rows: GanttRowDto[] };
}

// ── W22 ──

export interface CostChartsDto extends ChartMeta {
  range: ChartRangeDto;
  kpis: {
    bac: RialAmount;
    ac: RialAmount;
    acPercent: Percent;
    ev: RialAmount;
    eac: RialAmount;
    eacVariancePercent: Percent;
    cpi: number | null;
    /** `(BAC − EV) ÷ (BAC − AC)`؛ AC > BAC ← تعریف‌نشده (evm.md ۷). */
    tcpi: number | null;
  };
  byType: Array<{ type: CostType; label: string; budget: RialAmount; percent: Percent }>;
  byGroup: Array<{ id: EntityId; code: string; title: string; budget: RialAmount; ac: RialAmount; eac: RialAmount; consumedPercent: Percent; eacVariancePercent: Percent }>;
  burn: Array<{ date: IsoDate; planned: RialAmount | null; actual: RialAmount | null; forecast: RialAmount | null }>;
  top: Array<{ id: EntityId; code: string; title: string; budget: RialAmount; ac: RialAmount; consumedPercent: Percent; alertSeverity: AlertSeverity | null }>;
}

// ── W23 ──

export interface WorkloadRowDto {
  user: PersonRef;
  area: string | null;
  openLeaves: number;
  doneLeaves: number;
  reports: number;
  actualPercent: Percent | null;
  plannedPercent: Percent | null;
  deviation: Percent | null;
  flag: { icon: 'camera-off' | 'cloud-off' | 'map-pin' | 'alert-triangle'; text: string } | null;
}

export interface ApproverStatDto {
  user: PersonRef;
  area: string | null;
  decisions: number;
  avgHours: number;
  p90Hours: number;
  returnRatePercent: Percent;
  pending: number;
  bottleneck: boolean;
}

export interface HeatmapCellDto {
  date: IsoDate;
  count: number;
  holiday: boolean;
  queued: boolean;
}

export interface HeatmapRowDto {
  user: PersonRef;
  hasOpenWork: boolean;
  cells: HeatmapCellDto[];
  total: number;
  coveredDays: number;
  workingDays: number;
  coveragePercent: Percent | null;
  photosPerReport: number;
}

export interface ResourceChartsDto extends ChartMeta {
  range: ChartRangeDto;
  kpis: {
    reportCount: number;
    perWorkingDay: number;
    coveragePercent: Percent;
    supervisorsWithWork: number;
    workingDays: number;
    pending: number;
    pendingOverdue: number;
    avgApprovalHours: number;
    targetHours: number;
    returnRatePercent: Percent;
    returnCount: number;
    avgCrew: number;
  };
  workload: WorkloadRowDto[];
  /** از AL-RES-01. */
  redistribution: string | null;
  approvers: ApproverStatDto[];
  pendingByAge: { under24: number; between24and48: number; over48: number };
  bottleneck: { userId: EntityId; fullName: string; text: string; substitute: PersonRef } | null;
  heatmap: { days: Array<{ date: IsoDate; holiday: boolean }>; rows: HeatmapRowDto[] };
  attention: Array<{ text: string; tone: 'err' | 'wrn'; link: string }>;
  crew: Array<{ date: IsoDate; total: number }>;
}

// ── W24 ──

export interface TreemapLeafDto {
  id: EntityId;
  code: string;
  title: string;
  groupCode: string;
  groupTitle: string;
  weight: Percent;
  plannedPercent: Percent;
  actualPercent: Percent;
  deviation: Percent;
  status: WbsProgressStatus;
  /** OD-18: کار خارج از مبنا — خانهٔ خاکستری با برچسب. */
  outOfBaseline: boolean;
  riskCodes: string[];
  supervisor: PersonRef | null;
  plannedFinish: IsoDate;
  forecastFinish: IsoDate | null;
  delayDays: number | null;
}

export interface RiskChartsDto extends ChartMeta {
  kpis: {
    leafCount: number;
    groupCount: number;
    critical: number;
    late: number;
    done: number;
    doneWeightPercent: Percent;
    spi: number | null;
    pv: RialAmount | null;
    ev: RialAmount | null;
    delayWorkingDays: number | null;
    forecastFinish: IsoDate | null;
  };
  leaves: TreemapLeafDto[];
  groups: Array<{ code: string; title: string; weight: Percent; deviation: Percent; counts: Record<WbsProgressStatus, number> }>;
  distribution: Array<{ status: WbsProgressStatus; count: number; percent: Percent }>;
}
