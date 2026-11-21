import type { PlanNode } from '../../planning/index.js';
import { shareUnits } from './build.js';
import type { AddedTask, ChangeField, ChangeKind } from './sync-diff.js';

// تغییرهای انتخاب‌شدهٔ همگام‌سازی ← WBS بازنگری (msp-integration.md ۷.۳ بند ۴ و ۵؛ AC-MS-07) — تابع خالص. آیتم تازه وزن
// ندارد؛ با `reweight` گروه‌های دست‌خورده دوباره پخش می‌شوند (آیتم تازه هم‌وزن میانگین هم‌گروه‌ها، جمع دقیقاً ۱۰۰). تاریخ
// والدها از فرزندان. Critical و شناوری فایل برای همهٔ آیتم‌های تطبیق‌یافته بی فهرست می‌آیند (مالک MSP).

export interface SelectedChange {
  readonly kind: ChangeKind;
  readonly wbsItemId: string | null;
  readonly field: ChangeField;
  readonly mspValue: unknown;
  readonly resolution: 'keep_projeyar' | 'accept_msp' | null;
}

export interface AppliedSync {
  readonly wbs: PlanNode[];
  readonly added: { readonly wbsItemId: string; readonly uid: number }[];
  readonly removed: string[];
  readonly appliedCount: number;
  readonly skipped: number;
}

const SCALE = 10_000;

export function applySync(input: {
  readonly current: readonly PlanNode[];
  readonly changes: readonly SelectedChange[];
  /** آیتم ← UID (تطبیق همین جلسه). */
  readonly uidOf: ReadonlyMap<string, number>;
  /** UID ← { critical, totalSlackDays } فایل. */
  readonly fileMeta: ReadonlyMap<number, { readonly critical: boolean; readonly totalSlackDays: number | null }>;
  readonly reweight: boolean;
  readonly newId: () => string;
}): AppliedSync {
  const nodes = new Map(input.current.map((node) => [node.id, { ...node }]));
  const itemByUid = new Map([...input.uidOf].map(([id, uid]) => [uid, id]));
  const touched = new Set<string | null>();
  const added: { wbsItemId: string; uid: number }[] = [];
  const removed: string[] = [];
  let applied = 0;
  let skipped = 0;
  const set = (id: string, patch: Partial<PlanNode>) => {
    const node = nodes.get(id);
    if (node) nodes.set(id, { ...node, ...patch });
  };

  for (const change of input.changes) {
    if (change.kind !== 'update' && change.kind !== 'conflict') continue;
    if (!change.wbsItemId || (change.kind === 'conflict' && change.resolution !== 'accept_msp')) continue;
    const value = change.mspValue;
    if (change.field === 'totalQuantity') set(change.wbsItemId, { totalQuantity: typeof value === 'number' ? String(value) : null });
    else if (
      change.field === 'title' ||
      change.field === 'code' ||
      change.field === 'unit' ||
      change.field === 'plannedStart' ||
      change.field === 'plannedFinish'
    ) {
      set(change.wbsItemId, { [change.field]: value as string, ...(change.field === 'code' ? { codeMode: 'custom' as const } : {}) });
    }
    applied += 1;
  }

  for (const change of input.changes.filter((entry) => entry.kind === 'delete' && entry.wbsItemId)) {
    const root = nodes.get(change.wbsItemId as string);
    if (!root) continue;
    touched.add(root.parentId);
    const drop = (id: string) => {
      const kids = [...nodes.values()].filter((node) => node.parentId === id);
      nodes.delete(id);
      removed.push(id);
      kids.forEach((kid) => drop(kid.id));
    };
    drop(root.id);
    applied += 1;
  }

  const lastOrder = (parentId: string | null) =>
    [...nodes.values()].filter((node) => node.parentId === parentId).reduce((max, node) => Math.max(max, node.sortOrder), -1);
  for (const change of input.changes.filter((entry) => entry.kind === 'move' && entry.wbsItemId)) {
    const value = change.mspValue as { parentUid: number | null };
    const parentId = value.parentUid === null ? null : (itemByUid.get(value.parentUid) ?? null);
    const node = nodes.get(change.wbsItemId as string);
    if (!node || (value.parentUid !== null && !parentId) || (parentId && !nodes.has(parentId))) {
      skipped += 1;
      continue;
    }
    touched.add(node.parentId);
    touched.add(parentId);
    set(node.id, { parentId, sortOrder: lastOrder(parentId) + 1 });
    applied += 1;
  }

  for (const change of input.changes.filter((entry) => entry.kind === 'add')) {
    const task = change.mspValue as AddedTask;
    const parentId = task.parentUid === null ? null : (itemByUid.get(task.parentUid) ?? null);
    if ((task.parentUid !== null && !parentId) || (parentId && !nodes.has(parentId))) {
      skipped += 1;
      continue;
    }
    const id = input.newId();
    nodes.set(id, {
      id,
      parentId,
      sortOrder: lastOrder(parentId) + 1,
      code: task.wbs,
      codeMode: 'custom',
      title: task.name,
      isLeaf: true,
      isMilestone: task.isMilestone,
      weightInParent: '0.0000',
      plannedStart: task.start,
      plannedFinish: task.finish,
      unit: null,
      totalQuantity: null,
      measurementMethod: 'percent',
      steps: null,
      isCritical: task.critical,
      totalFloatDays: null,
    });
    itemByUid.set(task.uid, id);
    added.push({ wbsItemId: id, uid: task.uid });
    touched.add(parentId);
    applied += 1;
  }

  for (const [id, uid] of [...input.uidOf, ...added.map((entry) => [entry.wbsItemId, entry.uid] as const)]) {
    const meta = input.fileMeta.get(uid);
    if (meta) set(id, { isCritical: meta.critical, totalFloatDays: meta.totalSlackDays === null ? null : String(meta.totalSlackDays) });
  }

  // برگ یا والد بودن از ساختار تازه؛ والد بی‌فرزند برگ درصدی می‌شود و برگِ والدشده روش و مقدارش را از دست می‌دهد
  const list = () => [...nodes.values()];
  const hasChildren = (id: string) => list().some((node) => node.parentId === id);
  for (const node of list()) {
    const leaf = !hasChildren(node.id);
    if (leaf && !node.isLeaf) set(node.id, { isLeaf: true, measurementMethod: 'percent' });
    if (!leaf && node.isLeaf) set(node.id, { isLeaf: false, isMilestone: false, measurementMethod: null, steps: null, unit: null, totalQuantity: null });
  }
  const span = (id: string): { start: string | null; finish: string | null } => {
    const node = nodes.get(id) as PlanNode;
    const kids = list().filter((entry) => entry.parentId === id);
    if (kids.length === 0) return { start: node.plannedStart, finish: node.plannedFinish };
    let start: string | null = null;
    let finish: string | null = null;
    for (const kid of kids) {
      const child = span(kid.id);
      if (child.start && (!start || child.start < start)) start = child.start;
      if (child.finish && (!finish || child.finish > finish)) finish = child.finish;
    }
    set(id, { plannedStart: start, plannedFinish: finish });
    return { start, finish };
  };
  for (const root of list().filter((node) => node.parentId === null)) span(root.id);

  if (input.reweight) {
    for (const parentId of touched) {
      if (parentId !== null && !nodes.has(parentId)) continue;
      const kids = list()
        .filter((node) => node.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const existing = kids.filter((node) => !node.isMilestone && Number(node.weightInParent) > 0);
      const average = existing.length > 0 ? existing.reduce((sum, node) => sum + Number(node.weightInParent), 0) / existing.length : 1;
      const basis = kids.map((node) => (node.isMilestone ? 0 : Number(node.weightInParent) > 0 ? Number(node.weightInParent) : average));
      const units = shareUnits(basis);
      kids.forEach((node, index) => set(node.id, { weightInParent: ((units[index] as number) / SCALE).toFixed(4) }));
    }
  }
  return { wbs: list(), added, removed, appliedCount: applied, skipped };
}
