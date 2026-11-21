import { addDays } from '../../../../platform/scheduler/ticks.js';
import { fromJalali, toJalali } from '../../../../platform/time/jalali.js';

// دوره‌های گزارش (progress-calculation.md ۵.۸؛ OD-06): ماه شمسی، پیوسته و بی هم‌پوشانی. تصمیم 1405/08/23: اولین دوره ماه
// شمسی شامل شروع برنامه‌ای؛ تا ۱۲ ماه جلوتر از امروز ساخته می‌شوند. پیش‌نمایش «ماه گذشته» W07: همان روز ماه شمسی قبل.

export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'] as const;

export interface MonthPeriod {
  readonly startDate: string;
  readonly endDate: string;
  readonly year: number;
  readonly month: number;
}

const firstOf = (year: number, month: number): string => fromJalali(year, month, 1) as string;
const next = (year: number, month: number): [number, number] => (month === 12 ? [year + 1, 1] : [year, month + 1]);

export function monthOf(date: string): MonthPeriod {
  const { year, month } = toJalali(date);
  const [ny, nm] = next(year, month);
  return { startDate: firstOf(year, month), endDate: addDays(firstOf(ny, nm), -1), year, month };
}

/** ماه‌های شمسی از ماهِ `from` تا ماهِ `until`، هر دو شامل. */
export function monthsBetween(from: string, until: string): MonthPeriod[] {
  const result: MonthPeriod[] = [];
  let current = monthOf(from);
  for (let guard = 0; current.startDate <= until && guard < 1200; guard += 1) {
    result.push(current);
    current = monthOf(addDays(current.endDate, 1));
  }
  return result;
}

/** همان روز ماه شمسی قبل؛ روز ناموجود به آخر آن ماه می‌رود (۳۱ فروردین ← ۲۹ یا ۳۰ اسفند). */
export function sameDayPreviousMonth(date: string): string {
  const { year, month, day } = toJalali(date);
  const [py, pm] = month === 1 ? [year - 1, 12] : [year, month - 1];
  for (let candidate = day; candidate >= 28; candidate -= 1) {
    const iso = fromJalali(py, pm, candidate);
    if (iso) return iso;
  }
  return fromJalali(py, pm, Math.min(day, 28)) as string;
}

/** «خرداد ۱۴۰۵» با ارقام لاتین؛ تبدیل ارقام در لایهٔ نمایش. */
export const periodLabel = (period: Pick<MonthPeriod, 'year' | 'month'>): string => `${JALALI_MONTHS[period.month - 1] ?? ''} ${period.year}`;
