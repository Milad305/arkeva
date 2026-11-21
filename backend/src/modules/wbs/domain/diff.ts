import type { PlanNode } from '../../planning/index.js';
import { toUnits } from './tree.js';

// تفاوت نسخهٔ کاری با برنامهٔ جاری (plan-versions.md ۵.۲ و ۹). تطبیق با شناسهٔ پایدار آیتم.

export const FIELD_LABELS: Record<string, string> = {
  title: 'عنوان',
  code: 'کد',
  weight: 'وزن',
  unit: 'واحد',
  qty: 'مقدار کل',
  start: 'شروع',
  finish: 'پایان',
  method: 'روش اندازه‌گیری',
  steps: 'گام‌ها',
  milestone: 'نقطهٔ عطف',
};

export interface PlanDiff {
  readonly added: ReadonlySet<string>;
  readonly removed: readonly PlanNode[];
  readonly moved: ReadonlySet<string>;
  readonly changed: ReadonlyMap<string, readonly string[]>;
  /** حذف یک شاخه یک تغییر است، نه به شمار نوادگانش. */
  readonly count: number;
}

function fieldsOf(node: PlanNode): Record<string, unknown> {
  const quantity = node.totalQuantity === null ? null : Number(node.totalQuantity);
  return {
    title: node.title,
    weight: toUnits(node.weightInParent),
    unit: node.unit,
    qty: quantity,
    // تاریخ والد مشتق است و تغییر جدا حساب نمی‌شود
    start: node.isLeaf ? node.plannedStart : null,
    finish: node.isLeaf ? node.plannedFinish : null,
    method: node.measurementMethod,
    steps: JSON.stringify(node.steps ?? null),
    milestone: node.isMilestone,
  };
}

export function diffPlans(current: readonly PlanNode[], draft: readonly PlanNode[]): PlanDiff {
  const before = new Map(current.map((node) => [node.id, node]));
  const after = new Map(draft.map((node) => [node.id, node]));
  const added = new Set<string>();
  const moved = new Set<string>();
  const changed = new Map<string, string[]>();
  for (const [id, node] of after) {
    const old = before.get(id);
    if (!old) {
      added.add(id);
      continue;
    }
    if (old.parentId !== node.parentId) moved.add(id);
    const now = fieldsOf(node);
    const then = fieldsOf(old);
    const fields = Object.keys(now).filter((key) => now[key] !== then[key]);
    // کد خودکار با جابه‌جایی عوض می‌شود؛ فقط کد دستی تغییر است
    if (node.codeMode === 'custom' && node.code !== old.code) fields.push('code');
    if (fields.length > 0) changed.set(id, fields);
  }
  const removed = current.filter((node) => !after.has(node.id));
  const removedTop = removed.filter((node) => !node.parentId || after.has(node.parentId) || !before.has(node.parentId));
  return { added, removed, moved, changed, count: added.size + removedTop.length + moved.size + changed.size };
}

/** پایان برنامه‌ای پروژه از ریشه‌ها. */
export function rootSpan(nodes: readonly PlanNode[]): { start: string | null; finish: string | null } {
  let start: string | null = null;
  let finish: string | null = null;
  for (const node of nodes) {
    if (node.parentId !== null) continue;
    if (node.plannedStart && (!start || node.plannedStart < start)) start = node.plannedStart;
    if (node.plannedFinish && (!finish || node.plannedFinish > finish)) finish = node.plannedFinish;
  }
  return { start, finish };
}
