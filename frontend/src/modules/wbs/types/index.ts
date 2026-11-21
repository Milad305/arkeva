import type {
  AlertSeverity,
  FieldReportItemStatus,
  LeafMeasurementMethod,
  WbsProgressStatus,
} from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { PersonRef } from '@/modules/projects/types';

// F03 — WBS. فیلدها از `02-domain-model.md` ۴ (WbsItem) و ۷ (WbsItemProgress)
// به‌علاوهٔ افزوده‌های `features/wbs.md` ۴.۱ (codeMode، statusNote).
//
// API فهرست تخت با `parentId` و `sortOrder` برمی‌گرداند و درخت در مرورگر ساخته
// می‌شود (`features/wbs.md` ۱۲). همهٔ اعداد مشتق (تاریخ والد، پیشرفت تجمیعی، وضعیت،
// وزن در پروژه، شمارش‌ها) از سرور می‌آیند (D07).

export type WbsCodeMode = 'auto' | 'custom';

/** گام برگ با روش `steps` (`features/wbs.md` ۴.۲). `key` پایدار است و دوباره استفاده نمی‌شود. */
export interface WbsStep {
  key: string;
  title: string;
  weight: Percent;
}

/** `WbsItemProgress` — نوشتهٔ ماژول محاسبات (F10). */
export interface WbsItemProgressDto {
  dataDate: IsoDate;
  /** از نسخهٔ مرجع PV (OD-02). */
  plannedPercent: Percent;
  /** فقط از آیتم‌های تأییدشده؛ برای والد تجمیع وزنی. */
  actualPercent: Percent;
  /** برگ مقداری: جمع مقدار تأییدشده. */
  actualQuantity: number | null;
  /** آخرین مقدار در انتظار تأیید — فقط نمایشی. */
  pendingPercent: Percent | null;
  /** واقعی − برنامه‌ای، به واحد درصد (C04). */
  deviation: Percent;
  /** با آستانه‌های پروژه (۰۰ ۴.۴). */
  status: WbsProgressStatus;
  /** OD-07. */
  forecastFinish: IsoDate | null;
  lastApprovedAt: IsoInstant | null;
  /** BAC — فقط با `cbs.view_amounts`؛ بدون آن `null` (AC-WBS-10). */
  bac: RialAmount | null;
}

/** یک ردیف درخت جاری با پیشرفت: `GET /projects/:pid/wbs?include=progress`. */
export interface WbsItemDto {
  id: EntityId;
  parentId: EntityId | null;
  /** نمایشی (C01)؛ هرگز کلید نیست. */
  code: string;
  codeMode: WbsCodeMode;
  title: string;
  sortOrder: number;
  isLeaf: boolean;
  isMilestone: boolean;
  weightInParent: Percent;
  /** سهم در کل پروژه — حاصل‌ضرب وزن‌ها تا ریشه (۰۰ ۶.۱)؛ سرور می‌سازد. */
  weightInProject: Percent;
  /** برای والد، مشتق از فرزندان (`features/wbs.md` ۵.۴). */
  plannedStart: IsoDate;
  plannedFinish: IsoDate;
  unit: string | null;
  totalQuantity: number | null;
  measurementMethod: LeafMeasurementMethod | null;
  steps: WbsStep[] | null;
  /** عملیاتی و بدون نسخه (W17). */
  supervisor: PersonRef | null;
  /** عملیاتی و بدون نسخه (`features/wbs.md` ۴.۱). */
  statusNote: string | null;
  /** از MSP (D05). */
  isCritical: boolean | null;
  totalFloatDays: number | null;
  /** پروژهٔ پیش‌نویس هنوز محاسبه ندارد. */
  progress: WbsItemProgressDto | null;
}

export interface WbsTreeSummaryDto {
  totalItems: number;
  leafCount: number;
  parentCount: number;
  milestoneCount: number;
  /** جمع وزن آیتم‌های سطح اول. */
  rootWeightSum: Percent;
}

export interface WbsTreeDto {
  projectId: EntityId;
  /** نسخه‌ای که جدول جاری آینه‌اش است؛ در پروژهٔ پیش‌نویس، مبنای کاری. */
  versionId: EntityId | null;
  dataDate: IsoDate | null;
  computedAt: IsoInstant | null;
  items: WbsItemDto[];
  summary: WbsTreeSummaryDto;
}

/** درخت ساخته‌شده در مرورگر از فهرست تخت. */
export interface WbsTreeNode extends WbsItemDto {
  children: WbsTreeNode[];
}

// ── جزئیات آیتم: `GET /projects/:pid/wbs/:itemId` ──

export interface WbsPathEntry {
  id: EntityId;
  code: string;
  title: string;
}

/** اتصال برگ به قلم CBS (F05). AC در سطح برگ وجود ندارد (OD-01). */
export interface WbsLinkedCbsDto {
  linkId: EntityId;
  cbsItemId: EntityId;
  code: string;
  title: string;
  costType: CostType;
  /** زیربودجهٔ همین اتصال — سهم این برگ؛ فقط با `cbs.view_amounts`. */
  subBudget: RialAmount | null;
  /** درصد مصرف **کل قلم** (AC قلم ÷ بودجهٔ قلم) از `CbsItemProgress`. */
  cbsConsumedPercent: Percent | null;
  /** هشدار باز AL-CST روی همان قلم. */
  cbsAlertSeverity: AlertSeverity | null;
}

export interface WbsReportItemSummaryDto {
  id: EntityId;
  reportId: EntityId;
  status: FieldReportItemStatus;
  workDate: IsoDate;
  /** `lastApprovedPercent` هنگام دریافت. */
  fromPercent: Percent;
  /** `computedPercent`. */
  toPercent: Percent;
  submittedBy: PersonRef | null;
  /** یادداشت ناظر برای «نیاز اصلاح» و «رد». */
  reviewNote: string | null;
  submittedAt: IsoInstant;
}

/** آخرین درصد تأییدشدهٔ هر گام (`features/wbs.md` ۵.۷). */
export interface WbsStepProgressDto extends WbsStep {
  approvedPercent: Percent;
}

export interface WbsItemDetailDto {
  item: WbsItemDto;
  /** نیاکان از سطح اول تا والد مستقیم. */
  path: WbsPathEntry[];
  childCount: number;
  leafCountBelow: number;
  stepsProgress: WbsStepProgressDto[] | null;
  cbsLinks: WbsLinkedCbsDto[];
  reports: { total: number; recent: WbsReportItemSummaryDto[] };
  /** ریسک‌های باز پیوندخورده (F14، RiskLink). */
  openRiskCount: number;
}

export interface UpdateStatusNoteRequest {
  projectId: EntityId;
  itemId: EntityId;
  statusNote: string | null;
}
