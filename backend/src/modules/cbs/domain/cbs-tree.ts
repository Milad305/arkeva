import { cbsLeafBudget, linkSubBudget } from '../../computation/index.js';
import type { CbsNode, CostType, LinkNode, PricingModeCode } from '../../planning/index.js';

// درخت CBS در حافظه (cbs.md ۴). تابع خالص. مبلغ bigint ریال، مقدار رشتهٔ دهدهی (C02، C04).

export const MAX_CBS_DEPTH = 6;
export const MAX_LINKS_PER_LEAF = 20;

export interface CbsTreeNode {
  id: string;
  code: string;
  title: string;
  costType: CostType;
  unit: string | null;
  qty: string | null;
  pricing: PricingModeCode | null;
  rate: string | null;
  lump: string | null;
  supplier: string | null;
  children: CbsTreeNode[];
}

export const isCbsLeaf = (node: CbsTreeNode): boolean => node.children.length === 0;

export function toCbsForest(nodes: readonly CbsNode[]): CbsTreeNode[] {
  const byId = new Map<string, CbsTreeNode>();
  for (const node of nodes) {
    byId.set(node.id, {
      id: node.id,
      code: node.code,
      title: node.title,
      costType: node.costType,
      unit: node.isLeaf ? node.unit : null,
      qty: node.isLeaf ? node.estimatedQuantity : null,
      pricing: node.isLeaf ? node.pricingMode : null,
      rate: node.isLeaf ? node.unitRate : null,
      lump: node.isLeaf ? node.lumpSumAmount : null,
      supplier: node.supplierNote,
      children: [],
    });
  }
  const roots: CbsTreeNode[] = [];
  for (const node of [...nodes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const tree = byId.get(node.id) as CbsTreeNode;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(tree);
  }
  return roots;
}

export function walkCbs(forest: readonly CbsTreeNode[], visit: (node: CbsTreeNode, parent: CbsTreeNode | null, index: number, depth: number) => void): void {
  const go = (nodes: readonly CbsTreeNode[], parent: CbsTreeNode | null, depth: number) =>
    nodes.forEach((node, index) => {
      visit(node, parent, index, depth);
      go(node.children, node, depth + 1);
    });
  go(forest, null, 1);
}

export function toCbsNodes(forest: readonly CbsTreeNode[]): CbsNode[] {
  const nodes: CbsNode[] = [];
  walkCbs(forest, (node, parent, index) => {
    const leaf = isCbsLeaf(node);
    nodes.push({
      id: node.id,
      parentId: parent?.id ?? null,
      sortOrder: index,
      code: node.code,
      title: node.title,
      isLeaf: leaf,
      costType: node.costType,
      unit: leaf && node.pricing === 'unit_rate' ? node.unit : null,
      estimatedQuantity: leaf && node.pricing === 'unit_rate' ? node.qty : null,
      pricingMode: leaf ? node.pricing : null,
      unitRate: leaf && node.pricing === 'unit_rate' ? node.rate : null,
      lumpSumAmount: leaf && node.pricing === 'lump_sum' ? node.lump : null,
      supplierNote: node.supplier,
    });
  });
  return nodes;
}

export interface Located {
  readonly node: CbsTreeNode;
  readonly siblings: CbsTreeNode[];
  readonly index: number;
  readonly parent: CbsTreeNode | null;
  readonly depth: number;
}

export function locateCbs(forest: CbsTreeNode[], id: string): Located | null {
  const search = (nodes: CbsTreeNode[], parent: CbsTreeNode | null, depth: number): Located | null => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index] as CbsTreeNode;
      if (node.id === id) return { node, siblings: nodes, index, parent, depth };
      const found = search(node.children, node, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return search(forest, null, 1);
}

export const heightOf = (node: CbsTreeNode): number => (isCbsLeaf(node) ? 1 : 1 + Math.max(...node.children.map(heightOf)));

export function leafIdsBelow(node: CbsTreeNode): string[] {
  const ids: string[] = [];
  walkCbs([node], (item) => {
    if (isCbsLeaf(item)) ids.push(item.id);
  });
  return ids;
}

const priced = (node: CbsTreeNode) => ({ pricingMode: node.pricing, estimatedQuantity: node.qty, unitRate: node.rate, lumpSumAmount: node.lump });

/** بودجهٔ قلم: برگ از شیوهٔ قیمت؛ والد جمع فرزندان (cbs.md ۴.۳). */
export function budgetOf(node: CbsTreeNode): bigint {
  return isCbsLeaf(node) ? cbsLeafBudget(priced(node)) : node.children.reduce((sum, child) => sum + budgetOf(child), 0n);
}

export interface Allocation {
  readonly allocated: bigint;
  readonly linkCount: number;
}

/** تخصیص هر برگ CBS از اتصال‌ها (cbs.md ۵.۲). */
export function allocationsOf(forest: readonly CbsTreeNode[], links: readonly LinkNode[]): Map<string, Allocation> {
  const leaves = new Map<string, CbsTreeNode>();
  walkCbs(forest, (node) => {
    if (isCbsLeaf(node)) leaves.set(node.id, node);
  });
  const result = new Map<string, Allocation>();
  for (const link of links) {
    const leaf = leaves.get(link.cbsItemId);
    if (!leaf) continue;
    const before = result.get(leaf.id) ?? { allocated: 0n, linkCount: 0 };
    result.set(leaf.id, { allocated: before.allocated + linkSubBudget(priced(leaf), link), linkCount: before.linkCount + 1 });
  }
  return result;
}

/** «۱٬۲۰۰٬۰۰۰ ریال» برای پیام‌ها. */
export function faRial(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${negative ? '−' : ''}${digits.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)} ریال`;
}

export function faNum(value: number | string): string {
  return String(value)
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)
    .replace('.', '٫');
}
