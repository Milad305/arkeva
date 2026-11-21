import type { Computed, EntityId, IsoDate } from '@/shared/types/api';
import type { PlanVersionRef } from '@/modules/projects/types';

// «این عدد از کجا آمد؟» — الگوی G9 (`features/charts.md` ۴).
// داده را F10 می‌دهد: `GET /projects/:pid/progress/explain?metric=&itemId=&date=`.

/** اعدادی که توضیح برایشان الزامی است (charts.md ۴). */
export type ExplainMetric =
  | 'actual_percent'
  | 'planned_percent'
  | 'deviation'
  | 'pv'
  | 'ev'
  | 'ac'
  | 'cpi'
  | 'spi'
  | 'eac'
  | 'forecast_finish'
  | 'cbs_consumption';

export interface ExplainParams {
  projectId: EntityId;
  metric: ExplainMetric;
  /** آیتم WBS یا قلم CBS؛ نبودنش یعنی کل پروژه. */
  itemId?: EntityId;
  date?: IsoDate;
}

/** یکی از پنج منبع بزرگ‌ترین سهم. */
export interface ExplainSource {
  kind: 'wbs_item' | 'cbs_item' | 'cost_entry' | 'plan_version';
  id: EntityId;
  /** کد نمایشی: «1.1.2»، «C2». */
  code: string | null;
  label: string;
  /** سطر توضیح از سرور، مثل «۳۰۰ × ۹۰٪ = ۲۷۰». */
  detail: string;
  /** سهم این منبع از عدد، برای نوار کوچک. */
  sharePercent: number | null;
}

export interface MetricExplanationDto extends Computed {
  metric: ExplainMetric;
  title: string;
  /** مقدار نمایشی همان‌طور که روی صفحه است. */
  valueText: string;
  dataDate: IsoDate;
  /** تعریف یک‌جمله‌ای فارسی. */
  definition: string;
  /**
   * فرمول با عدد جای‌گذاری‌شده، ساختهٔ سرور:
   * «CPI = EV ÷ AC = ۴۹۰ ÷ ۵۲۰ = 0.94». بدون `cbs.view_amounts` بدون مبلغ.
   */
  formula: string;
  sources: ExplainSource[];
  /** «شاخص‌های هزینه تا … (تاریخ کامل بودن هزینه‌ها)» — OD-19. */
  costIndicesNote: string | null;
  referenceVersion: PlanVersionRef | null;
}
