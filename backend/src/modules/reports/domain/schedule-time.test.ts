import { describe, expect, it } from 'vitest';
import { jalaliMonthSpan, nextRunAt, previousJalaliMonth } from './schedule-time.js';

// زمان اجرای زمان‌بندی گزارش (management-reports.md ۷.۴؛ AC-MR-05): به وقت تهران.

const always = () => true;

describe('گزارش: زمان‌بندی', () => {
  it('AC-MR-05 — هفتگی شنبه ۰۸:۰۰ تهران ← ۰۴:۳۰ UTC همان شنبه؛ پس از آن هفتهٔ بعد', () => {
    const timing = { frequency: 'weekly' as const, weekday: 6, dayOfMonth: null, timeOfDay: '08:00', workingDaysOnly: false };
    // یکشنبه 2026-06-21
    expect(nextRunAt(timing, new Date('2026-06-21T08:00:00Z'), always)?.toISOString()).toBe('2026-06-27T04:30:00.000Z');
    expect(nextRunAt(timing, new Date('2026-06-27T04:30:00Z'), always)?.toISOString()).toBe('2026-07-04T04:30:00.000Z');
  });

  it('روزانه همان روز اگر ساعتش نگذشته؛ «فقط روزهای کاری» جمعه را رد می‌کند و هفتگی را به روز کاری بعد می‌برد', () => {
    const daily = { frequency: 'daily' as const, weekday: null, dayOfMonth: null, timeOfDay: '17:00', workingDaysOnly: true };
    const notFriday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 5;
    // پنجشنبه 2026-06-25 ساعت ۱۸ تهران ← جمعه رد ← شنبه
    expect(nextRunAt(daily, new Date('2026-06-25T14:30:00Z'), notFriday)?.toISOString()).toBe('2026-06-27T13:30:00.000Z');
    const friday = { frequency: 'weekly' as const, weekday: 5, dayOfMonth: null, timeOfDay: '09:00', workingDaysOnly: true };
    expect(nextRunAt(friday, new Date('2026-06-21T08:00:00Z'), notFriday)?.toISOString()).toBe('2026-06-27T05:30:00.000Z');
    expect(nextRunAt({ ...friday, frequency: 'on_period_close' }, new Date('2026-06-21T08:00:00Z'), always)).toBeNull();
  });

  it('ماهانه روز ماه شمسی؛ روز ۳۱ در ماه سی‌روزه ← روز آخر', () => {
    const monthly = { frequency: 'monthly' as const, weekday: null, dayOfMonth: 31, timeOfDay: '08:00', workingDaysOnly: false };
    // مهر ۱۴۰۵ سی روزه است: ۳۰ مهر = 2026-10-22
    expect(nextRunAt(monthly, new Date('2026-10-01T00:00:00Z'), always)?.toISOString()).toBe('2026-10-22T04:30:00.000Z');
    expect(previousJalaliMonth('2026-10-25')).toBe('month:1405-07');
    expect(jalaliMonthSpan('month:1405-07')).toEqual({ from: '2026-09-23', to: '2026-10-22' });
  });
});
