import type { ProjectPlanContext } from '../../projects/index.js';
import type { CbsNode, LinkNode, PlanNode } from '../domain/plan-node.js';
import type { PlanVersion, PlanVersionSource } from '../domain/plan.entities.js';
import type { CurrentItem } from './plan-content.store.js';

// قراردادهای planning با ویژگی‌های محتوا (wbs، cbs): وضعیت نسخهٔ کاری و نتیجهٔ بررسی درون تراکنش اعمال.

export interface DraftState {
  readonly project: ProjectPlanContext;
  readonly draft: PlanVersion | null;
  /** WBS جاری (بی حذف‌شده‌ها). */
  readonly current: readonly CurrentItem[];
  /** WBS نسخهٔ کاری؛ بی نسخهٔ کاری همان جاری. */
  readonly nodes: readonly PlanNode[];
  readonly currentCbs: readonly CbsNode[];
  readonly cbs: readonly CbsNode[];
  readonly currentLinks: readonly LinkNode[];
  readonly links: readonly LinkNode[];
}

/** بررسی درون تراکنش اعمال — قواعد محتوا مال wbs (و بعد cbs) است؛ planning فقط نتیجه را اجرا می‌کند. */
export interface ApplyVerdict {
  /** نخستین خطای اعتبارسنجی، یا null. */
  readonly error: string | null;
  readonly changeCount: number;
  /** خلاصهٔ تفاوت برای رویداد (بی مبلغ؛ 08 ۲). */
  readonly summary: Readonly<Record<string, number>>;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  /** تغییر نرخ، مقدار یا مبلغ ← `budget_revision` (cbs.md تصمیم 1405/08/15 بند ۲). */
  readonly source?: PlanVersionSource;
}
