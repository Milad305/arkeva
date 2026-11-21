import { describe, expect, it } from 'vitest';
import { addDays, DAILY_TICKS, latestDueDate, MAX_CATCH_UP_DAYS, missedDates, tehranClock } from './ticks.js';

// حساب تاریخ تیک‌ها به وقت تهران (C03؛ F20 ۵). تهران UTC+3:30 بی‌ساعت تابستانی است.

const daily = DAILY_TICKS.find((tick) => tick.name === 'DailyTick');
if (!daily) throw new Error('DailyTick تعریف نشده است');

describe('F20 ۵ — موعد تیک روزانه به وقت تهران', () => {
  it('F20 ۵ — ۲۰:۵۹ UTC هنوز روز قبل در تهران است (۰۰:۲۹)؛ ۲۱:۰۰ UTC موعد DailyTick روز بعد', () => {
    expect(tehranClock(new Date('2026-11-12T20:59:00Z'))).toEqual({ date: '2026-11-13', minuteOfDay: 29 });
    expect(latestDueDate(daily, new Date('2026-11-12T20:59:00Z'))).toBe('2026-11-12');
    expect(latestDueDate(daily, new Date('2026-11-12T21:00:00Z'))).toBe('2026-11-13');
  });

  it('F20 ۵ — مرز ماه و سال میلادی', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
});

describe('AC-PL-04 — روزهای جبرانی', () => {
  it('AC-PL-04 — پس از آخرین اجرای موفق تا آخرین موعد، به ترتیب', () => {
    expect(missedDates('2026-11-10', '2026-11-13')).toEqual(['2026-11-11', '2026-11-12', '2026-11-13']);
  });

  it('AC-PL-04 — هیچ روز عقب‌افتاده‌ای نیست', () => {
    expect(missedDates('2026-11-13', '2026-11-13')).toEqual([]);
  });

  it('AC-PL-04 — بی‌سابقه (نصب تازه) فقط آخرین موعد', () => {
    expect(missedDates(null, '2026-11-13')).toEqual(['2026-11-13']);
  });

  it('AC-PL-04 — خاموشی طولانی حداکثر ۳۱ روز آخر را جبران می‌کند', () => {
    const dates = missedDates('2026-01-01', '2026-11-13');
    expect(dates).toHaveLength(MAX_CATCH_UP_DAYS);
    expect(dates.at(-1)).toBe('2026-11-13');
  });
});
