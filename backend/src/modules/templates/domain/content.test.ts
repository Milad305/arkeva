import { describe, expect, it } from 'vitest';
import { referenceTemplate } from '../../../../test/fixtures/templates.js';
import { allocate, scaleOf, splitByShare, validate } from './content.js';

// قواعد خالص قالب (templates.md ۵.۲، ۵.۳).

const M = 1_000_000n;

describe('قالب: قواعد خالص', () => {
  it('AC-TP-01 — بودجهٔ CBS ۱٬۰۰۰ میلیون ← BAC برگ‌ها ۱۰۰/۳۰۰/۳۰۰/۳۰۰ و جمع ۱٬۰۰۰', () => {
    const { leafBudget, linkAmount } = allocate(referenceTemplate(), 1000n * M);
    expect([...leafBudget.values()]).toEqual([100n * M, 400n * M, 300n * M, 200n * M]);
    const bac = new Map<string, bigint>();
    for (const [key, amount] of linkAmount) bac.set(key.split('|')[0] as string, (bac.get(key.split('|')[0] as string) ?? 0n) + amount);
    expect(['l111', 'l112', 'l121', 'l122'].map((key) => bac.get(key))).toEqual([100n * M, 300n * M, 300n * M, 300n * M]);
  });

  it('AC-TP-02 — ۱٬۰۰۰٬۰۰۰٬۰۰۱ با ۴۰٪ و ۶۰٪ ← ۴۰۰٬۰۰۰٬۰۰۰ و ۶۰۰٬۰۰۰٬۰۰۱', () => {
    expect(splitByShare(1_000_000_001n, [40, 60])).toEqual([400_000_000n, 600_000_001n]);
  });

  it('AC-TP-03 — جمع وزن ۱۰۰ نباشد انتشار رد؛ سهم CBS و گام‌ها هم', () => {
    expect(validate(referenceTemplate()).canPublish).toBe(true);
    const broken = referenceTemplate();
    (broken.wbs[1] as { weightInParent: number }).weightInParent = 25;
    const report = validate(broken);
    expect(report.canPublish).toBe(false);
    expect(report.weightsOk).toBe(false);
    expect(report.errors.map((issue) => issue.rule)).toEqual(['WEIGHT_SUM']);
    const share = referenceTemplate();
    (share.cbs[0] as { sharePct: number }).sharePct = 5;
    expect(validate(share).errors.map((issue) => issue.rule)).toEqual(['CBS_SHARE_SUM']);
  });

  it('AC-TP-04 — مقیاس زمان با ضریب مدت؛ هیچ آیتمی بیرون از بازه نیست؛ مدت کمتر از یک روز ← یک روز', () => {
    // مرجع ۱۵۶، پروژهٔ ۷۸ روز کاری ← ضریب ۰٫۵
    expect(scaleOf({ startOffsetWd: 104, durationWd: 52, isMilestone: false }, 156, 78)).toEqual({ start: 52, finish: 77, factor: 0.5 });
    expect(scaleOf({ startOffsetWd: 150, durationWd: 40, isMilestone: false }, 156, 78).finish).toBe(77);
    expect(scaleOf({ startOffsetWd: 10, durationWd: 1, isMilestone: false }, 156, 20)).toMatchObject({ start: 1, finish: 1 });
    expect(scaleOf({ startOffsetWd: 156, durationWd: 0, isMilestone: true }, 156, 78)).toMatchObject({ start: 77, finish: 77 });
  });
});
