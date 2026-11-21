// عملیات خالص روی درخت WBS — بدون React، بدون side effect.
// مطابق frontend-react.md بخش ۱۲.۴: منطق domain اینجا، نه در کامپوننت.

import type { WbsTreeNode, WbsStatus } from '../types';

// ────────── Traversal ──────────

export function findNode(tree: WbsTreeNode[], id: number): WbsTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children.length > 0) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function findNodeByCode(tree: WbsTreeNode[], code: string): WbsTreeNode | null {
  for (const n of tree) {
    if (n.code === code) return n;
    if (n.children.length > 0) {
      const f = findNodeByCode(n.children, code);
      if (f) return f;
    }
  }
  return null;
}

// همه نیاکان یک گره (از ریشه تا پدر مستقیم) — برای breadcrumb
export function getAncestors(tree: WbsTreeNode[], id: number): WbsTreeNode[] {
  const path: WbsTreeNode[] = [];
  function walk(nodes: WbsTreeNode[]): boolean {
    for (const n of nodes) {
      if (n.id === id) return true; // پیدا شد، نیاکان در path هستند
      if (n.children.length > 0) {
        path.push(n);
        const found = walk(n.children);
        if (found) return true;
        path.pop();
      }
    }
    return false;
  }
  walk(tree);
  return path;
}

// مسیر کامل: نیاکان + خود گره
export function getPath(tree: WbsTreeNode[], id: number): WbsTreeNode[] {
  const node = findNode(tree, id);
  if (!node) return [];
  return [...getAncestors(tree, id), node];
}

// همه فرزندان (بازگشتی)
export function getDescendants(node: WbsTreeNode): WbsTreeNode[] {
  const out: WbsTreeNode[] = [];
  for (const c of node.children) {
    out.push(c);
    out.push(...getDescendants(c));
  }
  return out;
}

// ────────── Flatten برای render جدول ──────────

export interface FlatNode {
  node: WbsTreeNode;
  depth: number; // 1-based
  visible: boolean; // آیا همه نیاکان expanded هستند
}

// flatten کامل درخت، با respect به expandedIds.
// visible: آیا گره باید نمایش داده شود (یعنی تمام نیاکانش expanded هستند)
export function flattenTree(
  tree: WbsTreeNode[],
  expandedIds: Record<number, boolean>,
): FlatNode[] {
  const out: FlatNode[] = [];

  function walk(nodes: WbsTreeNode[], depth: number, parentVisible: boolean): void {
    for (const n of nodes) {
      const visible = parentVisible;
      out.push({ node: n, depth, visible });
      if (n.children.length > 0) {
        // پیش‌فرض: اگه id در expandedIds نیست، expanded = true (مطابق طرح — همه parent‌ها expanded به‌جز 1.2.1, 1.3.1, 1.3.2, 1.4)
        const expanded = n.id in expandedIds ? expandedIds[n.id]! : true;
        walk(n.children, depth + 1, visible && expanded);
      }
    }
  }
  walk(tree, 1, true);
  return out;
}

// فقط گره‌های visible
export function flattenVisible(
  tree: WbsTreeNode[],
  expandedIds: Record<number, boolean>,
): FlatNode[] {
  return flattenTree(tree, expandedIds).filter((f) => f.visible);
}

// مجموعه id همه parent‌ها — برای expand all
export function getAllParentIds(tree: WbsTreeNode[]): number[] {
  const ids: number[] = [];
  function walk(nodes: WbsTreeNode[]) {
    for (const n of nodes) {
      if (!n.isLeaf) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  }
  walk(tree);
  return ids;
}

// ساخت expandedIds پیش‌فرض: همه parent‌ها به‌جز تعدادی collapse شده (مطابق طرح)
// در طرح، parent‌های 1.2.1, 1.3.1, 1.3.2, 1.4.x collapse بودن.
export function getDefaultExpandedIds(tree: WbsTreeNode[]): Record<number, boolean> {
  // همه parent‌ها را expanded بگذار، سپس تعدادی را collapse کن
  const allParents = getAllParentIds(tree);
  const map: Record<number, boolean> = {};
  for (const id of allParents) map[id] = true;

  // collapse parent‌هایی که code با الگوی زیر هم‌خوان هستند (مطابق طرح)
  function setCollapsedByCode(nodes: WbsTreeNode[]) {
    for (const n of nodes) {
      if (!n.isLeaf) {
        // در طرح: 1.2.1, 1.3.1, 1.3.2, 1.4, 1.4.1, 1.4.2 collapse بودن
        const collapsedCodes = ['1.2.1', '1.3.1', '1.3.2', '1.4', '1.4.1', '1.4.2'];
        if (collapsedCodes.includes(n.code)) {
          map[n.id] = false;
        }
        setCollapsedByCode(n.children);
      }
    }
  }
  setCollapsedByCode(tree);
  return map;
}

// ────────── محاسبات ──────────

// مجموع وزن فرزندان (parents فقط)
export function computeWeightSum(node: WbsTreeNode): number | null {
  if (node.isLeaf || node.children.length === 0) return null;
  return node.children.reduce((s, c) => s + c.weight, 0);
}

// پیشرفت واقعی parent = میانگین وزنی actual فرزندان
export function computeParentActual(node: WbsTreeNode): number {
  if (node.isLeaf) return node.actualProgress;
  if (node.children.length === 0) return 0;
  const totalWeight = node.children.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = node.children.reduce(
    (s, c) => s + (c.isLeaf ? c.actualProgress : computeParentActual(c)) * c.weight,
    0,
  );
  return Math.round(weighted / totalWeight);
}

// ────────── وضعیت (statusOf از WBS.html) ──────────

export function computeStatus(actual: number, planned: number): WbsStatus {
  if (actual >= 100) return 'done';
  if (actual === 0) return 'pending';
  const diff = actual - planned;
  if (diff >= -5) return 'progress';
  if (diff >= -15) return 'warn';
  return 'late';
}

// status برای یک گره
export function getNodeStatus(node: WbsTreeNode): WbsStatus {
  return computeStatus(node.actualProgress, node.plannedProgress);
}
