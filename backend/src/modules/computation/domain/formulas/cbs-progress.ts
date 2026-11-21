import { cbsLeafBudget, linkSubBudget, type PricedItem } from './cbs.js';
import { cbsLeafFigures, type CbsItemFigures, cbsParentFigures } from './evm.js';

// شاخص‌های قلم CBS (cbs.md ۸؛ OD-17) در تاریخ شاخص‌های هزینه t_c. برگ با فرمول خودش، والد جمع فرزندان (تصمیم 1405/08/22).

export interface CbsProgressNode extends PricedItem {
  readonly id: string;
  readonly parentId: string | null;
  readonly isLeaf: boolean;
}

export interface CbsProgressLink {
  readonly wbsItemId: string;
  readonly cbsItemId: string;
  readonly quantity: string | null;
  readonly allocatedAmount: string | null;
}

export interface CbsItemProgressFigures extends CbsItemFigures {
  readonly consumedQuantity: number | null;
  readonly earnedQuantity: number | null;
  readonly excessQuantity: number | null;
}

export interface CbsProgressInput {
  /** CBS جاری (بودجهٔ قلم). */
  readonly items: readonly CbsProgressNode[];
  /** قلم‌های نسخهٔ مرجع (نرخ زیربودجه) و اتصال‌های آن (EV و مقدار کسب‌شده). */
  readonly referenceItems: readonly CbsProgressNode[];
  readonly referenceLinks: readonly CbsProgressLink[];
  /** پیشرفت واقعی برگ WBS در t_c. */
  readonly leafActual: ReadonlyMap<string, number>;
  /** ردیف‌های قطعی با costDate ≤ t_c. */
  readonly costs: readonly { readonly cbsItemId: string; readonly amount: bigint; readonly quantity: number | null }[];
}

export function cbsProgress(input: CbsProgressInput): Map<string, CbsItemProgressFigures> {
  const referenceById = new Map(input.referenceItems.map((item) => [item.id, item]));
  const ev = new Map<string, number>();
  const earned = new Map<string, number>();
  for (const link of input.referenceLinks) {
    const item = referenceById.get(link.cbsItemId);
    if (!item) continue;
    const actual = (input.leafActual.get(link.wbsItemId) ?? 0) / 100;
    ev.set(link.cbsItemId, (ev.get(link.cbsItemId) ?? 0) + Number(linkSubBudget(item, link)) * actual);
    if (item.pricingMode === 'unit_rate' && link.quantity !== null)
      earned.set(link.cbsItemId, (earned.get(link.cbsItemId) ?? 0) + Number(link.quantity) * actual);
  }
  const ac = new Map<string, bigint>();
  const consumed = new Map<string, number>();
  for (const row of input.costs) {
    ac.set(row.cbsItemId, (ac.get(row.cbsItemId) ?? 0n) + row.amount);
    if (row.quantity !== null) consumed.set(row.cbsItemId, (consumed.get(row.cbsItemId) ?? 0) + row.quantity);
  }

  const children = new Map<string | null, CbsProgressNode[]>();
  for (const item of input.items) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
  const result = new Map<string, CbsItemProgressFigures>();
  const visit = (item: CbsProgressNode): CbsItemProgressFigures => {
    const kids = children.get(item.id) ?? [];
    if (kids.length > 0) {
      const figures = { ...cbsParentFigures(kids.map(visit)), consumedQuantity: null, earnedQuantity: null, excessQuantity: null };
      result.set(item.id, figures);
      return figures;
    }
    const base = cbsLeafFigures(cbsLeafBudget(item), ac.get(item.id) ?? 0n, BigInt(Math.floor((ev.get(item.id) ?? 0) + 0.5 + 1e-9)));
    const unit = item.pricingMode === 'unit_rate';
    const used = unit ? (consumed.get(item.id) ?? 0) : null;
    const gained = unit ? (earned.get(item.id) ?? 0) : null;
    const figures = { ...base, consumedQuantity: used, earnedQuantity: gained, excessQuantity: used !== null && gained !== null ? used - gained : null };
    result.set(item.id, figures);
    return figures;
  };
  for (const root of children.get(null) ?? []) visit(root);
  return result;
}
