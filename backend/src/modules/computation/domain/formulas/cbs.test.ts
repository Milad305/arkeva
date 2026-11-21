import { describe, expect, it } from 'vitest';
import { allocationState, cbsLeafBudget, closingQuantity, linkSubBudget } from './cbs.js';

// مثال مرجع CBS (cbs.md ۹.۱؛ مبالغ میلیون ریال ← ریال) و قواعد گرد کردن (C02).

const M = 1_000_000n;
const item = (rate: bigint, qty: string) => ({
  pricingMode: 'unit_rate' as const,
  estimatedQuantity: qty,
  unitRate: (rate * M).toString(),
  lumpSumAmount: null,
});

describe('بودجهٔ CBS', () => {
  it('AC-CBS-01 — BAC برگ‌ها 100، 300، 300، 300 و BAC پروژه 1000', () => {
    const c1 = { pricingMode: 'unit_rate' as const, estimatedQuantity: '500', unitRate: (M / 5n).toString(), lumpSumAmount: null };
    const c2 = item(1n, '400');
    const c3 = item(50n, '6');
    const c4 = { pricingMode: 'lump_sum' as const, estimatedQuantity: null, unitRate: null, lumpSumAmount: (200n * M).toString() };
    expect([c1, c2, c3, c4].map(cbsLeafBudget)).toEqual([100n * M, 400n * M, 300n * M, 200n * M]);
    const q = (quantity: string) => ({ quantity, allocatedAmount: null });
    const a = (amount: bigint) => ({ quantity: null, allocatedAmount: (amount * M).toString() });
    const leafBac = [
      linkSubBudget(c1, q('500')),
      linkSubBudget(c2, q('200')) + linkSubBudget(c3, q('2')),
      linkSubBudget(c2, q('50')) + linkSubBudget(c3, q('2')) + linkSubBudget(c4, a(150n)),
      linkSubBudget(c2, q('150')) + linkSubBudget(c3, q('2')) + linkSubBudget(c4, a(50n)),
    ];
    expect(leafBac).toEqual([100n * M, 300n * M, 300n * M, 300n * M]);
    expect(leafBac.reduce((sum, value) => sum + value, 0n)).toBe(1000n * M);
  });

  it('C02 — گرد نیمه به بالا روی هر مبلغ؛ تحمل گرد کردن به شمار اتصال‌ها', () => {
    expect(cbsLeafBudget({ pricingMode: 'unit_rate', estimatedQuantity: '0.5', unitRate: '3', lumpSumAmount: null })).toBe(2n);
    expect(allocationState(100n, 102n, 3)).toBe('full');
    expect(allocationState(100n, 104n, 3)).toBe('over');
    expect(allocationState(100n, 96n, 3)).toBe('under');
  });

  it('cbs.md ۴.۴ — «بستن قلم» مقدار را به بالا گرد می‌کند', () => {
    expect(closingQuantity(1_000_001n, 3n)).toBe('333333.6667');
  });
});
