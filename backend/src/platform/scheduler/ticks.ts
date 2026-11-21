import { SetMetadata } from '@nestjs/common';

// تیک‌های روزانهٔ F20 ۵ (docs/backend/08 ۴)، همه به وقت تهران (C03). HourlyTick با نخستین مصرف‌کننده‌اش (ارجاع مهلت
// بررسی گزارش، F09 ۴.۴) آمد؛ ReminderTick و ReportScheduleDue با مصرف‌کنندهٔ خودشان.

export const TEHRAN = 'Asia/Tehran';

export interface TickDef {
  readonly name: TickName;
  readonly hour: number;
  readonly minute: number;
}

export const DAILY_TICKS = [
  { name: 'DailyTick', hour: 0, minute: 30 },
  { name: 'BackupTick', hour: 2, minute: 0 },
  { name: 'PurgeTick', hour: 3, minute: 0 },
  { name: 'DigestTick', hour: 7, minute: 30 },
] as const satisfies readonly { name: string; hour: number; minute: number }[];

/** تیک ساعتی: بی جبران و بی tick_run — کار مصرف‌کننده خودش تکرارپذیر است (سررسیده‌های باز را می‌گیرد). */
export const HOURLY_TICKS = [{ name: 'HourlyTick', minute: 5 }] as const;

export type TickName = (typeof DAILY_TICKS)[number]['name'] | (typeof HOURLY_TICKS)[number]['name'];

export function cronOf(tick: TickDef): string {
  return `${tick.minute} ${tick.hour} * * *`;
}

/** سقف جبران: بیش از این تعداد روز عقب‌افتاده اجرا نمی‌شود تا خاموشی طولانی سیل کار نسازد `[پیش‌فرض فنی]`. */
export const MAX_CATCH_UP_DAYS = 31;

const tehranParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TEHRAN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** تاریخ (YYYY-MM-DD) و دقیقهٔ روز به وقت تهران. */
export function tehranClock(instant: Date): { date: string; minuteOfDay: number } {
  const parts = Object.fromEntries(tehranParts.formatToParts(instant).map((part) => [part.type, part.value]));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minuteOfDay: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

/** روز YYYY-MM-DD به‌علاوهٔ n روز (تقویمی، بی‌وابستگی به منطقهٔ زمانی). */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** آخرین روزی که موعد این تیک در آن رسیده است. */
export function latestDueDate(tick: TickDef, now: Date): string {
  const { date, minuteOfDay } = tehranClock(now);
  return minuteOfDay >= tick.hour * 60 + tick.minute ? date : addDays(date, -1);
}

/** روزهایی که باید اجرا شوند: پس از آخرین اجرای موفق تا آخرین موعد؛ بی‌سابقه فقط آخرین موعد. */
export function missedDates(lastSuccess: string | null, latestDue: string): string[] {
  if (!lastSuccess) return [latestDue];
  const dates: string[] = [];
  for (let day = addDays(lastSuccess, 1); day <= latestDue; day = addDays(day, 1)) dates.push(day);
  return dates.slice(-MAX_CATCH_UP_DAYS);
}

/** کار هر ماژول روی یک تیک؛ برمی‌گرداند چند پروژه پردازش شد (لاگ تیک، F20 ۵). */
export interface TickHandler {
  onTick(tick: TickName, runDate: string): Promise<number>;
}

export const TICK_HANDLER_SPEC = 'projeyar:tick-handler';

export const OnTick = (...ticks: TickName[]): ClassDecorator => SetMetadata(TICK_HANDLER_SPEC, ticks);
