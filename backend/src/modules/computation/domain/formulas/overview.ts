import { addDays } from '../../../../platform/scheduler/ticks.js';
import { scheduleSpan, type WorkCalendar } from './schedule.js';

// اعداد نمایشی W10 از مقادیر ذخیره‌شده (charts.md ۶.۲؛ تصمیم‌های 1405/08/14) — تابع خالص، تنها جای این قاعده‌ها (D07).

export type CostTrend = 'over' | 'near' | 'under';
export type ScheduleTrend = 'behind' | 'near' | 'ahead';

/** بازهٔ متقارن ۰٫۹۵ تا ۱٫۰۵: CPI کم ← هزینه «بالاتر از برنامه». */
export function costTrend(cpi: number | null): CostTrend | null {
  if (cpi === null) return null;
  if (cpi < 0.95) return 'over';
  if (cpi > 1.05) return 'under';
  return 'near';
}

export function scheduleTrend(spi: number | null): ScheduleTrend | null {
  if (spi === null) return null;
  if (spi < 0.95) return 'behind';
  if (spi > 1.05) return 'ahead';
  return 'near';
}

/** «در خطر» (ب24): انحراف ≤ −۱۵ یا CPI < ۰٫۹. */
export const atRisk = (deviation: number, cpi: number | null): boolean => deviation <= -15 || (cpi !== null && cpi < 0.9);

/** `n = |1 − SPI| × 100`. */
export const scheduleGapPercent = (spi: number | null): number | null => (spi === null ? null : Math.abs(1 - spi) * 100);

/** درصد تفاوت با پایه (EAC با BAC، W22). پایهٔ صفر ← ۰. */
export const variancePercent = (value: bigint, base: bigint): number => (base > 0n ? (Number(value - base) / Number(base)) * 100 : 0);

/** بودجهٔ مصرف‌شده = AC ÷ BAC (ب8). */
export const consumedPercent = (ac: bigint, bac: bigint): number => (bac > 0n ? (Number(ac) / Number(bac)) * 100 : 0);

const workDays = (from: string, to: string, calendar: WorkCalendar): number => (to < from ? 0 : (scheduleSpan(from, to, calendar)?.workDays ?? 0));

/** کارت زمان به روز کاری تقویم پروژه (تصمیم 1405/08/14): سپری‌شده تا تاریخ داده. */
export function timeCard(span: { readonly start: string; readonly finish: string }, dataDate: string, calendar: WorkCalendar) {
  const total = Math.max(1, workDays(span.start, span.finish, calendar));
  const elapsed = Math.min(total, workDays(span.start, dataDate < span.finish ? dataDate : span.finish, calendar));
  return {
    elapsedWorkingDays: elapsed,
    remainingWorkingDays: Math.max(0, total - elapsed),
    totalWorkingDays: total,
    elapsedPercent: Math.round((elapsed / total) * 1000) / 10,
  };
}

/** روزهای کاری پیاپی بی گزارش تا امروز (شامل امروز اگر کاری است) — هم‌راستا با AL-FLD-01. */
export function workDaysWithoutReport(lastWorkDate: string | null, since: string, today: string, calendar: WorkCalendar): number {
  const from = lastWorkDate ? addDays(lastWorkDate, 1) : since;
  return workDays(from, today, calendar);
}

/** تأخیر به روز کاری میان تاریخ برنامه‌ای و پیش‌بینی (منفی = جلوتر). */
export function delayWorkDays(planned: string, forecast: string | null, calendar: WorkCalendar): number | null {
  if (!forecast) return null;
  if (forecast === planned) return 0;
  return forecast > planned ? workDays(addDays(planned, 1), forecast, calendar) : -workDays(addDays(forecast, 1), planned, calendar);
}
