import { addDays } from '../../../../platform/scheduler/ticks.js';
import { earnedSchedule, itemStatus, type ItemStatus, leafForecastDays } from './evm.js';
import { approvedQuantity, leafPercent, plannedLeafPercent, type ProgressEntry, type ReportMethod } from './progress.js';
import { scheduleSpan, type WorkCalendar } from './schedule.js';

// موتور پیشرفت پروژه در یک تاریخ (progress-calculation.md ۵.۲–۵.۶؛ D03، D04؛ OD-18). تابع خالص روی واقعیت‌های بارشده:
//   • ساختار، وزن، تاریخ و BAC رسمی از نسخهٔ مرجع PV؛ برگ حذف‌شده با آخرین پیشرفتش در تجمیع می‌ماند.
//   • شکل اندازه‌گیری برگ (روش، مقدار کل، گام‌ها) و تاریخ برگ زمانی از نسخهٔ جاری (D03-الف؛ تصمیم 1405/08/23).
//   • برگ افزوده پس از مرجع «کار خارج از مبنا»: جدا با BAC جاری.
// درصدها با دقت کامل؛ مبالغ به ریال اعشاری تا لحظهٔ ذخیره (گرد نیمه به بالا در `rial`).

export type Method = ReportMethod | 'time_based';

export interface ModelNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  /** درصد وزن در والد (نسخهٔ مرجع). */
  readonly weight: number;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  /** BAC برگ (ریال). */
  readonly bac: bigint;
}

export interface LeafShape {
  readonly method: Method | null;
  readonly totalQuantity: number | null;
  readonly steps: readonly { readonly key: string; readonly weight: number }[] | null;
  readonly isMilestone: boolean;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
}

export interface ApprovedEntry extends ProgressEntry {
  readonly wbsItemId: string;
  readonly approvedAt: string | null;
}

export interface ProgressModel {
  readonly reference: readonly ModelNode[];
  /** شکل برگ‌های نسخهٔ جاری (و برگ حذف‌شده: همان شکل مرجع). */
  readonly shapes: ReadonlyMap<string, LeafShape>;
  /** برگ‌های جاری بیرون از مرجع با BAC جاری (OD-18). */
  readonly outOfReference: readonly { readonly id: string; readonly bac: bigint }[];
  /** به ترتیب workDate و زمان ثبت. */
  readonly approved: ReadonlyMap<string, readonly ApprovedEntry[]>;
  readonly calendar: WorkCalendar;
}

export interface ItemState {
  readonly planned: number;
  readonly actual: number;
  readonly actualQuantity: number | null;
  readonly overTotalQuantity: boolean;
  readonly bac: number;
  readonly pv: number;
  readonly ev: number;
}

export interface ProjectState {
  readonly items: ReadonlyMap<string, ItemState>;
  readonly planned: number;
  readonly actual: number;
  readonly bac: number;
  readonly pv: number;
  readonly ev: number;
  readonly outOfReference: { readonly count: number; readonly currentBac: number; readonly earnedValue: number };
}

/** مبلغ نهایی به ریال صحیح، گرد نیمه به بالا (C02). */
export const rial = (value: number): bigint => BigInt(Math.floor(value + 0.5 + 1e-9));

function childrenOf(nodes: readonly ModelNode[]): Map<string | null, ModelNode[]> {
  const children = new Map<string | null, ModelNode[]>();
  for (const node of nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  return children;
}

/** پیشرفت واقعی برگ در تاریخ t (۵.۲): فقط آیتم‌های تأییدشده با workDate ≤ t؛ زمانی = برنامهٔ جاری. */
export function leafActualAt(shape: LeafShape | undefined, entries: readonly ApprovedEntry[], date: string, calendar: WorkCalendar) {
  if (!shape?.method) return { actual: 0, quantity: null, over: false };
  if (shape.method === 'time_based') {
    return {
      actual: plannedLeafPercent({ start: shape.plannedStart, finish: shape.plannedFinish, isMilestone: shape.isMilestone }, date, calendar),
      quantity: null,
      over: false,
    };
  }
  const upTo = entries.filter((entry) => entry.workDate <= date);
  const actual = leafPercent({ method: shape.method, totalQuantity: shape.totalQuantity, steps: shape.steps }, upTo);
  if (shape.method !== 'quantity') return { actual, quantity: null, over: false };
  const quantity = approvedQuantity(upTo);
  return { actual, quantity, over: shape.totalQuantity !== null && quantity > shape.totalQuantity };
}

export function stateAt(model: ProgressModel, date: string): ProjectState {
  const items = new Map<string, ItemState>();
  const children = childrenOf(model.reference);
  const visit = (node: ModelNode): ItemState => {
    if (node.isLeaf) {
      const planned = plannedLeafPercent({ start: node.plannedStart, finish: node.plannedFinish, isMilestone: node.isMilestone }, date, model.calendar);
      const shape = model.shapes.get(node.id);
      const leaf = leafActualAt(shape, model.approved.get(node.id) ?? [], date, model.calendar);
      const bac = Number(node.bac);
      const state = {
        planned,
        actual: leaf.actual,
        actualQuantity: leaf.quantity,
        overTotalQuantity: leaf.over,
        bac,
        pv: (bac * planned) / 100,
        ev: (bac * leaf.actual) / 100,
      };
      items.set(node.id, state);
      return state;
    }
    let planned = 0;
    let actual = 0;
    let bac = 0;
    let pv = 0;
    let ev = 0;
    for (const child of children.get(node.id) ?? []) {
      const value = visit(child);
      planned += (value.planned * child.weight) / 100;
      actual += (value.actual * child.weight) / 100;
      bac += value.bac;
      pv += value.pv;
      ev += value.ev;
    }
    const state = { planned, actual, actualQuantity: null, overTotalQuantity: false, bac, pv, ev };
    items.set(node.id, state);
    return state;
  };
  let planned = 0;
  let actual = 0;
  let bac = 0;
  let pv = 0;
  let ev = 0;
  for (const root of children.get(null) ?? []) {
    const value = visit(root);
    planned += (value.planned * root.weight) / 100;
    actual += (value.actual * root.weight) / 100;
    bac += value.bac;
    pv += value.pv;
    ev += value.ev;
  }
  const outside = { count: 0, currentBac: 0, earnedValue: 0 };
  for (const leaf of model.outOfReference) {
    const value = leafActualAt(model.shapes.get(leaf.id), model.approved.get(leaf.id) ?? [], date, model.calendar);
    outside.count += 1;
    outside.currentBac += Number(leaf.bac);
    outside.earnedValue += (Number(leaf.bac) * value.actual) / 100;
  }
  return { items, planned, actual, bac, pv, ev, outOfReference: outside };
}

/** وضعیت هر آیتم با آستانه‌های پروژه (۵.۵). */
export function statusesOf(state: ProjectState, thresholds: { readonly warning: number; readonly critical: number }): Map<string, ItemStatus> {
  return new Map([...state.items].map(([id, item]) => [id, itemStatus(item.actual, item.planned, thresholds)]));
}

/** روزهای کاری پس از `from` تا `n` روز کاری (n ≥ 1) — تاریخ پایان پیش‌بینی. */
export function workDayAfter(from: string, n: number, calendar: WorkCalendar): string {
  let date = from;
  let remaining = n;
  for (let guard = 0; remaining > 0 && guard < 20_000; guard += 1) {
    date = addDays(date, 1);
    if ((scheduleSpan(date, date, calendar)?.workDays ?? 0) > 0) remaining -= 1;
  }
  return date;
}

const workDaysBetween = (start: string, finish: string, calendar: WorkCalendar): number =>
  finish < start ? 0 : (scheduleSpan(start, finish, calendar)?.workDays ?? 0);

/** شروع و پایان برنامه‌ای پروژه از برگ‌های نسخهٔ مرجع. */
export function planSpan(model: ProgressModel): { readonly start: string; readonly finish: string } | null {
  const leaves = model.reference.filter((node) => node.isLeaf && node.plannedStart && node.plannedFinish);
  if (leaves.length === 0) return null;
  return {
    start: leaves.reduce((min, node) => ((node.plannedStart as string) < min ? (node.plannedStart as string) : min), leaves[0]?.plannedStart as string),
    finish: leaves.reduce((max, node) => ((node.plannedFinish as string) > max ? (node.plannedFinish as string) : max), leaves[0]?.plannedFinish as string),
  };
}

/**
 * پیش‌بینی پایان پروژه با Earned Schedule (evm.md ۶؛ OD-07): منحنی PV روی روزهای کاری برنامه، ES با درون‌یابی، مدت ÷ SPI(t).
 * EV صفر یا پیش از شروع ← تهی.
 */
export function projectForecast(model: ProgressModel, ev: number, dataDate: string): { readonly forecastFinish: string; readonly delayDays: number } | null {
  const span = planSpan(model);
  if (!span || ev <= 0) return null;
  const workDays: string[] = [];
  for (let date = span.start; date <= span.finish; date = addDays(date, 1)) {
    if (workDaysBetween(date, date, model.calendar) > 0) workDays.push(date);
  }
  const leaves = model.reference.filter((node) => node.isLeaf);
  const pvAt = (date: string) =>
    leaves.reduce(
      (sum, node) =>
        sum +
        (Number(node.bac) * plannedLeafPercent({ start: node.plannedStart, finish: node.plannedFinish, isMilestone: node.isMilestone }, date, model.calendar)) /
          100,
      0,
    );
  const curve = [0, ...workDays.map(pvAt)];
  const at = workDaysBetween(span.start, dataDate, model.calendar);
  const es = earnedSchedule(curve, ev, at);
  if (!es) return null;
  const before = addDays(span.start, -1);
  return { forecastFinish: workDayAfter(before, Math.max(1, Math.round(es.forecastDuration + 1e-9)), model.calendar), delayDays: es.delayDays };
}

/** پیش‌بینی پایان برگ (evm.md ۶.۳). */
export function leafForecast(model: ProgressModel, leafId: string, dataDate: string): string | null {
  const shape = model.shapes.get(leafId);
  const entries = model.approved.get(leafId) ?? [];
  const now = leafActualAt(shape, entries, dataDate, model.calendar).actual;
  const done = entries.filter((entry) => entry.workDate <= dataDate);
  if (now >= 100) {
    const last = done.reduce<string | null>((max, entry) => (entry.approvedAt && (!max || entry.approvedAt > max) ? entry.approvedAt : max), null);
    return last ? last.slice(0, 10) : (done.at(-1)?.workDate ?? null);
  }
  if (shape?.method === 'time_based' || done.length === 0) return now > 0 ? null : (shape?.plannedFinish ?? null);
  const ago = addDays(dataDate, -14);
  const days = leafForecastDays({
    actualNow: now,
    actual14DaysAgo: leafActualAt(shape, entries, ago, model.calendar).actual,
    workDaysIn14: workDaysBetween(addDays(ago, 1), dataDate, model.calendar),
    workDaysSinceStart: workDaysBetween(done[0]?.workDate ?? dataDate, dataDate, model.calendar),
  });
  return days === null ? null : days === 0 ? dataDate : workDayAfter(dataDate, days, model.calendar);
}

/** والد: بزرگ‌ترین پیش‌بینی میان فرزندان تمام‌نشده (evm.md ۶.۳). */
export function parentForecasts(model: ProgressModel, leaves: ReadonlyMap<string, string | null>, state: ProjectState): Map<string, string | null> {
  const children = childrenOf(model.reference);
  const result = new Map<string, string | null>(leaves);
  const visit = (node: ModelNode): string | null => {
    if (node.isLeaf) return result.get(node.id) ?? null;
    let latest: string | null = null;
    for (const child of children.get(node.id) ?? []) {
      const value = visit(child);
      const active = (state.items.get(child.id)?.actual ?? 0) < 100;
      if (active && value && (!latest || value > latest)) latest = value;
    }
    result.set(node.id, latest);
    return latest;
  };
  for (const root of children.get(null) ?? []) visit(root);
  return result;
}

/** وزن هر آیتم در کل پروژه از وزن‌های مرجع (۴.۱ `weightInProject`). */
export function weightsInProject(model: ProgressModel): Map<string, number> {
  const byId = new Map(model.reference.map((node) => [node.id, node]));
  const cache = new Map<string, number>();
  const of = (node: ModelNode): number => {
    const known = cache.get(node.id);
    if (known !== undefined) return known;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const value = (node.weight / 100) * (parent ? of(parent) : 1);
    cache.set(node.id, value);
    return value;
  };
  return new Map(model.reference.map((node) => [node.id, of(node) * 100]));
}
