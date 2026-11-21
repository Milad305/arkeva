import type { CbsNode, LinkNode, PlanNode } from '../../planning/index.js';

/** محتوای مبنای پروژه پیش از ساخت ورود، برای بازگردانی (msp-integration.md ۷.۱؛ تصمیم کاربر 1405/08/26). */
export interface PlanContentSnapshot {
  readonly wbs: PlanNode[];
  readonly cbs: CbsNode[];
  readonly links: LinkNode[];
  /** برگ ← سرپرست پیش از ساخت. */
  readonly supervisors: Record<string, string>;
  readonly source: string;
}
