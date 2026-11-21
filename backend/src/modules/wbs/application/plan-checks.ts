import type { PlanContent } from '../../planning/index.js';
import type { ProjectPlanContext } from '../../projects/index.js';
import type { ValidationIssue } from '../domain/validation.js';

// اعتبارسنجی کل نسخهٔ کاری (F04 ۵.۱) WBS و CBS را با هم می‌خواهد ولی wbs زیر cbs است. پس wbs این قرارداد را تعریف
// می‌کند و cbs (ماژول سراسری) پیاده‌سازی می‌دهد — همان الگوی وارونگی OrganizationStats (01 ۷).

export interface ContentCheckInput {
  readonly project: ProjectPlanContext;
  readonly draft: PlanContent;
  readonly current: PlanContent;
}

export interface ContentCheckResult {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  /** شمار تغییر CBS و اتصال‌ها نسبت به جاری. */
  readonly changeCount: number;
  /** نرخ، مقدار یا مبلغی عوض شده ← منبع نسخه `budget_revision` (cbs.md تصمیم 1405/08/15 بند ۲). */
  readonly budgetRevision: boolean;
  /** بخش CBS خلاصهٔ اثر (F04 ۵.۲). */
  readonly impact?: {
    readonly added: number;
    readonly removed: number;
    readonly changed: number;
    readonly budgetChange: string;
    readonly isBudgetRevision: boolean;
  };
}

export abstract class PlanContentChecks {
  abstract check(input: ContentCheckInput): ContentCheckResult;
}
