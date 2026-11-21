import type { WorkCalendar } from '../../computation/index.js';
import type { MeasurementMethod } from '../../planning/index.js';

// قرارداد عملیات W12 (wbs.md ۱۱): شکل هر عمل، زمینهٔ اجرا و پیام‌های قفل (wbs.md ۵.۶، ۹).

export interface DraftFields {
  readonly title?: string;
  readonly code?: string;
  readonly weightInParent?: number;
  readonly unit?: string | null;
  readonly totalQuantity?: number | null;
  readonly plannedStart?: string | null;
  readonly plannedFinish?: string | null;
  readonly measurementMethod?: MeasurementMethod | null;
  readonly isMilestone?: boolean;
}

export type WeightGenerator = 'equal' | 'duration' | 'cost';

export type WbsOp =
  | {
      readonly type: 'add';
      readonly tempId: string;
      readonly parentId: string | null;
      readonly afterId: string | null;
      readonly fields: DraftFields & { readonly title: string };
    }
  | {
      readonly type: 'update';
      readonly id: string;
      readonly fields: DraftFields;
    }
  | {
      readonly type: 'move';
      readonly id: string;
      readonly parentId: string | null;
      readonly afterId: string | null;
    }
  | { readonly type: 'indent'; readonly id: string }
  | { readonly type: 'outdent'; readonly id: string }
  | { readonly type: 'remove'; readonly id: string }
  | {
      readonly type: 'split';
      readonly id: string;
      readonly keepTitle: string;
      readonly keepQuantity: number | null;
      readonly parts: readonly {
        readonly tempId: string;
        readonly title: string;
        readonly totalQuantity: number | null;
      }[];
    }
  | { readonly type: 'autoDistribute'; readonly parentId: string | null }
  | {
      readonly type: 'generateWeights';
      readonly scope: string | null;
      readonly generator: WeightGenerator;
    }
  | {
      readonly type: 'setSteps';
      readonly id: string;
      readonly steps: readonly {
        readonly key: string;
        readonly title: string;
        readonly weight: number;
      }[];
      readonly stepsDone?: Readonly<Record<string, number>>;
    };

/**
 * گزارش‌های هر برگ (F09). تا گزارش کارگاه (برش ۹) هیچ برگی گزارش ندارد و همهٔ پاسخ‌ها منفی است؛ قواعد ۵.۶
 * از همین حالا به این قرارداد بسته‌اند.
 */
export interface ReportFacts {
  hasApproved(itemId: string): boolean;
  hasPending(itemId: string): boolean;
  /** جمع مقدار تأییدشدهٔ برگ مقداری (W-04). */
  approvedQuantity(itemId: string): number | null;
}

export const NO_REPORTS: ReportFacts = {
  hasApproved: () => false,
  hasPending: () => false,
  approvedQuantity: () => null,
};

export interface OpsContext {
  readonly mspLinked: boolean;
  readonly facts: ReportFacts;
  readonly calendar: WorkCalendar;
  /** بودجهٔ هر برگ از اتصال‌های CBS (F05)؛ برای مولد «از هزینه». */
  readonly leafBac: ReadonlyMap<string, bigint>;
  /**
   * شناسهٔ والد تازهٔ «تقسیم» — پایدار از شناسهٔ برگ تا عمل‌های بعدی همان فهرست در پیش‌نمایش و ذخیره به یک
   * آیتم برسند؛ ذخیره آن را مثل شناسهٔ موقت با شناسهٔ واقعی عوض می‌کند.
   */
  readonly splitParentId: (leafId: string) => string;
}

export interface OpError {
  readonly index: number;
  readonly code: string;
  readonly message: string;
}

export const MSP_OWNED = 'مالک این فیلد MSP است؛ آن را در فایل MSP تغییر دهید و همگام‌سازی کنید.';
export const LEAF_HAS_REPORTS = 'این برگ گزارش دارد و نمی‌تواند والد شود. به‌جای افزودن فرزند آن را «تقسیم» کنید.';
export const UNIT_LOCKED = 'واحد برگی که پیشرفت تأییدشده دارد عوض نمی‌شود. برای تغییر، آن را «تقسیم» کنید یا برگ تازه بسازید.';
