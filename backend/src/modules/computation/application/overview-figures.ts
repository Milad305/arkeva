import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import { ProjectDailySnapshot } from '../domain/progress.entities.js';
import { forecastSeries, sampleDates } from '../domain/formulas/curve.js';
import { itemStatus } from '../domain/formulas/evm.js';
import { consumedPercent, costTrend, scheduleGapPercent, scheduleTrend, timeCard } from '../domain/formulas/overview.js';
import { PlanCurves } from './plan-curves.js';
import { ProgressReads, type ProjectProgressView } from './progress-reads.js';

// کارت‌ها و منحنی S نمای کلی (W10؛ charts.md ۶.۲) فقط از مقادیر ذخیره‌شده: ProjectProgress، ProjectDailySnapshot و
// PlanVersionCurve نسخهٔ مرجع PV. چیزی بازمحاسبه نمی‌شود (AC-CH-01)؛ فقط قالب نمایش (روند، روز کاری، نمونه‌برداری).

/** charts.md ۷: بیش از ۳۶ ساعت از محاسبه گذشته ← «اعداد ممکن است قدیمی باشند». */
const STALE_MS = 36 * 3_600_000;

export interface CurvePoint {
  readonly date: string;
  readonly planned: number | null;
  readonly actual: number | null;
  readonly forecast: number | null;
}

export interface OverviewFiguresView {
  readonly rules: ProjectRulesView;
  readonly progress: ProjectProgressView | null;
  readonly meta: { dataDate: string; costIndicesDate: string | null; computeState: 'ready' | 'updating'; stale: boolean; computedAt: string | null };
  readonly cards: {
    readonly progress: { plannedPercent: number; actualPercent: number; deviation: number; status: string; financialPercent?: number };
    readonly budget: { consumedPercent: number; ac: string; bac: string };
    readonly time: {
      plannedStart: string;
      plannedFinish: string;
      elapsedWorkingDays: number;
      remainingWorkingDays: number;
      totalWorkingDays: number;
      elapsedPercent: number;
      forecastFinish: string | null;
      delayWorkingDays: number | null;
    };
    readonly evm: { cpi: number | null; spi: number | null; costTrend: string | null; scheduleTrend: string | null; scheduleGapPercent: number | null };
  };
  readonly sCurve: CurvePoint[];
}

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

@Injectable()
export class OverviewFigures {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly rules: ProjectRules,
    private readonly progress: ProgressReads,
    private readonly curves: PlanCurves,
  ) {}

  async of(projectId: string, maxPoints = 60): Promise<OverviewFiguresView> {
    const rules = await this.rules.of(projectId);
    const progress = await this.progress.project(projectId);
    const referenceId = rules.progress.pvReferenceVersionId;
    const rows = referenceId ? await this.curves.rows(projectId, referenceId) : [];
    const span = rows.length > 0 ? { start: (rows[0] as { date: string }).date, finish: (rows.at(-1) as { date: string }).date } : null;
    const now = this.clock.now();
    const dataDate = progress?.dataDate ?? span?.start ?? now.toISOString().slice(0, 10);
    const planned = progress?.plannedPercent ?? 0;
    const actual = progress?.actualPercent ?? 0;
    const time = span ? timeCard(span, dataDate, rules.calendar) : { elapsedWorkingDays: 0, remainingWorkingDays: 0, totalWorkingDays: 0, elapsedPercent: 0 };
    const cpi = progress?.cpi ?? null;
    const spi = progress?.spi ?? null;
    const computedAt = progress?.computedAt ?? null;
    return {
      rules,
      progress,
      meta: {
        dataDate,
        costIndicesDate: progress?.costIndicesDate ?? null,
        computeState: progress?.computeState === 'fresh' ? 'ready' : 'updating',
        stale: computedAt !== null && now.getTime() - Date.parse(computedAt) > STALE_MS,
        computedAt,
      },
      cards: {
        progress: {
          plannedPercent: planned,
          actualPercent: actual,
          deviation: progress?.deviation ?? 0,
          status: itemStatus(actual, planned, { warning: rules.progress.warningThreshold, critical: rules.progress.criticalThreshold }),
          ...(rules.progress.showFinancialProgress ? { financialPercent: progress?.financialPercent ?? 0 } : {}),
        },
        budget: {
          consumedPercent: round(consumedPercent(BigInt(progress?.ac ?? '0'), BigInt(progress?.bac ?? '0'))),
          ac: progress?.ac ?? '0',
          bac: progress?.bac ?? '0',
        },
        time: {
          plannedStart: span?.start ?? rules.progress.plannedStart ?? dataDate,
          plannedFinish: span?.finish ?? dataDate,
          ...time,
          forecastFinish: progress?.forecastFinish ?? null,
          delayWorkingDays: actual > 0 ? (progress?.delayDays ?? null) : null,
        },
        evm: { cpi, spi, costTrend: costTrend(cpi), scheduleTrend: scheduleTrend(spi), scheduleGapPercent: scheduleGapPercent(spi) },
      },
      sCurve: await this.curve(projectId, rows, rules, progress, dataDate, maxPoints),
    };
  }

  /** منحنی S: برنامه‌ای از نسخهٔ مرجع، واقعی از snapshot تا تاریخ داده، پیش‌بینی با Earned Schedule. */
  private async curve(
    projectId: string,
    rows: Awaited<ReturnType<PlanCurves['rows']>>,
    rules: ProjectRulesView,
    progress: ProjectProgressView | null,
    dataDate: string,
    maxPoints: number,
  ): Promise<CurvePoint[]> {
    if (rows.length === 0) return [];
    const snapshots = await this.em.find(ProjectDailySnapshot, { projectId, date: { $lte: dataDate } }, { fields: ['date', 'actualPercent'] });
    const actualAt = new Map(snapshots.map((row) => [row.date, Number(row.actualPercent)]));
    if (progress) actualAt.set(dataDate, progress.actualPercent);
    const forecast =
      progress && progress.actualPercent < 100 ? forecastSeries(rows, rules.calendar, Number(progress.ev), progress.actualPercent, dataDate) : [];
    const forecastAt = new Map(forecast.map((point) => [point.date, point.percent]));
    const plannedAt = new Map(rows.map((row) => [row.date, row.planned]));
    const lastForecast = forecast.at(-1)?.date;
    const dates = sampleDates(
      [...plannedAt.keys(), ...actualAt.keys(), ...forecastAt.keys()],
      [rows[0]?.date as string, dataDate, rows.at(-1)?.date as string, ...(lastForecast ? [lastForecast] : [])],
      maxPoints,
    );
    return dates.map((date) => ({
      date,
      planned: plannedAt.has(date) ? round(plannedAt.get(date) as number, 2) : null,
      actual: date <= dataDate && actualAt.has(date) ? round(actualAt.get(date) as number, 2) : null,
      forecast: forecastAt.has(date) ? round(forecastAt.get(date) as number, 2) : null,
    }));
  }
}
