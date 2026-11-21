import { describe, expect, it } from 'vitest';
import { cbsLeafFigures, cbsParentFigures, earnedSchedule, evm, itemStatus, leafForecastDays } from './evm.js';

// مثال مرجع (00 ۶.۳؛ evm.md ۴–۶؛ cbs.md ۹.۲) به ریال.

const M = 1_000_000n;
const reference = { bac: 1000n * M, pv: 550n * M, ev: 490n * M, evAtCost: 490n * M, ac: 520n * M };

describe('EVM پروژه', () => {
  it('AC-EV-01 و AC-EV-09 — CV −۳۰، SV −۶۰، CPI ۰٫۹۴۲۳، SPI ۰٫۸۹۰۹، EAC ۱٬۰۶۱٬۲۲۴٬۴۹۰ ریال، VAC، TCPI ۱٫۰۶۲۵', () => {
    const result = evm({ ...reference, method: 'cpi' });
    expect(result.cv).toBe(-30n * M);
    expect(result.sv).toBe(-60n * M);
    expect(result.cpi).toBeCloseTo(0.9423, 4);
    expect(result.spi).toBeCloseTo(0.8909, 4);
    expect(result.eac).toBe(1_061_224_490n);
    expect(result.vac).toBe(1000n * M - 1_061_224_490n);
    expect(result.tcpi).toBeCloseTo(1.0625, 4);
    expect(result.tcpiEac).toBeCloseTo(0.9423, 4);
    expect(result.lowConfidence).toBe(false);
  });

  it('AC-EV-02 — روش‌های remaining و composite: ۱٬۰۳۰ و ۱٬۱۲۷٫۴۹۶۹ میلیون', () => {
    const result = evm({ ...reference, method: 'remaining' });
    expect(result.eac).toBe(1030n * M);
    expect(Number(result.eacComposite) / 1e6).toBeCloseTo(1127.4969, 3);
  });

  it('AC-EV-04 و AC-EV-05 — EV صفر: CPI تهی و EAC = max(BAC, AC)؛ EV زیر ۱۰٪ BAC کم‌اعتبار', () => {
    const zero = evm({ bac: 1000n * M, pv: 100n * M, ev: 0n, evAtCost: 0n, ac: 50n * M, method: 'cpi' });
    expect(zero).toMatchObject({ cpi: null, eac: 1000n * M });
    expect(evm({ bac: 1000n * M, pv: 100n * M, ev: 90n * M, evAtCost: 90n * M, ac: 50n * M, method: 'cpi' }).lowConfidence).toBe(true);
    expect(evm({ bac: 1000n * M, pv: 100n * M, ev: 90n * M, evAtCost: 90n * M, ac: 1200n * M, method: 'cpi' }).tcpi).toBeNull();
  });

  it('AC-CST-04 — شاخص‌های هزینه در t_c: EV ۴۰۰ و AC ۴۱۰ ← CPI ۰٫۹۷۵۶؛ SPI در تاریخ داده همان', () => {
    const result = evm({ bac: 1000n * M, pv: 550n * M, ev: 490n * M, evAtCost: 400n * M, ac: 410n * M, method: 'cpi' });
    expect(result.cpi).toBeCloseTo(0.9756, 4);
    expect(result.spi).toBeCloseTo(0.8909, 4);
  });
});

describe('پیش‌بینی', () => {
  it('AC-EV-03 — فیکسچر ۶.۱: ES ۷۱٫۷۶، SPI(t) ۰٫۹۲، تأخیر ۱۴ روز کاری', () => {
    // نقطه‌های هر ۲۶ روز کاری؛ میانشان خطی
    const anchors = [0, 100, 300, 550, 700, 850, 1000];
    const curve = Array.from({ length: 157 }, (_, day) => {
      const segment = Math.min(5, Math.floor(day / 26));
      const from = anchors[segment] as number;
      const to = anchors[segment + 1] as number;
      return from + ((to - from) * (day - segment * 26)) / 26;
    });
    const result = earnedSchedule(curve, 490, 78);
    expect(result?.es).toBeCloseTo(71.76, 2);
    expect(result?.spiT).toBeCloseTo(0.92, 4);
    expect(result?.delayDays).toBe(14);
    expect(earnedSchedule(curve, 0, 78)).toBeNull();
    // EV بیشتر از آخرین PV ← ES = مدت؛ جلوتر از برنامه
    expect(earnedSchedule(curve, 1000, 120)?.delayDays).toBeLessThanOrEqual(0);
  });

  it('AC-EV-07 — برگ از ۶۰ به ۹۰ در ۱۲ روز کاری: ۴ روز کاری بعد', () => {
    expect(leafForecastDays({ actualNow: 90, actual14DaysAgo: 60, workDaysIn14: 12, workDaysSinceStart: 30 })).toBe(4);
    expect(leafForecastDays({ actualNow: 0, actual14DaysAgo: 0, workDaysIn14: 12, workDaysSinceStart: 0 })).toBeNull();
    expect(leafForecastDays({ actualNow: 40, actual14DaysAgo: 40, workDaysIn14: 12, workDaysSinceStart: 20 })).toBe(30);
  });

  it('progress-calculation.md ۵.۵ — وضعیت با آستانه‌های ۵ و ۱۵', () => {
    const thresholds = { warning: 5, critical: 15 };
    expect(itemStatus(100, 100, thresholds)).toBe('completed');
    expect(itemStatus(0, 0, thresholds)).toBe('not_started');
    expect(itemStatus(40, 55, thresholds)).toBe('critical');
    expect(itemStatus(49.2, 55, thresholds)).toBe('warning');
    expect(itemStatus(52, 55, thresholds)).toBe('on_track');
    expect(itemStatus(60, 55, thresholds)).toBe('ahead');
  });
});

describe('قلم CBS (cbs.md ۸، ۹.۲)', () => {
  it('AC-CBS-02 — EV قلم‌ها ۱۰۰، ۲۰۰، ۱۳۰، ۶۰؛ پیش‌بینی ۱۰۵، ۴۳۰، ۳۲۳٫۰۷۶۹، ۲۰۰؛ والد جمع فرزندان', () => {
    const c1 = cbsLeafFigures(100n * M, 105n * M, 100n * M);
    const c2 = cbsLeafFigures(400n * M, 215n * M, 200n * M);
    const c3 = cbsLeafFigures(300n * M, 140n * M, 130n * M);
    const c4 = cbsLeafFigures(200n * M, 60n * M, 60n * M);
    expect([c1.eac, c2.eac, c4.eac]).toEqual([105n * M, 430n * M, 200n * M]);
    expect(Number(c3.eac) / 1e6).toBeCloseTo(323.0769, 3);
    expect(c1.consumedPercent).toBe(105);
    expect(c2.consumedPercent).toBe(53.75);
    expect(c3.cpi).toBeCloseTo(0.9286, 4);
    const parent = cbsParentFigures([c2, c3]);
    expect(parent.eac).toBe(c2.eac + c3.eac);
    // AC-CBS-03: جمع پیش‌بینی قلم‌ها ≠ EAC پروژه
    const sum = [c1, c2, c3, c4].reduce((total, item) => total + item.eac, 0n);
    expect(sum).not.toBe(1_061_224_490n);
  });
});

describe('cbsProgress (cbs.md ۹.۲)', () => {
  it('AC-CBS-02 — از اتصال‌های مرجع و پیشرفت برگ‌ها: EV ۱۰۰، ۲۰۰، ۱۳۰، ۶۰ و مقدار کسب‌شدهٔ بتن', async () => {
    const { cbsProgress } = await import('./cbs-progress.js');
    const leaf = (id: string, pricing: 'unit_rate' | 'lump_sum', qty: string | null, rate: bigint | null, lump: bigint | null = null) => ({
      id,
      parentId: null,
      isLeaf: true,
      pricingMode: pricing,
      estimatedQuantity: qty,
      unitRate: rate?.toString() ?? null,
      lumpSumAmount: lump?.toString() ?? null,
    });
    const items = [
      leaf('C1', 'unit_rate', '500', M / 5n),
      leaf('C2', 'unit_rate', '400', M),
      leaf('C3', 'unit_rate', '6', 50n * M),
      leaf('C4', 'lump_sum', null, null, 200n * M),
    ];
    const link = (wbsItemId: string, cbsItemId: string, quantity: string | null, allocatedAmount: string | null = null) => ({
      wbsItemId,
      cbsItemId,
      quantity,
      allocatedAmount,
    });
    const links = [
      link('l111', 'C1', '500'),
      link('l112', 'C2', '200'),
      link('l112', 'C3', '2'),
      link('l121', 'C2', '50'),
      link('l121', 'C3', '2'),
      link('l121', 'C4', null, String(150n * M)),
      link('l122', 'C2', '150'),
      link('l122', 'C3', '2'),
      link('l122', 'C4', null, String(50n * M)),
    ];
    const result = cbsProgress({
      items,
      referenceItems: items,
      referenceLinks: links,
      leafActual: new Map([
        ['l111', 100],
        ['l112', 90],
        ['l121', 40],
        ['l122', 0],
      ]),
      costs: [
        { cbsItemId: 'C1', amount: 105n * M, quantity: 500 },
        { cbsItemId: 'C2', amount: 215n * M, quantity: 215 },
        { cbsItemId: 'C3', amount: 140n * M, quantity: 2.8 },
        { cbsItemId: 'C4', amount: 60n * M, quantity: null },
      ],
    });
    expect(['C1', 'C2', 'C3', 'C4'].map((id) => result.get(id)?.ev)).toEqual([100n * M, 200n * M, 130n * M, 60n * M]);
    // بتن: 200×0.9 + 50×0.4 = 200 کسب‌شده؛ مصرف ۲۱۵ ← مازاد ۱۵
    expect(result.get('C2')).toMatchObject({ consumedQuantity: 215, earnedQuantity: 200, excessQuantity: 15, eac: 430n * M });
    expect(result.get('C4')).toMatchObject({ consumedQuantity: null, eac: 200n * M });
  });
});
