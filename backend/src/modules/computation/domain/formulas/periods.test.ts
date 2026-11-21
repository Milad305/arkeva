import { describe, expect, it } from 'vitest';
import { monthOf, monthsBetween, periodLabel, sameDayPreviousMonth } from './periods.js';

describe('دوره‌های ماه شمسی (OD-06)', () => {
  it('ماه شامل یک تاریخ: خرداد ۱۴۰۵ = 2026-05-22 تا 2026-06-21؛ پیوسته و بی هم‌پوشانی', () => {
    expect(monthOf('2026-06-10')).toEqual({ startDate: '2026-05-22', endDate: '2026-06-21', year: 1405, month: 3 });
    const months = monthsBetween('2026-03-25', '2026-06-21');
    expect(months.map((month) => periodLabel(month))).toEqual(['فروردین 1405', 'اردیبهشت 1405', 'خرداد 1405']);
    for (let index = 1; index < months.length; index += 1) {
      expect((months[index]?.startDate ?? '') > (months[index - 1]?.endDate ?? '')).toBe(true);
    }
    // اسفند ۱۴۰۴ تا فروردین ۱۴۰۵ از مرز سال می‌گذرد
    expect(monthsBetween('2026-03-01', '2026-03-25').map((month) => month.month)).toEqual([12, 1]);
  });

  it('همان روز ماه قبل؛ روز ناموجود به آخر ماه', () => {
    expect(sameDayPreviousMonth('2026-11-14')).toBe('2026-10-15'); // ۲۳ آبان ← ۲۳ مهر
    expect(sameDayPreviousMonth('2026-10-22')).toBe('2026-09-21'); // ۳۰ مهر ← ۳۰ شهریور
    expect(sameDayPreviousMonth('2026-04-20')).toBe('2026-03-20'); // ۳۱ فروردین ← ۲۹ اسفند ۱۴۰۴ (۳۰ و ۳۱ اسفند نیست)
  });
});
