import { addDays } from '../../../../platform/scheduler/ticks.js';
import { toFaDigits } from '../../../../platform/http/fa.js';
import { JALALI_MONTHS, monthOf } from './periods.js';

// بازهٔ نمودار (charts.md ۷؛ تصمیم‌های 1405/08/15 و 1405/08/25) — تابع خالص. بازه فقط سری‌های زمانی را محدود می‌کند.
//   month: ۳۰ روز تا تاریخ داده · quarter: ۹۱ روز · closed_period: ماه شمسی پیش از ماه تاریخ داده · all: شروع تا پایان یا پیش‌بینی.

export const CHART_RANGES = ['month', 'quarter', 'all', 'closed_period'] as const;
export type ChartRangePreset = (typeof CHART_RANGES)[number];

export interface ChartRange {
  readonly preset: ChartRangePreset;
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly closedPeriod: boolean;
}

export function chartRange(preset: ChartRangePreset, start: string, last: string, dataDate: string): ChartRange {
  if (preset === 'month') return { preset, from: addDays(dataDate, -30), to: dataDate, label: 'این ماه', closedPeriod: false };
  if (preset === 'quarter') return { preset, from: addDays(dataDate, -91), to: dataDate, label: '۳ ماه اخیر', closedPeriod: false };
  if (preset === 'closed_period') {
    const previous = monthOf(addDays(monthOf(dataDate).startDate, -1));
    return {
      preset,
      from: previous.startDate,
      to: previous.endDate,
      label: `دورهٔ بسته — ${JALALI_MONTHS[previous.month - 1]} ${toFaDigits(previous.year)}`,
      closedPeriod: true,
    };
  }
  return { preset, from: start, to: last > start ? last : start, label: 'کل پروژه', closedPeriod: false };
}

/** پایان ماه‌های شمسی بازه (آخرین به `to` بریده می‌شود) — نقطه‌های EVM ماهانه. */
export function monthEnds(from: string, to: string): string[] {
  const result: string[] = [];
  for (let month = monthOf(from); month.startDate <= to; month = monthOf(addDays(month.endDate, 1))) result.push(month.endDate > to ? to : month.endDate);
  return result;
}

/** آغاز ماه‌های شمسی از ماهِ `from` تا ماهِ `until` — ستون‌های نرخ مصرف. */
export function monthStarts(from: string, until: string): string[] {
  const result: string[] = [];
  for (let month = monthOf(from); month.startDate <= until; month = monthOf(addDays(month.endDate, 1))) result.push(month.startDate);
  return result;
}

/** صدک p (۰ تا ۱) با درون‌یابی خطی. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return (sorted[lower] as number) + ((sorted[upper] as number) - (sorted[lower] as number)) * (index - lower);
}
