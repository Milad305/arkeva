import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { fromJalali, toJalali } from '../../../platform/time/jalali.js';
import { fa, jalali } from './format.js';

// زمان اجرای زمان‌بندی گزارش (management-reports.md ۶، ۷.۴): به وقت تهران (+۰۳:۳۰، بی ساعت تابستانی)؛ ماهانه روز ماه شمسی
// (روز بزرگ‌تر از طول ماه ← روز آخر)؛ «فقط روزهای کاری» ← نوبت به نخستین روز کاری بعد می‌رود. بازهٔ هر اجرا (۷.۱؛ تصمیم کاربر
// 1405/08/26 برای روزانه: روز قبل).

export interface ScheduleTiming {
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'on_period_close';
  /** ۰ = یکشنبه … ۶ = شنبه. */
  readonly weekday?: number | null;
  readonly dayOfMonth?: number | null;
  readonly timeOfDay: string;
  readonly workingDaysOnly: boolean;
}

const WEEKDAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const instantOf = (date: string, time: string) => new Date(`${date}T${time}:00+03:30`);
const jsWeekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function matches(timing: ScheduleTiming, date: string): boolean {
  if (timing.frequency === 'daily') return true;
  if (timing.frequency === 'weekly') return jsWeekday(date) === (timing.weekday ?? 6);
  const day = toJalali(date).day;
  const last = toJalali(addDays(date, 1)).day === 1;
  const wanted = timing.dayOfMonth ?? 1;
  return day === wanted || (last && wanted > day);
}

/** نوبت بعد پس از `after`؛ `on_period_close` نوبت زمانی ندارد. */
export function nextRunAt(timing: ScheduleTiming, after: Date, isWorkingDay: (date: string) => boolean): Date | null {
  if (timing.frequency === 'on_period_close') return null;
  let date = tehranClock(after).date;
  let owed = false;
  for (let step = 0; step < 800; step += 1, date = addDays(date, 1)) {
    const due = owed || matches(timing, date);
    if (!due) continue;
    if (timing.workingDaysOnly && !isWorkingDay(date)) {
      owed = timing.frequency !== 'daily';
      continue;
    }
    const at = instantOf(date, timing.timeOfDay);
    if (at > after) return at;
    owed = false;
  }
  return null;
}

export function frequencyLabel(timing: ScheduleTiming): string {
  const time = fa(timing.timeOfDay);
  if (timing.frequency === 'daily') return `هر روز · ${time}`;
  if (timing.frequency === 'weekly') return `هر ${WEEKDAY_NAMES[timing.weekday ?? 6]} · ${time}`;
  if (timing.frequency === 'monthly') return timing.dayOfMonth === 1 ? `اول هر ماه · ${time}` : `${fa(timing.dayOfMonth ?? 1)} هر ماه · ${time}`;
  return 'با بستن هر دوره';
}

export function nextRunLabel(at: Date | null, enabled: boolean, frequency: ScheduleTiming['frequency']): string {
  if (!enabled) return 'متوقف';
  if (frequency === 'on_period_close') return 'با بستن دورهٔ بعدی';
  if (!at) return '—';
  const tehran = new Date(at.getTime() + 3.5 * 3_600_000).toISOString();
  return `بعدی: ${jalali(tehran.slice(0, 10))} ساعت ${fa(tehran.slice(11, 16))}`;
}

/** ماه شمسی پیش از `date` (گزارش ماهانهٔ سطح سازمان): شناسهٔ `month:YYYY-MM`. */
export function previousJalaliMonth(date: string): string {
  const { year, month } = toJalali(date);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `month:${prev.year}-${String(prev.month).padStart(2, '0')}`;
}

/** مرز ماه شمسی `YYYY-MM` به میلادی. */
export function jalaliMonthSpan(id: string): { from: string; to: string } | null {
  const match = /^month:(\d{4})-(\d{2})$/.exec(id);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const from = fromJalali(year, month, 1);
  const next = month === 12 ? fromJalali(year + 1, 1, 1) : fromJalali(year, month + 1, 1);
  return from && next ? { from, to: addDays(next, -1) } : null;
}
