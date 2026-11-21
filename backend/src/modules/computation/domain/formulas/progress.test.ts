import { describe, expect, it } from 'vitest';
import { leafPercent, plannedLeafPercent, type ProgressEntry } from './progress.js';

// قاعدهٔ پیشرفت برگ (D03؛ `02` ۶) و توزیع خطی برنامه (OD-02؛ progress-calculation.md ۵.۳).

const entry = (workDate: string, values: Partial<ProgressEntry>, recordedAt = `${workDate}T10:00:00Z`): ProgressEntry => ({
  workDate,
  recordedAt,
  quantityToday: null,
  reportedPercent: null,
  stepsProgress: null,
  ...values,
});
const fullWeek = { weekModes: ['full', 'full', 'full', 'full', 'full', 'full', 'full'] as const, holidays: new Set<string>() };

describe('پیشرفت واقعی برگ', () => {
  it('مثال مرجع ۶.۱ — مقداری ۱۸۰ از ۲۰۰ = ۹۰؛ گام‌های وزنی قالب ۲۰ و آرماتور ۲۰ = ۴۰', () => {
    expect(
      leafPercent({ method: 'quantity', totalQuantity: 200, steps: null }, [
        entry('2026-05-01', { quantityToday: 100 }),
        entry('2026-05-10', { quantityToday: 80 }),
      ]),
    ).toBe(90);
    const steps = [
      { key: 'formwork', weight: 20 },
      { key: 'rebar', weight: 20 },
      { key: 'concrete', weight: 60 },
    ];
    expect(
      leafPercent({ method: 'steps', totalQuantity: null, steps }, [
        entry('2026-06-10', { stepsProgress: { formwork: 100 } }),
        entry('2026-06-15', { stepsProgress: { rebar: 100 } }),
      ]),
    ).toBe(40);
  });

  it('AC-AP-04 — درصدی: آخرین بر اساس workDate، مستقل از ترتیب تأیید', () => {
    const tenth = entry('2026-06-01', { reportedPercent: 60 });
    const twelfth = entry('2026-06-03', { reportedPercent: 55 });
    const leaf = { method: 'percent' as const, totalQuantity: null, steps: null };
    expect(leafPercent(leaf, [tenth, twelfth])).toBe(55);
    expect(leafPercent(leaf, [twelfth, tenth])).toBe(55);
  });

  it('حالت حاشیه‌ای ۳ — مقدار تجمعی بیش از کل روی ۱۰۰ می‌ماند', () => {
    expect(leafPercent({ method: 'quantity', totalQuantity: 1000, steps: null }, [entry('2026-06-01', { quantityToday: 1030 })])).toBe(100);
  });
});

describe('پیشرفت برنامه‌ای برگ', () => {
  it('AC-PC-08 — ده روز کاری: پایان روز پنجم ۵۰٪، روز دهم ۱۰۰٪؛ نقطهٔ عطف تا روز پایان صفر', () => {
    expect(plannedLeafPercent({ start: '2026-06-01', finish: '2026-06-10', isMilestone: false }, '2026-06-05', fullWeek)).toBe(50);
    expect(plannedLeafPercent({ start: '2026-06-01', finish: '2026-06-10', isMilestone: false }, '2026-06-10', fullWeek)).toBe(100);
    expect(plannedLeafPercent({ start: '2026-06-01', finish: '2026-06-10', isMilestone: false }, '2026-05-30', fullWeek)).toBe(0);
    expect(plannedLeafPercent({ start: '2026-06-10', finish: '2026-06-10', isMilestone: true }, '2026-06-09', fullWeek)).toBe(0);
    expect(plannedLeafPercent({ start: '2026-06-10', finish: '2026-06-10', isMilestone: true }, '2026-06-10', fullWeek)).toBe(100);
  });

  it('OD-02 — جمعه و تعطیلی شمرده نمی‌شوند', () => {
    const site = { weekModes: ['full', 'full', 'full', 'full', 'full', 'half', 'off'] as const, holidays: new Set(['2026-06-02']) };
    // 2026-05-30 شنبه تا 2026-06-08 دوشنبه: ۱۰ روز تقویمی، جمعه 06-05 و تعطیلی 06-02 ← ۸ روز کاری؛ تا 06-03 چهار، تا 06-06 شش (پنجشنبهٔ نیم‌روز کاری است)
    expect(plannedLeafPercent({ start: '2026-05-30', finish: '2026-06-08', isMilestone: false }, '2026-06-03', site)).toBe(50);
    expect(plannedLeafPercent({ start: '2026-05-30', finish: '2026-06-08', isMilestone: false }, '2026-06-06', site)).toBe(75);
  });
});
