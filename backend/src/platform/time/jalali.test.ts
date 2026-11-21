import { describe, expect, it } from 'vitest';
import { eachDay, formatJalali, fromJalali, toJalali, weekdayIndex } from './jalali.js';

// تبدیل تاریخ (C03) با جفت‌های شناخته‌شده؛ مثال F02 ۵.۲ (۱۴۰۴/۰۴/۰۱ تا ۱۴۰۵/۱۲/۲۰).

describe('C03 — تبدیل شمسی و میلادی', () => {
  it.each([
    ['2024-03-20', 1403, 1, 1],
    ['2025-03-20', 1403, 12, 30], // ۱۴۰۳ کبیسه
    ['2025-03-21', 1404, 1, 1],
    ['2025-06-22', 1404, 4, 1],
    ['2026-03-21', 1405, 1, 1],
    ['2026-11-13', 1405, 8, 22],
    ['2027-03-11', 1405, 12, 20],
  ] as const)('C03 — %s ↔ %d/%d/%d', (iso, year, month, day) => {
    expect(toJalali(iso)).toEqual({ year, month, day });
    expect(fromJalali(year, month, day)).toBe(iso);
  });

  it('C03 — ۳۰ اسفند سال غیرکبیسه و روز ۳۱ نیمهٔ دوم سال وجود ندارد', () => {
    expect(fromJalali(1404, 12, 30)).toBeNull();
    expect(fromJalali(1404, 7, 31)).toBeNull();
  });

  it('C03 — قالب نمایش و روز هفته (۰ = شنبه)', () => {
    expect(formatJalali('2025-06-22')).toBe('1404/04/01');
    expect(weekdayIndex('2026-11-14')).toBe(0); // شنبه
    expect(weekdayIndex('2026-11-20')).toBe(6); // جمعه
    expect(eachDay('2026-11-14', '2026-11-16')).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
  });
});
