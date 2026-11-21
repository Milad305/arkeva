import type { EntityId, Percent, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { PlanDraftSummary } from '@/modules/projects/types';
import type { PlanDraftValidationDto } from '@/modules/plan/types';
import type { PricingMode } from '@/modules/cbs/types';
import type { OpError } from '@/modules/wbs/types/draft';

// W15 — اتصال WBS ↔ CBS (`features/cbs.md` ۵ و ۱۲). اتصال جزء نسخهٔ برنامه است (D05):
// W15 خودش صفحهٔ ویرایش نسخهٔ کاری است (تصمیم 1405/08/15). زیربودجه، BAC برگ، سهم و
// تعادل را سرور می‌سازد؛ اینجا فقط مقدار یا مبلغ نوشته می‌شود (D07).

/** برگ یا والد WBS در فهرست سمت راست. */
export interface LinkLeafDto {
  id: EntityId;
  parentId: EntityId | null;
  code: string;
  title: string;
  sortOrder: number;
  isLeaf: boolean;
  isMilestone: boolean;
  unit: string | null;
  totalQuantity: number | null;
  weightInProject: Percent;
  supervisorName: string | null;
  /** والد: برگ‌های دارای اتصال در زیرشاخه / کل برگ‌های قابل اتصال. */
  linkedLeaves: number;
  linkableLeaves: number;
  linkCount: number;
  /** Σ زیربودجهٔ اتصال‌ها (ب6). */
  bac: RialAmount | null;
  /** BAC برگ ÷ BAC پروژه × ۱۰۰. */
  budgetSharePercent: Percent | null;
  /** |وزن در پروژه − سهم بودجه| به واحد درصد (۵.۳). */
  balanceDiff: Percent | null;
  /** اختلاف کمتر از ۰٫۱ واحد درصد (تصمیم 1405/08/15، cbs.md ۵.۳). */
  balanced: boolean;
  /** برگ اتصال‌پذیر نیست (نقطهٔ عطف). */
  linkable: boolean;
}

export interface LinkRowDto {
  wbsItemId: EntityId;
  cbsItemId: EntityId;
  /** `unit_rate`: مقدار به واحد قلم CBS. */
  quantity: number | null;
  /** `lump_sum`: مبلغ تخصیص (G15). */
  amount: RialAmount | null;
  subBudget: RialAmount | null;
  /** سهم این اتصال از BAC برگ. */
  sharePercent: Percent | null;
  change: 'added' | 'changed' | null;
}

/** قلم برگ CBS برای انتخاب در ردیف «افزودن اتصال». */
export interface LinkCbsOptionDto {
  id: EntityId;
  code: string;
  title: string;
  costType: CostType;
  pricingMode: PricingMode | null;
  unit: string | null;
  unitRate: RialAmount | null;
  budget: RialAmount | null;
  unallocated: RialAmount | null;
}

export interface LinksViewDto {
  /** نسخهٔ کاری یا برنامهٔ جاری (کاربر بدون ویرایش یا پروژهٔ بسته). */
  source: 'draft' | 'current';
  draft: PlanDraftSummary | null;
  draftRevision: number;
  syncsToCurrent: boolean;
  leaves: LinkLeafDto[];
  links: LinkRowDto[];
  cbsItems: LinkCbsOptionDto[];
  summary: {
    leafCount: number;
    linkedCount: number;
    unlinkedCount: number;
    /** برگ‌های با اختلاف بیش از پارامتر AL-STR-03 (پیش‌فرض ۱ واحد درصد). */
    imbalancedCount: number;
    projectBac: RialAmount | null;
  };
  validation: PlanDraftValidationDto | null;
}

export type LinkOp =
  | {
      type: 'link';
      wbsItemId: EntityId;
      cbsItemId: EntityId;
      quantity?: number | null;
      amount?: RialAmount | null;
    }
  | { type: 'unlink'; wbsItemId: EntityId; cbsItemId: EntityId }
  | { type: 'setQuantity'; wbsItemId: EntityId; cbsItemId: EntityId; quantity: number }
  | { type: 'setAmount'; wbsItemId: EntityId; cbsItemId: EntityId; amount: RialAmount }
  /** «کپی اتصالات به…» `[پیشنهاد تأییدشده 1405/08/15]`. */
  | { type: 'copy'; fromWbsItemId: EntityId; toWbsItemIds: EntityId[] };

export interface LinkOpsRequest {
  projectId: EntityId;
  draftRevision: number;
  ops: LinkOp[];
}

export interface LinksPreviewDto extends LinksViewDto {
  opErrors: OpError[];
}

// ── ورود Excel اتصال‌ها (cbs.md ۱۰) ──

export interface LinkImportRequest {
  projectId: EntityId;
  draftRevision: number;
  file: File;
}

export interface LinkImportRowDto {
  row: number;
  wbsCode: string;
  cbsCode: string;
  wbsTitle: string | null;
  cbsTitle: string | null;
  quantity: number | null;
  amount: RialAmount | null;
  subBudget: RialAmount | null;
  errors: string[];
}

export interface LinkImportPreviewDto {
  fileName: string;
  rows: LinkImportRowDto[];
  errorCount: number;
  /** برگ‌هایی که اتصال‌هایشان با ردیف‌های فایل جایگزین می‌شود. */
  leafCount: number;
  budgetTotal: RialAmount | null;
}
