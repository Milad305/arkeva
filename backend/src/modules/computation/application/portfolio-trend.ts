import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProjectRules } from '../../projects/index.js';
import { ProjectDailySnapshot } from '../domain/progress.entities.js';
import { forecastSeries, sampleDates } from '../domain/formulas/curve.js';
import { PlanCurves } from './plan-curves.js';
import type { CurvePoint } from './overview-figures.js';
import { ProgressReads } from './progress-reads.js';

// «روند کلی پیشرفت» W05 (charts.md ۶.۱؛ تصمیم 1405/08/15): میانگین **ساده** پروژه‌های فعال در هر تاریخ تا نقطهٔ امروزش همان
// کارت میانگین پیشرفت باشد. برنامه‌ای از PlanVersionCurve مرجع هر پروژه (پیش از شروع ۰، پس از پایان ۱۰۰)؛ واقعی از آخرین
// snapshot تا آن تاریخ؛ پیش‌بینی فقط وقتی همهٔ پروژه‌ها سری پیش‌بینی دارند (پس از پایانش ۱۰۰) `[پیش‌فرض فنی]`.

interface Series {
  readonly start: string;
  readonly finish: string;
  readonly planned: ReadonlyMap<string, number>;
  readonly actual: readonly { date: string; value: number }[];
  readonly forecast: ReadonlyMap<string, number> | null;
  readonly forecastStart: string;
  readonly forecastEnd: string | null;
}

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

@Injectable()
export class PortfolioTrend {
  constructor(
    private readonly em: EntityManager,
    private readonly rules: ProjectRules,
    private readonly progress: ProgressReads,
    private readonly curves: PlanCurves,
  ) {}

  async of(projectIds: readonly string[], maxPoints = 60): Promise<{ dataDate: string | null; points: CurvePoint[] }> {
    const series: Series[] = [];
    let dataDate: string | null = null;
    for (const projectId of projectIds) {
      const [rules, progress] = await Promise.all([this.rules.of(projectId), this.progress.project(projectId)]);
      const referenceId = rules.progress.pvReferenceVersionId;
      if (!referenceId || !progress) continue;
      const rows = await this.curves.rows(projectId, referenceId);
      if (rows.length === 0) continue;
      const snapshots = await this.em.find(
        ProjectDailySnapshot,
        { projectId, date: { $lte: progress.dataDate } },
        { fields: ['date', 'actualPercent'], orderBy: { date: 'asc' } },
      );
      const actual = snapshots.filter((row) => row.date < progress.dataDate).map((row) => ({ date: row.date, value: Number(row.actualPercent) }));
      actual.push({ date: progress.dataDate, value: progress.actualPercent });
      const forecast =
        progress.actualPercent >= 100 ? [] : forecastSeries(rows, rules.calendar, Number(progress.ev), progress.actualPercent, progress.dataDate);
      series.push({
        start: rows[0]?.date as string,
        finish: rows.at(-1)?.date as string,
        planned: new Map(rows.map((row) => [row.date, row.planned])),
        actual,
        forecast: progress.actualPercent >= 100 ? new Map() : forecast.length > 0 ? new Map(forecast.map((point) => [point.date, point.percent])) : null,
        forecastStart: progress.dataDate,
        forecastEnd: progress.actualPercent >= 100 ? progress.dataDate : (forecast.at(-1)?.date ?? null),
      });
      if (!dataDate || progress.dataDate > dataDate) dataDate = progress.dataDate;
    }
    if (series.length === 0 || !dataDate) return { dataDate, points: [] };
    const plannedAt = (entry: Series, date: string) => (date < entry.start ? 0 : date > entry.finish ? 100 : (entry.planned.get(date) ?? 0));
    const actualAt = (entry: Series, date: string) => {
      let value = 0;
      for (const point of entry.actual) {
        if (point.date > date) break;
        value = point.value;
      }
      return value;
    };
    const canForecast = series.every((entry) => entry.forecast !== null);
    const forecastAt = (entry: Series, date: string) => {
      if (entry.forecastEnd && date >= entry.forecastEnd) return 100;
      if (date <= entry.forecastStart) return actualAt(entry, date);
      return entry.forecast?.get(date) ?? null;
    };
    const all = series.flatMap((entry) => [
      ...entry.planned.keys(),
      ...entry.actual.map((point) => point.date),
      ...(entry.forecast ? [...entry.forecast.keys()] : []),
    ]);
    const dates = sampleDates(all, [dataDate], maxPoints);
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      dataDate,
      points: dates.map((date) => {
        const forecasts = date >= dataDate && canForecast ? series.map((entry) => forecastAt(entry, date)) : [];
        return {
          date,
          planned: round(mean(series.map((entry) => plannedAt(entry, date)))),
          actual: date <= dataDate ? round(mean(series.map((entry) => actualAt(entry, date)))) : null,
          forecast: forecasts.length > 0 && forecasts.every((value) => value !== null) ? round(mean(forecasts.map((value) => value ?? 0))) : null,
        };
      }),
    };
  }
}
