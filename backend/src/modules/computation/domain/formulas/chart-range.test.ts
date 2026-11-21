import { describe, expect, it } from 'vitest';
import { chartRange, monthEnds, monthStarts, percentile } from './chart-range.js';

// بازهٔ نمودار (charts.md ۷؛ تصمیم 1405/08/25).

describe('بازهٔ نمودار', () => {
  it('چهار میانبر روی تاریخ داده ۱۴۰۵/۰۳/۳۱', () => {
    const dataDate = '2026-06-21';
    expect(chartRange('month', '2026-03-25', '2026-10-03', dataDate)).toMatchObject({ from: '2026-05-22', to: dataDate, closedPeriod: false });
    expect(chartRange('quarter', '2026-03-25', '2026-10-03', dataDate).from).toBe('2026-03-22');
    expect(chartRange('all', '2026-03-25', '2026-10-03', dataDate)).toMatchObject({ from: '2026-03-25', to: '2026-10-03', label: 'کل پروژه' });
    // دورهٔ بسته = اردیبهشت ۱۴۰۵ (ماه پیش از خرداد)
    expect(chartRange('closed_period', '2026-03-25', '2026-10-03', dataDate)).toEqual({
      preset: 'closed_period',
      from: '2026-04-21',
      to: '2026-05-21',
      label: 'دورهٔ بسته — اردیبهشت ۱۴۰۵',
      closedPeriod: true,
    });
  });

  it('پایان و آغاز ماه‌های شمسی؛ صدک', () => {
    expect(monthEnds('2026-04-21', '2026-06-21')).toEqual(['2026-05-21', '2026-06-21']);
    expect(monthStarts('2026-05-10', '2026-07-01')).toEqual(['2026-04-21', '2026-05-22', '2026-06-22']);
    expect(percentile([1, 2, 3, 4, 10], 0.9)).toBeCloseTo(7.6, 6);
    expect(percentile([], 0.9)).toBe(0);
  });
});
