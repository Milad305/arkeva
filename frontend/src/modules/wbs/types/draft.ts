import type { LeafMeasurementMethod } from '@/config/constants';
import type { EntityId, IsoDate, Percent, RialAmount } from '@/shared/types/api';
import type { PlanDraftSummary } from '@/modules/projects/types';
import type { PlanDraftValidationDto } from '@/modules/plan/types';
import type { WbsItemDto, WbsStep } from './index';

// W12 — ویرایش WBS روی نسخهٔ کاری (`features/wbs.md` ۸ و ۱۱، `features/plan-versions.md`).
//
// تغییرهای ذخیره‌نشده یک **فهرست عملیات** در مرورگرند (wbs.md ۸: «سمت مرورگر»).
// سرور همان فهرست را در `…/ops/preview` بی‌نوشتن اجرا می‌کند و درخت حاصل و اعتبارسنجی
// را برمی‌گرداند (تصمیم 1405/08/15)؛ با `…/ops` ذخیره می‌کند. React هیچ جمع وزن،
// پخش یا مولدی نمی‌سازد (D07، ماتریس‌ها ۴ «کمک ویرایش»).

/** فیلدهای برنامه‌ای قابل ویرایش (۰۲ ۴: `WbsItemPlan`). */
export interface DraftFields {
  title: string;
  code: string;
  weightInParent: Percent;
  unit: string | null;
  totalQuantity: number | null;
  plannedStart: IsoDate | null;
  plannedFinish: IsoDate | null;
  measurementMethod: LeafMeasurementMethod | null;
  isMilestone: boolean;
}

export type WeightGenerator = 'equal' | 'duration' | 'cost';

/** عملیات گروهی (wbs.md ۱۱). `tempId` آیتم تازه را تا ذخیره نشان می‌دهد. */
export type WbsOp =
  | { type: 'add'; tempId: EntityId; parentId: EntityId | null; afterId: EntityId | null; fields: Partial<DraftFields> & { title: string } }
  | { type: 'update'; id: EntityId; fields: Partial<DraftFields> }
  | { type: 'move'; id: EntityId; parentId: EntityId | null; afterId: EntityId | null }
  | { type: 'indent'; id: EntityId }
  | { type: 'outdent'; id: EntityId }
  | { type: 'remove'; id: EntityId }
  | {
      type: 'split';
      id: EntityId;
      /** عنوان والد تازه = عنوان فعلی برگ؛ برگ قدیمی «— بخش ۱» می‌شود. */
      keepTitle: string;
      keepQuantity: number | null;
      parts: Array<{ tempId: EntityId; title: string; totalQuantity: number | null }>;
    }
  | { type: 'autoDistribute'; parentId: EntityId | null }
  | { type: 'generateWeights'; scope: EntityId | null | 'tree'; generator: WeightGenerator }
  | {
      type: 'setSteps';
      id: EntityId;
      steps: WbsStep[];
      /** درصد فعلی هر گام وقتی برگ دارای پیشرفت به گام‌ها تبدیل می‌شود (V-05). */
      stepsDone?: Record<string, Percent>;
    };

/** فیلدی که در این آیتم قابل ویرایش نیست و چرا (wbs.md ۵.۶ و ۹). */
export type DraftLockedField = keyof DraftFields | 'structure' | 'steps';

export interface DraftItemDto extends WbsItemDto {
  /** قفل‌ها با دلیل خوانا و راه جایگزین، مثلاً «تقسیم». */
  locks: Partial<Record<DraftLockedField, string>>;
  /** گزارش تأییدشده یا در انتظار دارد — افزودن فرزند مسدود، «تقسیم» به‌جایش. */
  hasReports: boolean;
  hasApprovedProgress: boolean;
  /** مقدار تأییدشده برای W-04. */
  approvedQuantity: number | null;
  /** نسبت به برنامهٔ جاری (ذخیره‌شده یا نه). */
  change: 'added' | 'changed' | 'moved' | null;
  /** زیربودجهٔ اتصال‌ها؛ فقط با `cbs.view_amounts`. */
  bac: RialAmount | null;
  stepsDone: Record<string, Percent> | null;
}

export interface DraftTreeDto {
  /** `null` یعنی هنوز نسخهٔ کاری نیست و با اولین ذخیره از جاری کپی می‌شود (F04 ۳). */
  draft: PlanDraftSummary | null;
  draftRevision: number;
  /** پروژهٔ پیش‌نویس: ذخیره بلافاصله در جاری دیده می‌شود. */
  syncsToCurrent: boolean;
  mspLinked: boolean;
  items: DraftItemDto[];
  validation: PlanDraftValidationDto;
  rootWeightSum: Percent;
}

export interface OpsRequest {
  projectId: EntityId;
  draftRevision: number;
  ops: WbsOp[];
}

export interface OpError {
  /** شمارهٔ عمل در فهرست. */
  index: number;
  code: string;
  message: string;
}

export interface PreviewResultDto extends DraftTreeDto {
  /** عملیاتی که سرور نپذیرفت؛ بقیه اجرا شده‌اند. */
  opErrors: OpError[];
}

export interface SaveResultDto extends DraftTreeDto {
  /** شناسهٔ واقعی آیتم‌های تازه. */
  idMap: Record<EntityId, EntityId>;
}

/** خلاصهٔ اثر پیش از اعمال (F04 ۵.۲). */
export interface DraftImpactDto {
  added: number;
  removed: number;
  moved: number;
  changed: number;
  changedFields: Array<{ field: string; label: string; count: number }>;
  /** روز تقویمی؛ مثبت = دیرتر. */
  finishShiftDays: number;
  currentFinish: IsoDate | null;
  draftFinish: IsoDate | null;
  /** فقط با `cbs.view_amounts`. */
  bacChange: RialAmount | null;
  /** واحد درصد. */
  plannedTodayChange: Percent | null;
  /** آیتم‌های در انتظارِ برگ‌های حذف‌شده که `needs_resolution` می‌شوند (AC-PV-07). */
  needsResolutionCount: number;
  /** تغییرهای CBS همین نسخهٔ کاری (حالت ویرایش CBS). */
  cbs?: {
    added: number;
    removed: number;
    changed: number;
    /** بودجهٔ CBS نسخهٔ کاری − جاری؛ فقط با `cbs.view_amounts`. */
    budgetChange: string | null;
    /** دست‌کم یک نرخ، مقدار یا مبلغ عوض شده — اعمال، «بازنگری بودجه» می‌شود. */
    isBudgetRevision: boolean;
  };
}

export interface ApplyRequest {
  projectId: EntityId;
  draftRevision: number;
  /** برای بازنگری اجباری (AC-PV-10). */
  note: string;
}
