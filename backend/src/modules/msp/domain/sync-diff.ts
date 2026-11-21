import type { PlanNode } from '../../planning/index.js';
import type { MspFile, MspTask } from './mspdi.js';

// مقایسهٔ فایل تازهٔ MSP با برنامهٔ جاری (msp-integration.md ۶، ۷.۳ بند ۲؛ AC-MS-06) — تابع خالص. کلید تطبیق UID (ExternalIdMap)؛
// پروژه‌ای که هنوز UID ندارد با کد WBS تطبیق می‌شود (`[پیش‌فرض فنی]` نخستین اتصال).
//   • MSP-مالک: تاریخ برگ‌ها و والد (move) ← update/move.
//   • مشترک (عنوان، کد، واحد، مقدار کل): فقط اگر MSP از آخرین همگام‌سازی عوض کرده؛ اگر پروژه‌یار هم عوض کرده ← conflict.
//   • UID تازه ← add؛ UID نگاشت‌شده‌ای که در فایل نیست ← delete (پیش‌فرض انتخاب‌نشده).
// وزن، روش، گام‌ها، اتصال CBS و سرپرست هرگز از MSP نمی‌آیند.

export type ChangeKind = 'add' | 'update' | 'delete' | 'move' | 'conflict';
export type ChangeField = 'title' | 'code' | 'unit' | 'totalQuantity' | 'plannedStart' | 'plannedFinish' | 'parent' | 'item';

export interface AddedTask {
  readonly uid: number;
  readonly wbs: string;
  readonly name: string;
  readonly start: string;
  readonly finish: string;
  readonly isMilestone: boolean;
  readonly durationDays: number;
  readonly parentUid: number | null;
  readonly critical: boolean;
}

export interface DiffChange {
  readonly kind: ChangeKind;
  readonly wbsItemId: string | null;
  readonly uid: number | null;
  readonly field: ChangeField;
  readonly projeyarValue: unknown;
  readonly mspValue: unknown;
  readonly selected: boolean;
  readonly hasApprovedReports: boolean;
  /** برای نمایش. */
  readonly code: string;
  readonly title: string;
}

export interface DiffInput {
  readonly current: readonly PlanNode[];
  /** آیتم ← UID. */
  readonly uidOf: ReadonlyMap<string, number>;
  readonly file: MspFile;
  /** فایل آخرین همگام‌سازی یا ورود؛ null ← نخستین مقایسه (تغییر MSP فرض می‌شود). */
  readonly lastFile: MspFile | null;
  /** برنامهٔ آخرین همگام‌سازی (عکس نسخه)؛ null ← تغییر پروژه‌یار فرض نمی‌شود. */
  readonly lastSynced: ReadonlyMap<string, PlanNode> | null;
  /** برگ‌های دارای آیتم تأییدشده (OD-04). */
  readonly approvedLeaves: ReadonlySet<string>;
}

const parentCode = (code: string) => (code.includes('.') ? code.split('.').slice(0, -1).join('.') : null);
const qty = (value: string | number | null | undefined) => (value === null || value === undefined ? null : Number(value));

export function activeTasks(file: MspFile): MspTask[] {
  return file.tasks.filter((task) => task.active && task.start && task.finish);
}

/** UID والد هر فعالیت فایل از روی کد WBS. */
export function parentUids(tasks: readonly MspTask[]): Map<number, number | null> {
  const byCode = new Map(tasks.map((task) => [task.wbs, task.uid]));
  return new Map(tasks.map((task) => [task.uid, byCode.get(parentCode(task.wbs) ?? '') ?? null]));
}

/** آیتم ← UID: از نگاشت ذخیره‌شده، یا با کد WBS اگر پروژه هنوز UID ندارد. */
export function matchItems(current: readonly PlanNode[], uidOf: ReadonlyMap<string, number>, tasks: readonly MspTask[]): Map<string, number> {
  if (uidOf.size > 0) return new Map(uidOf);
  const byCode = new Map(tasks.map((task) => [task.wbs, task.uid]));
  return new Map(current.flatMap((node) => (byCode.has(node.code) ? [[node.id, byCode.get(node.code) as number]] : [])));
}

export function diffFile(input: DiffInput): DiffChange[] {
  const tasks = activeTasks(input.file);
  const taskByUid = new Map(tasks.map((task) => [task.uid, task]));
  const lastByUid = new Map((input.lastFile ? activeTasks(input.lastFile) : []).map((task) => [task.uid, task]));
  const parents = parentUids(tasks);
  const matched = matchItems(input.current, input.uidOf, tasks);
  const itemByUid = new Map([...matched].map(([id, uid]) => [uid, id]));
  const byId = new Map(input.current.map((node) => [node.id, node]));
  const childrenOf = (id: string) => input.current.filter((node) => node.parentId === id);
  const hasApproved = (id: string): boolean => input.approvedLeaves.has(id) || childrenOf(id).some((child) => hasApproved(child.id));
  const changes: DiffChange[] = [];
  const push = (change: Omit<DiffChange, 'selected' | 'hasApprovedReports'> & Partial<DiffChange>) =>
    changes.push({ selected: change.kind !== 'delete', hasApprovedReports: false, ...change });

  for (const node of input.current) {
    const uid = matched.get(node.id);
    if (uid === undefined) continue;
    const task = taskByUid.get(uid);
    if (!task) {
      push({
        kind: 'delete',
        wbsItemId: node.id,
        uid,
        field: 'item',
        projeyarValue: node.title,
        mspValue: null,
        code: node.code,
        title: node.title,
        hasApprovedReports: hasApproved(node.id),
      });
      continue;
    }
    const last = lastByUid.get(uid);
    const synced = input.lastSynced?.get(node.id);
    const shared = (field: 'title' | 'code' | 'unit' | 'totalQuantity', current: unknown, incoming: unknown, previousMsp: unknown, previousOurs: unknown) => {
      if (incoming === null || incoming === undefined || current === incoming) return;
      const mspChanged = input.lastFile ? previousMsp !== incoming : true;
      if (!mspChanged) return;
      const ourChanged = synced ? previousOurs !== current : false;
      push({
        kind: ourChanged ? 'conflict' : 'update',
        wbsItemId: node.id,
        uid,
        field,
        projeyarValue: current,
        mspValue: incoming,
        code: node.code,
        title: node.title,
      });
    };
    shared('title', node.title, task.name, last?.name, synced?.title);
    shared('code', node.code, task.wbs, last?.wbs, synced?.code);
    if (node.isLeaf && !node.isMilestone) {
      shared('unit', node.unit, task.unit, last?.unit, synced?.unit);
      shared('totalQuantity', qty(node.totalQuantity), task.quantity, last?.quantity ?? null, qty(synced?.totalQuantity));
    }
    if (node.isLeaf) {
      const finish = task.isMilestone || task.durationDays === 0 ? task.start : task.finish;
      if (node.plannedStart !== task.start)
        push({
          kind: 'update',
          wbsItemId: node.id,
          uid,
          field: 'plannedStart',
          projeyarValue: node.plannedStart,
          mspValue: task.start,
          code: node.code,
          title: node.title,
        });
      if (node.plannedFinish !== finish)
        push({
          kind: 'update',
          wbsItemId: node.id,
          uid,
          field: 'plannedFinish',
          projeyarValue: node.plannedFinish,
          mspValue: finish,
          code: node.code,
          title: node.title,
        });
    }
    const parentUid = parents.get(uid) ?? null;
    const currentParentUid = node.parentId ? (matched.get(node.parentId) ?? null) : null;
    // والدِ ساخته‌شده در پروژه‌یار (بی UID) قابل مقایسه نیست
    const comparable = !node.parentId || currentParentUid !== null;
    if (comparable && parentUid !== currentParentUid) {
      const parentItem = parentUid !== null ? itemByUid.get(parentUid) : null;
      push({
        kind: 'move',
        wbsItemId: node.id,
        uid,
        field: 'parent',
        projeyarValue: node.parentId ? (byId.get(node.parentId)?.code ?? null) : null,
        mspValue: { parentUid, parentCode: parentUid !== null ? (taskByUid.get(parentUid)?.wbs ?? null) : null, parentItemId: parentItem ?? null },
        code: node.code,
        title: node.title,
      });
    }
  }

  const tasksInOrder = [...tasks].sort((a, b) => a.wbs.split('.').length - b.wbs.split('.').length || a.wbs.localeCompare(b.wbs, 'en', { numeric: true }));
  for (const task of tasksInOrder) {
    if (itemByUid.has(task.uid)) continue;
    const added: AddedTask = {
      uid: task.uid,
      wbs: task.wbs,
      name: task.name,
      start: task.start,
      finish: task.isMilestone || task.durationDays === 0 ? task.start : task.finish,
      isMilestone: task.isMilestone || (task.durationDays === 0 && !task.isSummary),
      durationDays: task.durationDays,
      parentUid: parents.get(task.uid) ?? null,
      critical: task.critical,
    };
    push({ kind: 'add', wbsItemId: null, uid: task.uid, field: 'item', projeyarValue: null, mspValue: added, code: task.wbs, title: task.name });
  }
  return changes.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
}
