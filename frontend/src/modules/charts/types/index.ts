import type {
  Computed,
  EntityId,
  IsoDate,
  IsoInstant,
  Percent,
  RialAmount,
} from '@/shared/types/api';
import type {
  AlertSeverity,
  RiskLevel,
  RiskStatus,
  WbsProgressStatus,
} from '@/config/constants';
import type { PersonRef, PlanVersionRef } from '@/modules/projects/types';

// F17 — لایهٔ خواندن (`design/features/charts.md`).
// هیچ عددی اینجا ساخته نمی‌شود؛ همه از F10 و F11 ذخیره و خوانده می‌شوند (D07).
// مبالغ بدون `cbs.view_amounts` در پاسخ نمی‌آیند (D11)، پس همه اختیاری‌اند.

/** `computeState` هر پاسخ F17 (charts.md ۹). */
export type ComputeState = 'ready' | 'updating';

/** فرادادهٔ مشترک همهٔ پاسخ‌های نمودار. */
export interface ChartMeta extends Computed {
  dataDate: IsoDate;
  /** تاریخ شاخص‌های هزینه `t_c` (OD-19). */
  costIndicesDate: IsoDate | null;
  computeState: ComputeState;
  /**
   * `computedAt` بیش از ۳۶ ساعت از آخرین `DailyTick` عقب است (charts.md ۷).
   * مقایسه سمت سرور انجام می‌شود چون فقط سرور زمان تیک را می‌داند.
   */
  stale: boolean;
  /** نسخه‌ای که PV و انحراف نسبت به آن سنجیده می‌شود. */
  pvReference: PlanVersionRef | null;
}

/** کارت «پیشرفت فیزیکی» — ب1، ب2، ب4. */
export interface OverviewProgress {
  plannedPercent: Percent;
  actualPercent: Percent;
  deviation: Percent;
  /** وضعیت پروژه از آستانه‌های همان پروژه. */
  status: WbsProgressStatus;
  /** پیشرفت ریالی (ب10) — فقط وقتی `showFinancialProgress` روشن است. */
  financialPercent?: Percent;
}

/** کارت «بودجهٔ مصرف‌شده» = AC ÷ BAC (ب8). */
export interface OverviewBudget {
  consumedPercent: Percent;
  ac?: RialAmount;
  bac?: RialAmount;
}

/**
 * کارت «زمان» — همه به **روز کاری** تقویم پروژه، هم‌واحد با تأخیر
 * (`[تأییدشده 1405/08/14]`، charts.md ۶.۲).
 */
export interface OverviewTime {
  plannedStart: IsoDate;
  plannedFinish: IsoDate;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  totalWorkingDays: number;
  elapsedPercent: Percent;
  forecastFinish: IsoDate | null;
  /** مثبت = تأخیر؛ منفی = جلوتر. `null` تا EV صفر است (evm.md ۷). */
  delayWorkingDays: number | null;
}

/** دستهٔ جملهٔ خلاصهٔ EVM — بازهٔ متقارن ۰٫۹۵ تا ۱٫۰۵ (charts.md ۶.۲). */
export type CostTrend = 'over' | 'near' | 'under';
export type ScheduleTrend = 'behind' | 'near' | 'ahead';

/** کارت «شاخص‌های ارزش کسب‌شده» — ب9. */
export interface OverviewEvm {
  cpi: number | null;
  spi: number | null;
  /** شدت هشدار باز AL-CST-04 روی پروژه؛ رنگ کادر CPI. */
  costAlert: AlertSeverity | null;
  /** شدت هشدار باز AL-PRG-03 روی پروژه؛ رنگ کادر SPI. */
  scheduleAlert: AlertSeverity | null;
  costTrend: CostTrend | null;
  scheduleTrend: ScheduleTrend | null;
  /** `|1 − SPI| × 100`؛ عدد «n٪ عقب/جلو». */
  scheduleGapPercent: Percent | null;
}

/** یک نقطهٔ منحنی S (سری‌ها از `ProjectDailySnapshot` و `PlanVersionCurve`). */
export interface SCurvePoint {
  date: IsoDate;
  /** خط برنامه‌ای (نسخهٔ مرجع PV). */
  planned: Percent | null;
  /** واقعی — فقط تا تاریخ داده. */
  actual: Percent | null;
  /** پیش‌بینی (evm.md ۶.۲) — از تاریخ داده به بعد. */
  forecast: Percent | null;
}

/** ردیف «فعالیت‌های بحرانی» — برگ‌های با بیشترین عقب‌ماندگی. */
export interface CriticalItemDto {
  wbsItemId: EntityId;
  code: string;
  title: string;
  plannedPercent: Percent;
  actualPercent: Percent;
  deviation: Percent;
  status: WbsProgressStatus;
  supervisor: PersonRef | null;
}

/** ردیف «بیشترین مصرف بودجهٔ CBS» — `CbsItemProgress` (ب12). */
export interface CbsConsumptionDto {
  cbsItemId: EntityId;
  code: string;
  title: string;
  budget?: RialAmount;
  ac?: RialAmount;
  consumedPercent: Percent;
  /** شدت هشدار باز AL-CST-01 یا AL-CST-02 روی همین قلم. */
  alertSeverity: AlertSeverity | null;
}

/** نقطهٔ عطف — برگ با وزن ۰ زیر گروه «نقاط عطف کلیدی» (F02 ۵.۲). */
export interface MilestoneDto {
  wbsItemId: EntityId;
  title: string;
  plannedDate: IsoDate;
  status: WbsProgressStatus;
  /** تاریخ آخرین تأیید، برای تمام‌شده. */
  actualDate: IsoDate | null;
  forecastDate: IsoDate | null;
  delayWorkingDays: number | null;
}

/** خلاصهٔ ریسک باز (۰۲ بخش ۹). */
export interface RiskSummaryDto {
  id: EntityId;
  code: string;
  title: string;
  category: string;
  score: number | null;
  level: RiskLevel | null;
  status: RiskStatus;
  owner: PersonRef;
}

/**
 * وضعیت امروز یک سرپرست — هم‌راستا با AL-FLD-01 (`[تأییدشده 1405/08/14]`).
 * `queued` از ضربان اپ می‌آید (field-app.md ۷).
 */
export type SupervisorTodayState = 'reported' | 'queued' | 'not_reported';

export interface SupervisorTodayDto {
  user: PersonRef;
  /** حوزهٔ کاری، مثل «بلوک شمالی». */
  areaName: string | null;
  state: SupervisorTodayState;
  reportCountToday: number;
  lastReportAt: IsoInstant | null;
  queuedReports: number;
  /** روزهای کاری پیاپی بی‌گزارش، شامل امروز. */
  workingDaysWithoutReport: number;
  /** شدت هشدار باز AL-FLD-01 (۲ روز هشدار، ۵ روز بحرانی). */
  alertSeverity: AlertSeverity | null;
}

/** «تیم کارگاه امروز» — ب18. */
export interface FieldTeamTodayDto {
  /** سرپرستانی که امروز گزارش داده‌اند. */
  reportedCount: number;
  /** سرپرستانی که امروز فعالیت باز تخصیص‌یافته دارند. */
  expectedCount: number;
  supervisors: SupervisorTodayDto[];
}

/** `GET /projects/:pid/overview` — W10 (charts.md ۶.۲ و ۹). */
export interface ProjectOverviewDto extends ChartMeta {
  projectId: EntityId;
  progress: OverviewProgress;
  budget: OverviewBudget;
  time: OverviewTime;
  evm: OverviewEvm;
  sCurve: SCurvePoint[];
  criticalItems: CriticalItemDto[];
  topCbsItems: CbsConsumptionDto[];
  milestones: MilestoneDto[];
  openRisks: { total: number; items: RiskSummaryDto[] };
  fieldTeam: FieldTeamTodayDto;
  /** آیا هنوز هیچ گزارشی تأیید نشده (حالت خالی charts.md ۷). */
  hasApprovedReports: boolean;
}

/** فهرست سفید رویدادهای قابل‌نمایش (platform.md ۱۰). */
export type ActivityKind =
  | 'report_submitted'
  | 'report_approved'
  | 'report_items_rejected'
  | 'alert_raised'
  | 'member_added'
  | 'msp_synced'
  | 'plan_applied'
  | 'period_closed'
  | 'risk_changed'
  | 'cost_posted';

/** یک رویداد «فعالیت‌های اخیر» — از `DomainEvent` (۰۲ بخش ۱۳). */
export interface ActivityEventDto {
  id: EntityId;
  kind: ActivityKind;
  occurredAt: IsoInstant;
  /** `null` برای رویداد سامانه (هشدار خودکار). */
  actor: PersonRef | null;
  /** موضوع رویداد: آیتم WBS، نسخه، ریسک، … */
  subject: { type: 'wbs_item' | 'plan_version' | 'risk' | 'cbs_item' | 'field_report' | 'user'; id: EntityId; label: string } | null;
  /**
   * سطر دوم از قالب سرور: «۳ عکس · ۱۳۰ مترمکعب · داخل محدودهٔ GPS».
   * مبلغ فقط برای دارندگان `cbs.view_amounts` در آن می‌آید.
   */
  details: string | null;
  /** عدد اصلی رویداد اگر هست: شمار آیتم، درصد عقب‌ماندگی، شمارهٔ نسخه. */
  value: number | null;
  /** فقط در فید سطح سازمان (W05)؛ در فید یک پروژه نمی‌آید. */
  project?: { id: EntityId; name: string };
}
