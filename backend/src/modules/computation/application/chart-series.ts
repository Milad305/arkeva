import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { addDays } from '../../../platform/scheduler/ticks.js';
import { ProjectPlanAccess, ProjectRules } from '../../projects/index.js';
import { ProjectDailySnapshot } from '../domain/progress.entities.js';
import { type ChartRange, chartRange, type ChartRangePreset, monthEnds, monthStarts } from '../domain/formulas/chart-range.js';
import { type CurveRow, forecastSeries } from '../domain/formulas/curve.js';
import { rial } from '../domain/formulas/engine.js';
import { PlanCurves } from './plan-curves.js';
import { ProgressReads, type ProjectProgressView } from './progress-reads.js';

// سری‌های W21 و W22 (charts.md ۶.۳، ۶.۴) فقط از مقادیر ذخیره‌شده: PlanVersionCurve مبنا و مرجع، ProjectDailySnapshot و پیش‌بینی
// Earned Schedule. AC فقط تا `t_c` (OD-19)؛ نرخ مصرف پیش‌بینی ۴ ماه = ΔEV پیش‌بینی ÷ CPI `[تأییدشده]`.

const SAMPLE_POINTS = 40;
const BURN_FORECAST_DAYS = 125;

interface Snapshot {
  readonly date: string;
  readonly actual: number;
  readonly pv: bigint;
  readonly ev: bigint;
  readonly ac: bigint;
}

export interface ProgressSeries {
  readonly range: ChartRange;
  readonly start: string;
  readonly last: string;
  readonly hasRevision: boolean;
  readonly curve: { date: string; baseline: number | null; revised: number | null; actual: number | null; forecast: number | null }[];
  readonly months: { date: string; pv: string | null; ev: string | null; ac: string | null }[];
}

const round = (value: number) => Math.round(value * 100) / 100;

function plannedAt(rows: readonly CurveRow[], byDate: ReadonlyMap<string, CurveRow>, date: string, key: 'planned' | 'pv'): number {
  const first = rows[0];
  const last = rows.at(-1);
  if (!first || !last) return 0;
  if (date < first.date) return 0;
  if (date > last.date) return key === 'planned' ? 100 : last.pv;
  return byDate.get(date)?.[key] ?? 0;
}

/** آخرین مقدار تا `date` (snapshot روزانه پیوسته نیست). */
function carry<T extends { date: string }>(points: readonly T[], date: string): T | null {
  let found: T | null = null;
  for (const point of points) {
    if (point.date > date) break;
    found = point;
  }
  return found;
}

@Injectable()
export class ChartSeries {
  constructor(
    private readonly em: EntityManager,
    private readonly rules: ProjectRules,
    private readonly plans: ProjectPlanAccess,
    private readonly progress: ProgressReads,
    private readonly curves: PlanCurves,
  ) {}

  private async context(projectId: string) {
    const [rules, plan, progress] = await Promise.all([this.rules.of(projectId), this.plans.context(projectId), this.progress.project(projectId)]);
    const referenceId = rules.progress.pvReferenceVersionId;
    const baselineId = plan.baselineVersionId ?? referenceId;
    const reference = referenceId ? await this.curves.rows(projectId, referenceId) : [];
    const baseline = baselineId && baselineId !== referenceId ? await this.curves.rows(projectId, baselineId) : reference;
    const dataDate = progress?.dataDate ?? reference[0]?.date ?? '';
    const snapshots: Snapshot[] = (
      await this.em.find(
        ProjectDailySnapshot,
        { projectId, date: { $lte: dataDate } },
        { fields: ['date', 'actualPercent', 'pv', 'ev', 'ac'], orderBy: { date: 'asc' } },
      )
    ).map((row) => ({ date: row.date, actual: Number(row.actualPercent), pv: BigInt(row.pv), ev: BigInt(row.ev), ac: BigInt(row.ac) }));
    if (progress && snapshots.at(-1)?.date !== dataDate) {
      snapshots.push({ date: dataDate, actual: progress.actualPercent, pv: BigInt(progress.pv), ev: BigInt(progress.ev), ac: BigInt(progress.ac) });
    }
    const forecast =
      progress && progress.actualPercent < 100 ? forecastSeries(reference, rules.calendar, Number(progress.ev), progress.actualPercent, dataDate) : [];
    const start = (baseline[0] ?? reference[0])?.date ?? dataDate;
    const ends = [baseline.at(-1)?.date, reference.at(-1)?.date, progress?.forecastFinish ?? undefined].filter((value): value is string => !!value).sort();
    return { rules, progress, referenceId, baselineId, reference, baseline, snapshots, forecast, dataDate, start, last: ends.at(-1) ?? dataDate };
  }

  /** W21: منحنی S چهارخطی و EVM ماهانه. */
  async progressSeries(projectId: string, preset: ChartRangePreset): Promise<ProgressSeries & { progress: ProjectProgressView | null }> {
    const ctx = await this.context(projectId);
    const range = chartRange(preset, ctx.start, ctx.last, ctx.dataDate);
    const hasRevision = !!ctx.referenceId && ctx.referenceId !== ctx.baselineId;
    const referenceBy = new Map(ctx.reference.map((row) => [row.date, row]));
    const baselineBy = new Map(ctx.baseline.map((row) => [row.date, row]));
    const forecast = ctx.forecast;
    const forecastEnd = forecast.at(-1)?.date;
    const span = Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000));
    const dates = new Set<string>();
    for (let index = 0; index <= SAMPLE_POINTS; index += 1) dates.add(addDays(range.from, Math.round((span * index) / SAMPLE_POINTS)));
    if (ctx.dataDate >= range.from && ctx.dataDate <= range.to) dates.add(ctx.dataDate);
    const curve = [...dates].sort().map((date) => {
      const actual = date <= ctx.dataDate ? carry(ctx.snapshots, date) : null;
      const projected =
        date >= ctx.dataDate && forecast.length > 0 ? (forecastEnd && date >= forecastEnd ? 100 : (carry(forecast, date)?.percent ?? null)) : null;
      return {
        date,
        baseline: ctx.baseline.length > 0 ? round(plannedAt(ctx.baseline, baselineBy, date, 'planned')) : null,
        revised: hasRevision ? round(plannedAt(ctx.reference, referenceBy, date, 'planned')) : null,
        actual: actual ? round(actual.actual) : null,
        forecast: projected === null ? null : round(projected),
      };
    });
    const tc = ctx.progress?.costIndicesDate ?? ctx.dataDate;
    const months = monthEnds(range.from, range.to)
      .filter((date) => date <= ctx.dataDate || preset === 'all')
      .map((date) => {
        const snapshot = date <= ctx.dataDate ? carry(ctx.snapshots, date) : null;
        const tcSnapshot = date <= tc ? carry(ctx.snapshots, date) : null;
        return {
          date,
          pv: ctx.reference.length > 0 ? rial(plannedAt(ctx.reference, referenceBy, date, 'pv')).toString() : null,
          ev: snapshot ? snapshot.ev.toString() : null,
          ac: tcSnapshot ? tcSnapshot.ac.toString() : null,
        };
      });
    return { range, start: ctx.start, last: ctx.last, hasRevision, curve, months, progress: ctx.progress };
  }

  /** W22: نرخ مصرف ماهانه — برنامه‌ای ΔPV، واقعی Σ هزینهٔ قطعی به تاریخ هزینه تا `t_c`، پیش‌بینی ۴ ماه. */
  async burn(projectId: string, preset: ChartRangePreset, costs: readonly { readonly costDate: string; readonly amount: bigint }[]) {
    const ctx = await this.context(projectId);
    const range = chartRange(preset, ctx.start, ctx.last, ctx.dataDate);
    const referenceBy = new Map(ctx.reference.map((row) => [row.date, row]));
    const tc = ctx.progress?.costIndicesDate ?? ctx.dataDate;
    const cpi = ctx.progress?.cpi ?? null;
    const bac = Number(ctx.progress?.bac ?? '0');
    const forecastEnd = ctx.forecast.at(-1)?.date;
    const forecastPercent = (date: string) => (forecastEnd && date >= forecastEnd ? 100 : (carry(ctx.forecast, date)?.percent ?? null));
    const until = preset === 'all' ? addDays(ctx.dataDate, BURN_FORECAST_DAYS) : range.to;
    const horizon = addDays(ctx.dataDate, BURN_FORECAST_DAYS);
    const starts = monthStarts(range.from, until);
    return {
      range,
      burn: starts.map((from, index) => {
        const to = addDays(starts[index + 1] ?? addDays(from, 31), -1);
        const planned = plannedAt(ctx.reference, referenceBy, to, 'pv') - plannedAt(ctx.reference, referenceBy, addDays(from, -1), 'pv');
        const actual =
          from <= tc
            ? costs.filter((cost) => cost.costDate >= from && cost.costDate <= to && cost.costDate <= tc).reduce((sum, cost) => sum + cost.amount, 0n)
            : null;
        const fromPercent = from >= ctx.dataDate && from <= horizon ? forecastPercent(addDays(from, -1)) : null;
        const toPercent = fromPercent !== null ? forecastPercent(to) : null;
        return {
          date: from,
          planned: ctx.reference.length > 0 ? rial(Math.max(0, planned)).toString() : null,
          actual: actual === null ? null : actual.toString(),
          forecast: fromPercent !== null && toPercent !== null && cpi ? rial(Math.max(0, (bac * (toPercent - fromPercent)) / 100 / cpi)).toString() : null,
        };
      }),
    };
  }
}
