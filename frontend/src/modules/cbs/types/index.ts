import type { AlertSeverity } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';

// F05 — CBS (`features/cbs.md`، `02-domain-model.md` ۵). همهٔ مبالغ رشتهٔ ریال‌اند (C02)
// و بدون `cbs.view_amounts` از سرور `null` می‌آیند (AC-CBS-06). شاخص‌های هر قلم را
// F10 در `CbsItemProgress` می‌سازد (cbs.md ۸)؛ اینجا هیچ‌کدام حساب نمی‌شود.

export type PricingMode = 'unit_rate' | 'lump_sum';

/** `CbsItemProgress` (cbs.md ۸، OD-17). */
export interface CbsItemProgressDto {
  ac: RialAmount | null;
  /** AC ÷ بودجه × ۱۰۰ — نسبت است و بدون مجوز مبلغ هم می‌آید. */
  consumedPercent: Percent | null;
  ev: RialAmount | null;
  cpi: number | null;
  eac: RialAmount | null;
  /** (EAC − بودجه) ÷ بودجه × ۱۰۰؛ نسبت. */
  eacVariancePercent: Percent | null;
  /** EV کمتر از ۱۰٪ بودجه — «کم‌اعتبار» (cbs.md ۸). */
  eacLowConfidence: boolean;
  consumedQuantity: number | null;
  earnedQuantity: number | null;
  /** مصرف‌شده − کسب‌شده؛ مثبت = پای کار یا پرت. */
  excessQuantity: number | null;
  /** هشدار باز AL-CST-01 یا AL-CST-02 روی همین قلم (تصمیم 1405/08/15: رنگ از سرور). */
  alertSeverity: AlertSeverity | null;
  alertCodes: string[];
}

export interface CbsItemDto {
  id: EntityId;
  parentId: EntityId | null;
  code: string;
  title: string;
  sortOrder: number;
  isLeaf: boolean;
  costType: CostType;
  unit: string | null;
  estimatedQuantity: number | null;
  pricingMode: PricingMode | null;
  unitRate: RialAmount | null;
  lumpSumAmount: RialAmount | null;
  /** والد: جمع فرزندان. */
  budget: RialAmount | null;
  supplierNote: string | null;
  /** شمار اتصال‌های WBS (cbs.md ۱۲). */
  linkCount: number;
  allocated: RialAmount | null;
  unallocated: RialAmount | null;
  progress: CbsItemProgressDto | null;
}

export interface CbsSummaryDto {
  /** Σ بودجهٔ برگ‌های CBS + ذخیرهٔ احتیاطی (cbs.md ۶.۱). */
  totalBudget: RialAmount | null;
  cbsBudget: RialAmount | null;
  bac: RialAmount | null;
  unallocated: RialAmount | null;
  contingencyReserve: RialAmount | null;
  ac: RialAmount | null;
  /** EAC پروژه از CPI کل پروژه — هرگز جمع پیش‌بینی قلم‌ها نیست (AC-CBS-03). */
  projectEac: RialAmount | null;
  projectCpi: number | null;
  byType: Array<{ costType: CostType; budget: RialAmount | null; percent: Percent }>;
  counts: { consumptionOver90: number; forecastOverBudget: number; unlinked: number; leaves: number; groups: number };
}

export interface CbsTreeDto {
  projectId: EntityId;
  costIndicesDate: IsoDate | null;
  computedAt: IsoInstant | null;
  items: CbsItemDto[];
  summary: CbsSummaryDto;
}

export interface CbsLinkedWbsDto {
  wbsItemId: EntityId;
  code: string;
  title: string;
  quantity: number | null;
  allocatedAmount: RialAmount | null;
  subBudget: RialAmount | null;
  wbsActualPercent: Percent | null;
}

/** ردیف تاریخچهٔ نرخ — از مقایسهٔ `CbsItemPlan` نسخه‌های پیاپی (cbs.md ۷.۴، D01). */
export interface RateHistoryEntryDto {
  versionId: EntityId;
  versionLabel: string;
  appliedAt: IsoInstant;
  unitRate: RialAmount | null;
  previousRate: RialAmount | null;
  changePercent: Percent | null;
  note: string | null;
}

export interface CbsItemDetailDto {
  item: CbsItemDto;
  path: Array<{ id: EntityId; code: string; title: string }>;
  links: CbsLinkedWbsDto[];
  rateHistory: RateHistoryEntryDto[];
  pendingRevisionCount: number;
}

// ── درخواست بازنگری بودجه (cbs.md ۷.۳، OD-11؛ فرم G14) ──

export type RevisionField = 'unitRate' | 'estimatedQuantity' | 'lumpSumAmount';
export type RevisionStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'withdrawn';

export interface RevisionChange {
  cbsItemId: EntityId;
  field: RevisionField;
  from: string;
  to: string;
}

export interface CreateRevisionRequest {
  projectId: EntityId;
  reason: string;
  changes: RevisionChange[];
}

export interface BudgetRevisionRequestDto {
  id: EntityId;
  projectId: EntityId;
  requestedBy: { id: EntityId; fullName: string };
  requestedAt: IsoInstant;
  reason: string;
  changes: Array<RevisionChange & { cbsCode: string; cbsTitle: string }>;
  /** اثر را سرور هنگام ثبت می‌سازد (۷.۳). */
  impact: { budgetChange: RialAmount | null; bacChange: RialAmount | null };
  status: RevisionStatus;
  decidedBy: { id: EntityId; fullName: string } | null;
  decidedAt: IsoInstant | null;
  decisionNote: string | null;
  /** نسخهٔ «بازنگری بودجه» که تأیید ساخت و همان لحظه اعمال کرد (۷.۲). */
  resultVersionId: EntityId | null;
}

/** `POST /projects/:pid/budget-revisions/:id/approve|reject` (cbs.md ۱۴). */
export interface DecideRevisionRequest {
  projectId: EntityId;
  requestId: EntityId;
  decision: 'approve' | 'reject';
  note: string;
}
