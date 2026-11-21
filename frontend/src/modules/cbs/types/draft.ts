import type { EntityId, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { PlanDraftSummary } from '@/modules/projects/types';
import type { PlanDraftValidationDto } from '@/modules/plan/types';
import type { OpError } from '@/modules/wbs/types/draft';
import type { PricingMode } from './index';

// حالت ویرایش CBS — عملیات گروهی روی همان نسخهٔ کاری F04 (`features/cbs.md` ۱۴):
// `POST /projects/:pid/plan-draft/cbs/ops` با `add`، `update`، `move`، `remove`، `split`،
// `setPricing`؛ و `close` («بستن قلم»، ۴.۴، تصمیم 1405/08/15). همهٔ بودجه‌ها، تخصیص‌ها و
// قفل‌ها را سرور می‌سازد (D07).

export interface CbsPricingInput {
  pricing: PricingMode;
  unit?: string | null;
  rate?: RialAmount | null;
  qty?: number | null;
  lump?: RialAmount | null;
}

export interface CbsItemInput extends Partial<CbsPricingInput> {
  title: string;
  /** خالی ← سرور کد را از والد می‌سازد. */
  code?: string;
  costType: CostType;
  supplier?: string | null;
}

export type CbsOp =
  | { type: 'add'; tempId: EntityId; parentId: EntityId | null; afterId?: EntityId | null; item: CbsItemInput }
  | { type: 'update'; id: EntityId; patch: { title?: string; code?: string; costType?: CostType; unit?: string | null; supplier?: string | null } }
  /** نرخ، مقدار برآورد، مبلغ مقطوع یا شیوهٔ قیمت — در پروژهٔ فعال یعنی بازنگری بودجه (۷.۱). */
  | ({ type: 'setPricing'; id: EntityId } & CbsPricingInput)
  | { type: 'move'; id: EntityId; parentId: EntityId | null; index: number }
  | { type: 'remove'; id: EntityId }
  /** قلم قدیمی با همان `id` و هزینه‌ها و اتصال‌هایش زیر والد تازه می‌رود (۴.۴). */
  | { type: 'split'; id: EntityId; parentTempId: EntityId; parentTitle: string; parts: Array<{ tempId: EntityId; title: string } & Partial<CbsPricingInput>> }
  /** «بستن قلم»: برآورد = هزینهٔ واقعی؛ اتصال‌ها به نسبت کم می‌شوند `[پیشنهاد تأییدشده 1405/08/15]`. */
  | { type: 'close'; id: EntityId };

export interface CbsDraftItemDto {
  id: EntityId;
  parentId: EntityId | null;
  code: string;
  title: string;
  sortOrder: number;
  isLeaf: boolean;
  costType: CostType;
  pricingMode: PricingMode | null;
  unit: string | null;
  estimatedQuantity: number | null;
  unitRate: RialAmount | null;
  lumpSumAmount: RialAmount | null;
  budget: RialAmount | null;
  supplierNote: string | null;
  allocated: RialAmount | null;
  unallocated: RialAmount | null;
  linkCount: number;
  /** هزینهٔ `posted` ثبت‌شده — والد: جمع نوادگان. */
  postedAc: RialAmount | null;
  hasPostedCost: boolean;
  change: 'added' | 'moved' | 'changed' | null;
  changedFields: string[];
  /** نرخ، مقدار یا مبلغ نسبت به جاری عوض شده — بازنگری بودجه. */
  budgetChanged: boolean;
  /** دلیل قفل هر عمل (۴.۴)؛ نبودن کلید یعنی مجاز. */
  locks: { unit?: string; remove?: string; addChild?: string; budget?: string; close?: string };
}

export interface CbsDraftTreeDto {
  draft: PlanDraftSummary | null;
  draftRevision: number;
  syncsToCurrent: boolean;
  /** پروژهٔ فعال: تغییر نرخ و مقدار و مبلغ بازنگری بودجه است و `cbs.revise_budget` می‌خواهد. */
  budgetNeedsRevision: boolean;
  items: CbsDraftItemDto[];
  summary: {
    cbsBudget: RialAmount | null;
    currentCbsBudget: RialAmount | null;
    bac: RialAmount | null;
    unallocated: RialAmount | null;
  };
  /** اعتبارسنجی کل نسخهٔ کاری (WBS و CBS با هم، F04 ۵.۱). */
  validation: PlanDraftValidationDto;
}

export interface CbsOpsRequest {
  projectId: EntityId;
  draftRevision: number;
  ops: CbsOp[];
}

export interface CbsPreviewResultDto extends CbsDraftTreeDto {
  opErrors: OpError[];
}

export interface CbsSaveResultDto extends CbsDraftTreeDto {
  idMap: Record<EntityId, EntityId>;
}

// ── ورود Excel (cbs.md ۱۰؛ تصمیم 1405/08/15) ──

export type CbsImportMode = 'replace' | 'append';

export interface CbsImportRequest {
  projectId: EntityId;
  draftRevision: number;
  file: File;
  mode: CbsImportMode;
  /** فقط `append`: والدی که ردیف‌های سطح اول فایل زیرش می‌روند؛ `null` = سطح اول. */
  parentId: EntityId | null;
}

export interface CbsImportRowDto {
  row: number;
  code: string;
  title: string;
  costType: CostType | null;
  pricing: PricingMode | null;
  unit: string | null;
  qty: number | null;
  rate: RialAmount | null;
  lump: RialAmount | null;
  supplier: string | null;
  /** بودجهٔ ساخته‌شدهٔ سرور — ستون بودجهٔ فایل نادیده گرفته می‌شود. */
  budget: RialAmount | null;
  isGroup: boolean;
  errors: string[];
}

export interface CbsImportPreviewDto {
  fileName: string;
  mode: CbsImportMode;
  parentId: EntityId | null;
  rows: CbsImportRowDto[];
  errorCount: number;
  itemCount: number;
  budgetTotal: RialAmount | null;
}
