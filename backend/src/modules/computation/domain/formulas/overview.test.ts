import { describe, expect, it } from 'vitest';
import { type CurveRow, forecastSeries, sampleDates } from './curve.js';
import { consumedPercent, costTrend, delayWorkDays, scheduleGapPercent, scheduleTrend, timeCard } from './overview.js';

// اعداد نمایشی W10 (charts.md ۶.۲) روی مثال مرجع (00 ۶؛ evm.md ۶.۱).

const everyDay = { weekModes: [], holidays: new Set<string>() };

describe('اعداد نمای کلی', () => {
  it('AC-CH-01 — مثال مرجع: CPI ۰٫۹۴ «بالاتر از برنامه»، SPI ۰٫۸۹ «۱۰٫۹٪ عقب»، مصرف ۵۲٪', () => {
    const cpi = 490 / 520;
    const spi = 490 / 550;
    expect(costTrend(cpi)).toBe('over');
    expect(scheduleTrend(spi)).toBe('behind');
    expect(scheduleGapPercent(spi)).toBeCloseTo(10.909, 3);
    expect(consumedPercent(520_000_000n, 1_000_000_000n)).toBe(52);
  });

  it('بازهٔ متقارن ۰٫۹۵ تا ۱٫۰۵ برای هر دو شاخص', () => {
    expect([0.94, 0.95, 1.05, 1.06].map(costTrend)).toEqual(['over', 'near', 'near', 'under']);
    expect([0.94, 0.95, 1.05, 1.06].map(scheduleTrend)).toEqual(['behind', 'near', 'near', 'ahead']);
    expect(costTrend(null)).toBeNull();
  });

  it('کارت زمان و تأخیر به روز کاری', () => {
    expect(timeCard({ start: '2026-01-01', finish: '2026-01-10' }, '2026-01-05', everyDay)).toEqual({
      elapsedWorkingDays: 5,
      remainingWorkingDays: 5,
      totalWorkingDays: 10,
      elapsedPercent: 50,
    });
    expect(delayWorkDays('2026-01-10', '2026-01-14', everyDay)).toBe(4);
    expect(delayWorkDays('2026-01-10', '2026-01-08', everyDay)).toBe(-2);
    expect(delayWorkDays('2026-01-10', null, everyDay)).toBeNull();
  });

  it('سری پیش‌بینی از تاریخ داده با Earned Schedule تا ۱۰۰٪؛ نمونه‌برداری با نقطه‌های کلیدی', () => {
    // ۱۰ روز، PV خطی ۱۰۰ تا ۱۰۰۰
    const rows: CurveRow[] = Array.from({ length: 10 }, (_v, index) => ({
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      planned: (index + 1) * 10,
      pv: (index + 1) * 100,
      bac: 1000,
    }));
    // روز ۵: EV = ۴۰۰ ← ES = ۴، SPI(t) = ۰٫۸، پایان ۱۲٫۵ روز
    const series = forecastSeries(rows, everyDay, 400, 40, '2026-01-05');
    expect(series[0]).toEqual({ date: '2026-01-05', percent: 40 });
    expect(series[1]?.percent).toBeCloseTo(48, 6);
    expect(series.at(-1)).toEqual({ date: '2026-01-13', percent: 100 });
    expect(forecastSeries(rows, everyDay, 0, 0, '2026-01-05')).toEqual([]);

    const all = Array.from(
      { length: 100 },
      (_v, index) => `2026-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    );
    const sampled = sampleDates(all, ['2026-02-05'], 10);
    expect(sampled.length).toBeLessThanOrEqual(12);
    expect(sampled).toContain('2026-02-05');
    expect(sampled.at(-1)).toBe(all.at(-1));
  });
});
