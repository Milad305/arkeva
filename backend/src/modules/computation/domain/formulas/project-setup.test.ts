import { describe, expect, it } from 'vitest';
import { fromJalali } from '../../../../platform/time/jalali.js';
import { cbsShare, contingencyReserve, percentScaled } from './budget.js';
import { type DayMode, scheduleSpan } from './schedule.js';

// فرمول‌های ویزارد پروژه (F02 ۵.۲).

const SITE: DayMode[] = ['full', 'full', 'full', 'full', 'full', 'half', 'off'];
const iso = (year: number, month: number, day: number): string => {
  const value = fromJalali(year, month, day);
  if (!value) throw new Error('تاریخ نادرست');
  return value;
};

describe('AC-PS-01 — مدت هر دو سر شامل', () => {
  it('AC-PS-01 — ۱۴۰۴/۰۴/۰۱ تا ۱۴۰۵/۱۲/۲۰ مدت ۶۲۸ روز تقویمی است', () => {
    const span = scheduleSpan(iso(1404, 4, 1), iso(1405, 12, 20), { weekModes: SITE, holidays: new Set() });
    expect(span?.calendarDays).toBe(628);
    expect(span?.months).toBe(20.6);
  });

  it('F02 ۵.۲ — روز کاری: جمعه نه، نیم‌روز پنجشنبه بله، تعطیلی روز کاری کم می‌شود', () => {
    // ۱۴۰۵/۰۱/۰۱ (شنبه) تا ۱۴۰۵/۰۱/۰۷ (جمعه): ۷ روز، ۶ روز کاری، دو تعطیل روی روز کاری
    const span = scheduleSpan(iso(1405, 1, 1), iso(1405, 1, 7), {
      weekModes: SITE,
      holidays: new Set([iso(1405, 1, 1), iso(1405, 1, 2), iso(1405, 1, 7)]),
    });
    expect(span).toMatchObject({ calendarDays: 7, workDays: 4, holidays: 2 });
  });

  it('F02 ۵.۲ — پایان پیش از شروع', () => {
    expect(scheduleSpan('2026-02-01', '2026-01-31', { weekModes: SITE, holidays: new Set() })).toBeNull();
  });
});

describe('AC-PS-02 — ذخیرهٔ احتیاطی', () => {
  it('AC-PS-02 — بودجهٔ ۱٬۲۰۰ میلیارد و ۵٪ ← ذخیرهٔ ۶۰ میلیارد ریال و سهم CBS ۱٬۱۴۰ میلیارد', () => {
    const budget = 1_200_000_000_000n;
    const reserve = contingencyReserve(budget, '5');
    expect(reserve).toBe(60_000_000_000n);
    expect(cbsShare(budget, reserve)).toBe(1_140_000_000_000n);
  });

  it('C02 — گرد نیمه به بالا فقط در ساخت مبلغ', () => {
    expect(contingencyReserve(10n, '5')).toBe(1n); // ۰٫۵ ← ۱
    expect(contingencyReserve(9n, '5')).toBe(0n); // ۰٫۴۵ ← ۰
    expect(contingencyReserve(1_000_000n, '2.5')).toBe(25_000n);
  });

  it('C04 — درصد تا چهار رقم اعشار؛ بیشتر رد می‌شود', () => {
    expect(percentScaled('12.3456')).toBe(123_456n);
    expect(() => percentScaled('1.23456')).toThrow();
    expect(() => percentScaled('-1')).toThrow();
  });
});
