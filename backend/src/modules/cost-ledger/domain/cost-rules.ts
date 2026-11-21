import { createHash } from 'node:crypto';
import { quantityScaled } from '../../computation/index.js';

// قواعد خالص دفتر هزینه (cost-ledger.md ۵): مقصد فقط برگ CBS؛ مقدار فقط برای نرخ واحد؛ مبلغ صحیح مثبت (منفی فقط
// برگشتی)؛ پروژهٔ پیش‌نویس و بایگانی ممنوع، تمام‌شده مجاز؛ کلید idempotency.

export class CostRuleError extends Error {}

export interface CostTarget {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly pricingMode: 'unit_rate' | 'lump_sum' | null;
  readonly unit: string | null;
}

/** پروژه هزینه می‌پذیرد؟ (۱۱.۵–۱۱.۶). */
export function projectAcceptsCosts(status: string): string | null {
  if (status === 'draft') return 'هزینه از فعال‌سازی معنا پیدا می‌کند؛ پروژهٔ پیش‌نویس هزینه نمی‌پذیرد.';
  if (status === 'archived') return 'پروژهٔ بایگانی‌شده هزینهٔ تازه نمی‌پذیرد.';
  return null;
}

/** AC-CST-06: والد، قلم حذف‌شده و مقدار روی قلم مقطوع رد. */
export function checkTarget(target: CostTarget | undefined, quantity: string | number | null | undefined): void {
  if (!target) throw new CostRuleError('این قلم CBS در برنامهٔ جاری نیست؛ هزینه فقط روی برگ فعال ثبت می‌شود.');
  if (!target.isLeaf) throw new CostRuleError(`«${target.code} ${target.title}» گروه است؛ هزینه فقط روی برگ CBS ثبت می‌شود.`);
  if (quantity !== null && quantity !== undefined && quantity !== '' && target.pricingMode !== 'unit_rate') {
    throw new CostRuleError(`مقدار فقط برای قلم نرخ واحد ثبت می‌شود؛ «${target.code}» مقطوع است.`);
  }
}

/** مبلغ ریال صحیح و مثبت (C02). */
export function parseAmount(value: string | number | null | undefined): bigint {
  const text = String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[,٬\s]/g, '');
  if (!/^\d+$/.test(text) || BigInt(text) <= 0n) throw new CostRuleError('مبلغ باید عدد صحیح مثبت به ریال باشد.');
  return BigInt(text);
}

/** مقدار با حداکثر چهار رقم اعشار، به شکل ذخیره. */
export function parseQuantity(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const scaled = quantityScaled(value);
  if (scaled === null || scaled <= 0n) throw new CostRuleError('مقدار باید عدد مثبت با حداکثر چهار رقم اعشار باشد.');
  return `${scaled / 10_000n}.${(scaled % 10_000n).toString().padStart(4, '0')}`;
}

/** شناسهٔ ردیف ورود وقتی فایل ندارد: هش (کد، تاریخ، مبلغ، شمارهٔ سند) — cost-ledger.md ۶.۱. */
export function externalRefOf(code: string, date: string, amount: string, documentNo: string | null): string {
  return createHash('sha256')
    .update([code, date, amount, documentNo ?? ''].join('|'))
    .digest('hex')
    .slice(0, 32);
}
