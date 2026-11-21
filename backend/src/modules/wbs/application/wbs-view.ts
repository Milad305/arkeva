import type { WbsItemProgressView } from '../../computation/reads.js';
import type { PersonRef } from '../../identity/index.js';
import type { CurrentItem, PlanNode } from '../../planning/index.js';
import { toUnits, WEIGHT_SCALE } from '../domain/tree.js';

// شکل خواندنی آیتم WBS (WbsItemDto فرانت؛ `frontend/src/modules/wbs/types`). همهٔ اعداد مشتق از سرور (D07).
// پیشرفت از جدول مشتق WbsItemProgress (F10)؛ نسخهٔ کاری و آیتم بی محاسبه `progress: null`.

export interface WbsItemView {
  readonly id: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly codeMode: 'auto' | 'custom';
  readonly title: string;
  readonly sortOrder: number;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  readonly weightInParent: number;
  readonly weightInProject: number;
  readonly plannedStart: string;
  readonly plannedFinish: string;
  readonly unit: string | null;
  readonly totalQuantity: number | null;
  readonly measurementMethod: string | null;
  readonly steps: { key: string; title: string; weight: number }[] | null;
  readonly supervisor: PersonRef | null;
  readonly statusNote: string | null;
  readonly isCritical: boolean | null;
  readonly totalFloatDays: number | null;
  readonly progress: WbsItemProgressView | null;
}

/** سهم هر آیتم در کل پروژه — حاصل‌ضرب وزن‌ها تا ریشه (۰۰ ۶.۱)، چهار رقم. */
export function weightsInProject(nodes: readonly PlanNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map<string, number>();
  const of = (node: PlanNode): number => {
    const cached = cache.get(node.id);
    if (cached !== undefined) return cached;
    const own = toUnits(node.weightInParent) / (100 * WEIGHT_SCALE);
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const value = parent ? of(parent) * own : own;
    cache.set(node.id, value);
    return value;
  };
  return new Map(nodes.map((node) => [node.id, Math.round(of(node) * 100 * WEIGHT_SCALE) / WEIGHT_SCALE]));
}

export function itemView(
  node: PlanNode,
  extra: {
    readonly weightInProject: number;
    readonly current: CurrentItem | undefined;
    readonly people: ReadonlyMap<string, PersonRef>;
    readonly progress?: WbsItemProgressView | null;
  },
): WbsItemView {
  const supervisorId = extra.current?.supervisorUserId ?? null;
  return {
    id: node.id,
    parentId: node.parentId,
    code: node.code,
    codeMode: node.codeMode,
    title: node.title,
    sortOrder: node.sortOrder,
    isLeaf: node.isLeaf,
    isMilestone: node.isMilestone,
    weightInParent: toUnits(node.weightInParent) / WEIGHT_SCALE,
    weightInProject: extra.weightInProject,
    plannedStart: node.plannedStart ?? '',
    plannedFinish: node.plannedFinish ?? '',
    unit: node.unit,
    totalQuantity: node.totalQuantity === null ? null : Number(node.totalQuantity),
    measurementMethod: node.measurementMethod,
    steps: node.steps ? node.steps.map((step) => ({ key: step.key, title: step.title, weight: step.weight })) : null,
    supervisor: supervisorId ? (extra.people.get(supervisorId) ?? null) : null,
    statusNote: extra.current?.statusNote ?? null,
    isCritical: node.isCritical,
    totalFloatDays: node.totalFloatDays === null ? null : Number(node.totalFloatDays),
    progress: extra.progress ?? null,
  };
}

/** درخت، جزئیات و همه‌جا: فهرست تخت به ترتیب پیمایش درخت (والد پیش از فرزند). */
export function treeOrder(nodes: readonly PlanNode[]): PlanNode[] {
  const children = new Map<string | null, PlanNode[]>();
  for (const node of nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  const known = new Set(nodes.map((node) => node.id));
  const ordered: PlanNode[] = [];
  const visit = (parentId: string | null) => {
    for (const node of (children.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
      ordered.push(node);
      visit(node.id);
    }
  };
  visit(null);
  // والد ناموجود (نباید رخ دهد) — بی‌سرپرست سطح اول
  for (const node of nodes) if (node.parentId && !known.has(node.parentId) && !ordered.includes(node)) ordered.push(node);
  return ordered;
}
