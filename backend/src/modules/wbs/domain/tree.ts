import type { MeasurementMethod, PlanNode } from '../../planning/index.js';

// درخت WBS در حافظه (wbs.md ۵.۱–۵.۴). تابع خالص؛ بی پایگاه داده و ساعت. وزن‌ها عدد صحیح به واحد ۰٫۰۰۰۱
// (۱۰۰٪ = ۱٬۰۰۰٬۰۰۰) تا جمع‌ها دقیق باشند (D04، C04).

export const WEIGHT_SCALE = 10_000;
export const FULL = 100 * WEIGHT_SCALE;
export const MAX_DEPTH = 10;

export interface TreeStep {
  key: string;
  title: string;
  /** واحد ۰٫۰۰۰۱ */
  weight: number;
}

export interface TreeNode {
  id: string;
  code: string;
  codeMode: 'auto' | 'custom';
  title: string;
  isMilestone: boolean;
  /** واحد ۰٫۰۰۰۱ */
  weight: number;
  start: string | null;
  finish: string | null;
  unit: string | null;
  qty: number | null;
  method: MeasurementMethod | null;
  steps: TreeStep[] | null;
  isCritical: boolean | null;
  totalFloatDays: string | null;
  children: TreeNode[];
  /** درصد فعلی هر گام هنگام تبدیل برگ دارای پیشرفت به گام‌ها (V-05)؛ با گزارش کارگاه (برش ۹) معنا می‌گیرد. */
  stepsDone?: Record<string, number>;
}

export const toUnits = (percent: number | string): number => Math.round(Number(percent) * WEIGHT_SCALE);
export const toPercent = (units: number): number => units / WEIGHT_SCALE;
export const formatUnits = (units: number): string => (units / WEIGHT_SCALE).toFixed(4);
export const isLeaf = (node: TreeNode): boolean => node.children.length === 0;

/** فهرست تخت ← جنگل، به ترتیب `sortOrder`. والد ناموجود ← سطح اول (نباید رخ دهد). */
export function toForest(nodes: readonly PlanNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const node of nodes) {
    byId.set(node.id, {
      id: node.id,
      code: node.code,
      codeMode: node.codeMode,
      title: node.title,
      isMilestone: node.isMilestone,
      weight: toUnits(node.weightInParent),
      start: node.isLeaf ? node.plannedStart : null,
      finish: node.isLeaf ? node.plannedFinish : null,
      unit: node.unit,
      qty: node.totalQuantity === null ? null : Number(node.totalQuantity),
      method: node.measurementMethod,
      steps: node.steps ? node.steps.map((step) => ({ key: step.key, title: step.title, weight: toUnits(step.weight) })) : null,
      isCritical: node.isCritical,
      totalFloatDays: node.totalFloatDays,
      children: [],
    });
  }
  const roots: TreeNode[] = [];
  for (const node of [...nodes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const tree = byId.get(node.id) as TreeNode;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(tree);
  }
  return roots;
}

export function walk(forest: readonly TreeNode[], visit: (node: TreeNode, parent: TreeNode | null, index: number, depth: number) => void): void {
  const go = (nodes: readonly TreeNode[], parent: TreeNode | null, depth: number) =>
    nodes.forEach((node, index) => {
      visit(node, parent, index, depth);
      go(node.children, node, depth + 1);
    });
  go(forest, null, 1);
}

export interface Located {
  readonly node: TreeNode;
  readonly siblings: TreeNode[];
  readonly index: number;
  readonly parent: TreeNode | null;
}

export function locate(forest: TreeNode[], id: string): Located | null {
  const search = (nodes: TreeNode[], parent: TreeNode | null): Located | null => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index] as TreeNode;
      if (node.id === id) return { node, siblings: nodes, index, parent };
      const found = search(node.children, node);
      if (found) return found;
    }
    return null;
  };
  return search(forest, null);
}

/** کد خودکار = جایگاه؛ ریشهٔ ضمنی «1» خود پروژه است (`1.1`، `1.2.3`؛ wbs.md ۵.۲). کد دستی ثابت می‌ماند. */
export function renumber(forest: TreeNode[]): void {
  const go = (nodes: TreeNode[], prefix: string) =>
    nodes.forEach((node, index) => {
      if (node.codeMode !== 'custom') node.code = `${prefix}.${index + 1}`;
      go(node.children, node.code);
    });
  go(forest, '1');
}

/** تاریخ مشتق والد: کمترین شروع و بیشترین پایان فرزندان (wbs.md ۵.۴؛ AC-WBS-12). */
export function spanOf(node: TreeNode): { start: string | null; finish: string | null } {
  if (isLeaf(node)) return { start: node.start, finish: node.finish };
  let start: string | null = null;
  let finish: string | null = null;
  for (const child of node.children) {
    const span = spanOf(child);
    if (span.start && (!start || span.start < start)) start = span.start;
    if (span.finish && (!finish || span.finish > finish)) finish = span.finish;
  }
  return { start, finish };
}

/** جنگل ← فهرست تخت با `parentId`، `sortOrder`، برگ بودن و تاریخ مشتق والد. */
export function toNodes(forest: readonly TreeNode[]): PlanNode[] {
  const nodes: PlanNode[] = [];
  walk(forest, (node, parent, index) => {
    const leaf = isLeaf(node);
    const span = spanOf(node);
    nodes.push({
      id: node.id,
      parentId: parent?.id ?? null,
      sortOrder: index,
      code: node.code,
      codeMode: node.codeMode,
      title: node.title,
      isLeaf: leaf,
      isMilestone: leaf && node.isMilestone,
      weightInParent: formatUnits(node.weight),
      plannedStart: span.start,
      plannedFinish: span.finish,
      unit: leaf ? node.unit : null,
      totalQuantity: leaf && node.qty !== null ? node.qty.toFixed(4) : null,
      measurementMethod: leaf ? node.method : null,
      steps:
        leaf && node.method === 'steps' && node.steps ? node.steps.map((step) => ({ key: step.key, title: step.title, weight: toPercent(step.weight) })) : null,
      isCritical: node.isCritical,
      totalFloatDays: node.totalFloatDays,
    });
  });
  return nodes;
}

/**
 * وزن به نسبت مبنا با چهار رقم و گرد نیمه به بالا؛ باقی‌ماندهٔ گرد کردن به آخرین (D04؛ AC-WBS-02:
 * 35، 30، 30 ← 36.8421، 31.5789، 31.5790).
 */
export function distribute(children: TreeNode[], basis: readonly number[]): boolean {
  const total = basis.reduce((sum, value) => sum + value, 0);
  if (children.length === 0 || total <= 0) return false;
  let assigned = 0;
  children.forEach((child, index) => {
    if (index === children.length - 1) child.weight = FULL - assigned;
    else {
      child.weight = Math.floor(((basis[index] as number) / total) * FULL + 0.5);
      assigned += child.weight;
    }
  });
  return true;
}

/** «36.8421» ← «۳۶٫۸۴۲۱» برای پیام‌ها. */
export function faPercent(units: number): string {
  const text = String(Math.round(units) / WEIGHT_SCALE);
  return text.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string).replace('.', '٫');
}

export function faNumber(value: number | string): string {
  return String(value)
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)
    .replace('.', '٫');
}
