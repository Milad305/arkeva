import type { CbsItemProgressView } from '../../computation/reads.js';
import type { CbsNode, CostType, LinkNode } from '../../planning/index.js';
import { allocationsOf, budgetOf, type CbsTreeNode, isCbsLeaf, toCbsForest, walkCbs } from '../domain/cbs-tree.js';

// شکل خواندنی قلم CBS (CbsItemDto فرانت). همهٔ مبالغ رشتهٔ ریال؛ حذف مبلغ با @Amounts مسیر (AC-CBS-06). شاخص‌های هر
// قلم از جدول مشتق CbsItemProgress (cbs.md ۸؛ F10)؛ نسخهٔ کاری و قلم بی محاسبه `progress: null`.

export const CBS_AMOUNT_KEYS = [
  'unitRate',
  'lumpSumAmount',
  'budget',
  'allocated',
  'unallocated',
  'totalBudget',
  'cbsBudget',
  'currentCbsBudget',
  'bac',
  'contingencyReserve',
  'ac',
  'ev',
  'eac',
  'projectEac',
  'postedAc',
  'subBudget',
  'allocatedAmount',
  'amount',
  'budgetChange',
  'bacChange',
  'budgetTotal',
  'rate',
  'lump',
  'previousRate',
  'projectBac',
] as const;

export interface CbsItemView {
  readonly id: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly title: string;
  readonly sortOrder: number;
  readonly isLeaf: boolean;
  readonly costType: CostType;
  readonly unit: string | null;
  readonly estimatedQuantity: number | null;
  readonly pricingMode: string | null;
  readonly unitRate: string | null;
  readonly lumpSumAmount: string | null;
  readonly budget: string;
  readonly supplierNote: string | null;
  readonly linkCount: number;
  readonly allocated: string;
  readonly unallocated: string;
  readonly progress: CbsItemProgressView | null;
}

/** فهرست تخت به ترتیب درخت، با بودجه و تخصیص هر قلم (والد: جمع زیرقلم‌ها). */
export function cbsItemViews(nodes: readonly CbsNode[], links: readonly LinkNode[], progress?: ReadonlyMap<string, CbsItemProgressView>): CbsItemView[] {
  const forest = toCbsForest(nodes);
  const allocations = allocationsOf(forest, links);
  const views: CbsItemView[] = [];
  const totals = (node: CbsTreeNode): { allocated: bigint; linkCount: number } => {
    if (isCbsLeaf(node)) return allocations.get(node.id) ?? { allocated: 0n, linkCount: 0 };
    return node.children.reduce(
      (sum, child) => {
        const value = totals(child);
        return { allocated: sum.allocated + value.allocated, linkCount: sum.linkCount + value.linkCount };
      },
      { allocated: 0n, linkCount: 0 },
    );
  };
  walkCbs(forest, (node, parent, index) => {
    const leaf = isCbsLeaf(node);
    const budget = budgetOf(node);
    const allocation = totals(node);
    views.push({
      id: node.id,
      parentId: parent?.id ?? null,
      code: node.code,
      title: node.title,
      sortOrder: index,
      isLeaf: leaf,
      costType: node.costType,
      unit: leaf && node.pricing === 'unit_rate' ? node.unit : null,
      estimatedQuantity: leaf && node.qty !== null ? Number(node.qty) : null,
      pricingMode: leaf ? node.pricing : null,
      unitRate: leaf ? node.rate : null,
      lumpSumAmount: leaf ? node.lump : null,
      budget: budget.toString(),
      supplierNote: node.supplier,
      linkCount: allocation.linkCount,
      allocated: allocation.allocated.toString(),
      unallocated: (budget - allocation.allocated).toString(),
      progress: progress?.get(node.id) ?? null,
    });
  });
  return views;
}

/** «ریشه ← … ← والد» برای پنل جزئیات. */
export function pathOf<T extends { readonly id: string; readonly parentId: string | null; readonly code: string; readonly title: string }>(
  items: readonly T[],
  id: string,
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const path: { id: string; code: string; title: string }[] = [];
  let parentId = byId.get(id)?.parentId ?? null;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    path.unshift({ id: parent.id, code: parent.code, title: parent.title });
    parentId = parent.parentId;
  }
  return path;
}
