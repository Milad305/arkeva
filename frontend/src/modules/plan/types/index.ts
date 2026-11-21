import type { EntityId, IsoInstant, Percent } from '@/shared/types/api';

// F04 — نسخه‌های برنامه (`features/plan-versions.md`). وضعیت نسخهٔ کاری خودش در
// `ProjectDetailDto.plan.draft` است؛ اینجا اعتبارسنجی و عملیات روی آن.

/** پیش‌شرط‌های اعمال (F04 ۵.۱). */
export type PlanValidationCode =
  | 'weight_sum' // V-01
  | 'leaf_without_method' // V-02
  | 'steps_invalid' // V-03
  | 'leaf_without_dates' // V-04
  | 'steps_conversion' // V-05
  | 'blocked_change' // V-06
  | 'duplicate_code' // V-07
  | 'tree_integrity'
  | 'leaf_without_cbs' // W-01
  | 'leaf_without_supervisor' // W-02
  | 'dates_out_of_range' // W-03
  | 'quantity_below_approved' // W-04
  | 'pending_removed' // W-05
  | 'cbs_over_allocated' // V-08 تخصیص بیش از برآورد (cbs.md ۵.۲)
  | 'cbs_invalid_pricing' // V-08 برگ بدون شیوهٔ قیمت، واحد، مقدار یا نرخ
  | 'cbs_duplicate_code' // V-07 در CBS
  | 'cbs_unallocated'; // W-06

export interface PlanValidationIssue {
  code: PlanValidationCode;
  severity: 'error' | 'warning';
  /** متن کامل برای کاربر — نام گروه و عدد فعلی را می‌گوید (`features/wbs.md` ۸ W12). */
  message: string;
  wbsItemId: EntityId | null;
  /** خطاهای CBS: قلمی که مسئله دارد. */
  cbsItemId?: EntityId | null;
  /** برای `weight_sum`: والد گروه؛ `null` یعنی سطح اول. */
  parentId?: EntityId | null;
  parentTitle?: string | null;
  currentSum?: Percent;
  /** برای `weight_sum`: وزنی که هر فرزند باید بگیرد تا گروه ۱۰۰ شود (wbs.md ۸: «این مقدار را X کنید»). */
  suggestions?: Record<EntityId, Percent>;
  /** شناسهٔ قاعده در F04 ۵.۱: V-01 تا V-08، W-01 تا W-05. */
  rule?: string;
}

/** `GET /projects/:pid/plan-draft/validation` — دسترسی `plan.edit_draft`. */
export interface PlanDraftValidationDto {
  versionId: EntityId;
  draftRevision: number;
  /** همهٔ خطاها برطرف‌اند و دست‌کم یک تغییر هست (F04 ۱۳ مورد ۷). */
  canApply: boolean;
  errors: PlanValidationIssue[];
  warnings: PlanValidationIssue[];
  checkedAt: IsoInstant;
}
