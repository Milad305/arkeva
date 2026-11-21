import { eachDay, weekdayIndex } from '../../../../platform/time/jalali.js';

// مدت و روز کاری پروژه (F02 ۵.۲؛ C03). تابع خالص؛ تقویم را فراخواننده از ProjectCalendar یا پیش‌تنظیم می‌دهد.

export type DayMode = 'full' | 'half' | 'off';

export interface WorkCalendar {
  /** هفت روز از شنبه (۰) تا جمعه (۶). نیم‌روز روز کاری است. */
  readonly weekModes: readonly DayMode[];
  /** تاریخ‌های میلادی تعطیل فعال. */
  readonly holidays: ReadonlySet<string>;
}

export interface ScheduleSpan {
  /** هر دو سر شامل (AC-PS-01: ۱۴۰۴/۰۴/۰۱ تا ۱۴۰۵/۱۲/۲۰ ← ۶۲۸). */
  readonly calendarDays: number;
  readonly workDays: number;
  /** تعطیلی‌هایی که روی روز کاری افتاده‌اند (تعطیلی جمعه شمرده نمی‌شود). */
  readonly holidays: number;
  /** ماه تقریبی برای نمایش: روز ÷ ۳۰٫۴۴ با یک رقم اعشار. */
  readonly months: number;
}

/** null یعنی پایان پیش از شروع است. */
export function scheduleSpan(start: string, finish: string, calendar: WorkCalendar): ScheduleSpan | null {
  if (finish < start) return null;
  const days = eachDay(start, finish);
  let workDays = 0;
  let holidays = 0;
  for (const day of days) {
    const working = calendar.weekModes[weekdayIndex(day)] !== 'off';
    if (!working) continue;
    if (calendar.holidays.has(day)) holidays += 1;
    else workDays += 1;
  }
  return { calendarDays: days.length, workDays, holidays, months: Math.round((days.length / 30.44) * 10) / 10 };
}
