import { addDays } from '../../../platform/scheduler/ticks.js';
import { cbsLeafBudget, linkSubBudget } from './formulas/cbs.js';
import { cbsProgress, type CbsItemProgressFigures, type CbsProgressNode } from './formulas/cbs-progress.js';
import {
  leafActualAt,
  leafForecast,
  parentForecasts,
  planSpan,
  type ProgressModel,
  type ProjectState,
  projectForecast,
  rial,
  stateAt,
  statusesOf,
  weightsInProject,
} from './formulas/engine.js';
import { type EacMethod, evm, type EvmResult, itemStatus, type ItemStatus } from './formulas/evm.js';
import { plannedLeafPercent } from './formulas/progress.js';
import type { LeafCounts } from './progress.entities.js';

// یک اجرای کامل محاسبهٔ پروژه از واقعیت‌ها (progress-calculation.md ۵؛ D07 ۲ «از نو، نه افزایشی»). خروجی ردیف‌های جدول‌های
// مشتق؛ نوشتن با application/recompute-project. تابع خالص: همان ورودی، همان خروجی (AC-PC-09).

export interface ComputeInput {
  readonly model: ProgressModel;
  readonly dataDate: string;
  /** اولین روز snapshot که باید بازسازی شود؛ تهی = از شروع برنامه. */
  readonly fromDate: string | null;
  readonly thresholds: { readonly warning: number; readonly critical: number };
  readonly eacMethod: EacMethod;
  readonly costsCompleteThrough: string | null;
  readonly currentCbs: readonly CbsProgressNode[];
  readonly currentLinks: readonly { readonly cbsItemId: string; readonly quantity: string | null; readonly allocatedAmount: string | null }[];
  readonly referenceCbs: readonly CbsProgressNode[];
  readonly referenceLinks: readonly {
    readonly wbsItemId: string;
    readonly cbsItemId: string;
    readonly quantity: string | null;
    readonly allocatedAmount: string | null;
  }[];
  readonly costs: readonly { readonly cbsItemId: string; readonly costDate: string; readonly amount: bigint; readonly quantity: number | null }[];
  readonly pendingPercent: ReadonlyMap<string, number>;
  readonly lastApprovedAt: ReadonlyMap<string, string>;
}

export interface ItemRow {
  readonly wbsItemId: string;
  readonly plannedPercent: number;
  readonly actualPercent: number;
  readonly actualQuantity: number | null;
  readonly pendingPercent: number | null;
  readonly deviation: number;
  readonly status: ItemStatus;
  readonly bac: bigint;
  readonly pv: bigint;
  readonly ev: bigint;
  readonly forecastFinish: string | null;
  readonly lastApprovedAt: string | null;
  readonly inReference: boolean;
  readonly weightInProject: number;
  readonly overTotalQuantity: boolean;
}

export interface ProjectRow extends Omit<EvmResult, 'eacRemaining' | 'eacComposite' | 'tcpiEac' | 'lowConfidence'> {
  readonly plannedPercent: number;
  readonly actualPercent: number;
  readonly financialPercent: number;
  readonly bac: bigint;
  readonly pv: bigint;
  readonly ev: bigint;
  readonly ac: bigint;
  readonly eacLowConfidence: boolean;
  readonly forecastFinish: string | null;
  readonly delayDays: number | null;
  readonly costIndicesDate: string;
  readonly unallocatedBudget: bigint;
  readonly leafCounts: LeafCounts;
  readonly outOfReference: { readonly count: number; readonly currentBac: string; readonly earnedValue: string };
}

export interface SnapshotDay {
  readonly date: string;
  readonly items: readonly Omit<ItemRow, 'pendingPercent' | 'forecastFinish' | 'lastApprovedAt' | 'weightInProject' | 'overTotalQuantity'>[];
  readonly project: Pick<
    ProjectRow,
    'plannedPercent' | 'actualPercent' | 'financialPercent' | 'bac' | 'pv' | 'ev' | 'ac' | 'eac' | 'cpi' | 'spi' | 'costIndicesDate'
  >;
}

export interface ComputeOutput {
  readonly items: readonly ItemRow[];
  readonly project: ProjectRow;
  readonly cbs: ReadonlyMap<string, CbsItemProgressFigures>;
  readonly snapshots: readonly SnapshotDay[];
}

/** t_c = min(t، تاریخ کامل بودن هزینه‌ها) (OD-19)؛ بی اعلام ← t (تصمیم 1405/08/23). */
export const costIndicesDateOf = (date: string, costsCompleteThrough: string | null): string =>
  costsCompleteThrough && costsCompleteThrough < date ? costsCompleteThrough : date;

export function computeProject(input: ComputeInput): ComputeOutput {
  const { model, dataDate } = input;
  const cache = new Map<string, ProjectState>();
  const at = (date: string): ProjectState => {
    const known = cache.get(date);
    if (known) return known;
    const state = stateAt(model, date);
    cache.set(date, state);
    return state;
  };
  const acThrough = (date: string) => input.costs.reduce((sum, row) => (row.costDate <= date ? sum + row.amount : sum), 0n);
  const indices = (date: string) => {
    const tc = costIndicesDateOf(date, input.costsCompleteThrough);
    const state = at(date);
    const result = evm({ bac: rial(state.bac), pv: rial(state.pv), ev: rial(state.ev), evAtCost: rial(at(tc).ev), ac: acThrough(tc), method: input.eacMethod });
    return { tc, state, result, ac: acThrough(tc) };
  };

  const now = indices(dataDate);
  const statuses = statusesOf(now.state, input.thresholds);
  const weights = weightsInProject(model);
  const leafForecasts = new Map<string, string | null>();
  for (const node of model.reference) if (node.isLeaf) leafForecasts.set(node.id, leafForecast(model, node.id, dataDate));
  const forecasts = parentForecasts(model, leafForecasts, now.state);

  const items: ItemRow[] = [];
  for (const node of model.reference) {
    const item = now.state.items.get(node.id);
    if (!item) continue;
    items.push({
      wbsItemId: node.id,
      plannedPercent: item.planned,
      actualPercent: item.actual,
      actualQuantity: item.actualQuantity,
      pendingPercent: input.pendingPercent.get(node.id) ?? null,
      deviation: item.actual - item.planned,
      status: statuses.get(node.id) ?? 'not_started',
      bac: rial(item.bac),
      pv: rial(item.pv),
      ev: rial(item.ev),
      forecastFinish: forecasts.get(node.id) ?? null,
      lastApprovedAt: input.lastApprovedAt.get(node.id) ?? null,
      inReference: true,
      weightInProject: weights.get(node.id) ?? 0,
      overTotalQuantity: item.overTotalQuantity,
    });
  }
  items.push(...outOfReferenceRows(input));

  const leafCounts: Record<keyof LeafCounts, number> = { total: 0, not_started: 0, on_track: 0, ahead: 0, warning: 0, critical: 0, completed: 0 };
  for (const node of model.reference) {
    if (!node.isLeaf) continue;
    leafCounts.total += 1;
    leafCounts[statuses.get(node.id) ?? 'not_started'] += 1;
  }
  const forecast = projectForecast(model, now.state.ev, dataDate);
  const budget = input.currentCbs.filter((item) => item.isLeaf).reduce((sum, item) => sum + cbsLeafBudget(item), 0n);
  const currentById = new Map(input.currentCbs.map((item) => [item.id, item]));
  const allocated = input.currentLinks.reduce((sum, link) => {
    const item = currentById.get(link.cbsItemId);
    return item ? sum + linkSubBudget(item, link) : sum;
  }, 0n);

  const project: ProjectRow = {
    plannedPercent: now.state.planned,
    actualPercent: now.state.actual,
    financialPercent: now.state.bac > 0 ? (now.state.ev * 100) / now.state.bac : 0,
    bac: rial(now.state.bac),
    pv: rial(now.state.pv),
    ev: rial(now.state.ev),
    ac: now.ac,
    cv: now.result.cv,
    sv: now.result.sv,
    cpi: now.result.cpi,
    spi: now.result.spi,
    eac: now.result.eac,
    vac: now.result.vac,
    tcpi: now.result.tcpi,
    eacLowConfidence: now.result.lowConfidence,
    forecastFinish: forecast?.forecastFinish ?? null,
    delayDays: forecast?.delayDays ?? null,
    costIndicesDate: now.tc,
    unallocatedBudget: budget - allocated,
    leafCounts,
    outOfReference: {
      count: now.state.outOfReference.count,
      currentBac: rial(now.state.outOfReference.currentBac).toString(),
      earnedValue: rial(now.state.outOfReference.earnedValue).toString(),
    },
  };

  const tcState = at(now.tc);
  const cbs = cbsProgress({
    items: input.currentCbs,
    referenceItems: input.referenceCbs,
    referenceLinks: input.referenceLinks,
    leafActual: new Map([...tcState.items].map(([id, item]) => [id, item.actual])),
    costs: input.costs.filter((row) => row.costDate <= now.tc),
  });

  return { items, project, cbs, snapshots: snapshotDays(input, indices) };
}

/** برگ‌های کار خارج از مبنا (OD-18): با تاریخ و BAC نسخهٔ جاری، بیرون از تجمیع رسمی. */
function outOfReferenceRows(input: ComputeInput): ItemRow[] {
  const { model, dataDate } = input;
  return model.outOfReference.map((leaf) => {
    const shape = model.shapes.get(leaf.id);
    const planned = plannedLeafPercent(
      { start: shape?.plannedStart ?? null, finish: shape?.plannedFinish ?? null, isMilestone: shape?.isMilestone ?? false },
      dataDate,
      model.calendar,
    );
    const actual = leafActualAt(shape, model.approved.get(leaf.id) ?? [], dataDate, model.calendar);
    const bac = Number(leaf.bac);
    return {
      wbsItemId: leaf.id,
      plannedPercent: planned,
      actualPercent: actual.actual,
      actualQuantity: actual.quantity,
      pendingPercent: input.pendingPercent.get(leaf.id) ?? null,
      deviation: actual.actual - planned,
      status: itemStatus(actual.actual, planned, input.thresholds),
      bac: leaf.bac,
      pv: rial((bac * planned) / 100),
      ev: rial((bac * actual.actual) / 100),
      forecastFinish: leafForecast(model, leaf.id, dataDate),
      lastApprovedAt: input.lastApprovedAt.get(leaf.id) ?? null,
      inReference: false,
      weightInProject: 0,
      overTotalQuantity: actual.over,
    };
  });
}

/** snapshot روزهای fromDate تا تاریخ داده (۵.۷)؛ پیش از شروع برنامه چیزی نیست. */
function snapshotDays(input: ComputeInput, indices: (date: string) => { tc: string; state: ProjectState; result: EvmResult; ac: bigint }): SnapshotDay[] {
  const span = planSpan(input.model);
  if (!span) return [];
  const from = input.fromDate && input.fromDate > span.start ? input.fromDate : span.start;
  const days: SnapshotDay[] = [];
  for (let date = from; date <= input.dataDate; date = addDays(date, 1)) {
    const { tc, state, result, ac } = indices(date);
    const statuses = statusesOf(state, input.thresholds);
    days.push({
      date,
      items: input.model.reference.flatMap((node) => {
        const item = state.items.get(node.id);
        if (!item) return [];
        return [
          {
            wbsItemId: node.id,
            plannedPercent: item.planned,
            actualPercent: item.actual,
            actualQuantity: item.actualQuantity,
            deviation: item.actual - item.planned,
            status: statuses.get(node.id) ?? 'not_started',
            bac: rial(item.bac),
            pv: rial(item.pv),
            ev: rial(item.ev),
            inReference: true,
          },
        ];
      }),
      project: {
        plannedPercent: state.planned,
        actualPercent: state.actual,
        financialPercent: state.bac > 0 ? (state.ev * 100) / state.bac : 0,
        bac: rial(state.bac),
        pv: rial(state.pv),
        ev: rial(state.ev),
        ac,
        eac: result.eac,
        cpi: result.cpi,
        spi: result.spi,
        costIndicesDate: tc,
      },
    });
  }
  return days;
}
