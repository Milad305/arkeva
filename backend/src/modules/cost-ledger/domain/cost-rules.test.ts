import { describe, expect, it } from 'vitest';
import { checkTarget, CostRuleError, externalRefOf, parseAmount, parseQuantity, projectAcceptsCosts } from './cost-rules.js';

// قواعد خالص دفتر هزینه (cost-ledger.md ۵، ۱۱).

const leaf = { id: 'c3', code: 'C3', title: 'آرماتور', isLeaf: true, pricingMode: 'unit_rate' as const, unit: 't' };

describe('قواعد ردیف هزینه', () => {
  it('AC-CST-06 — والد، قلم ناموجود و مقدار روی قلم مقطوع رد', () => {
    expect(() => checkTarget({ ...leaf, isLeaf: false }, null)).toThrow(/گروه است/);
    expect(() => checkTarget(undefined, null)).toThrow(CostRuleError);
    expect(() => checkTarget({ ...leaf, pricingMode: 'lump_sum' }, '2')).toThrow(/مقطوع/);
    expect(() => checkTarget(leaf, '2')).not.toThrow();
    expect(() => checkTarget({ ...leaf, pricingMode: 'lump_sum' }, null)).not.toThrow();
  });

  it('۵.۲، ۵.۵ — مبلغ صحیح مثبت؛ منفی و صفر و اعشار رد؛ ارقام فارسی و جداکننده پذیرفته', () => {
    expect(parseAmount('۵۰٬۰۰۰٬۰۰۰')).toBe(50_000_000n);
    expect(() => parseAmount('-5')).toThrow(CostRuleError);
    expect(() => parseAmount('0')).toThrow(CostRuleError);
    expect(() => parseAmount('12.5')).toThrow(CostRuleError);
    expect(parseQuantity('3.2')).toBe('3.2000');
    expect(() => parseQuantity('0')).toThrow(CostRuleError);
  });

  it('۱۱.۵–۱۱.۶ — پیش‌نویس و بایگانی ممنوع، تمام‌شده مجاز', () => {
    expect(projectAcceptsCosts('draft')).toMatch(/پیش‌نویس/);
    expect(projectAcceptsCosts('archived')).toMatch(/بایگانی/);
    expect(projectAcceptsCosts('completed')).toBeNull();
    expect(projectAcceptsCosts('active')).toBeNull();
  });

  it('۶.۱ — شناسهٔ ردیف بی ستون: هش پایدار (کد، تاریخ، مبلغ، شمارهٔ سند)', () => {
    expect(externalRefOf('C3', '2026-05-01', '50000000', 'F-12')).toBe(externalRefOf('C3', '2026-05-01', '50000000', 'F-12'));
    expect(externalRefOf('C3', '2026-05-01', '50000000', 'F-12')).not.toBe(externalRefOf('C3', '2026-05-01', '50000000', 'F-13'));
  });
});
