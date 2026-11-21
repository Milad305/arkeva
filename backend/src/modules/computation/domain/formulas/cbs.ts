// بودجهٔ قلم و زیربودجهٔ اتصال (cbs.md ۴.۱، ۵.۲، ۶.۱، ۱۵.۷؛ ب6؛ C02). مبلغ bigint ریال؛ مقدار رشتهٔ دهدهی تا
// چهار رقم؛ گرد کردن نیمه به بالا فقط در لحظهٔ ساخت مبلغ (روی هر زیربودجه و هر بودجهٔ قلم).

export type PricingMode = 'unit_rate' | 'lump_sum';

const QTY = /^(\d{1,14})(?:\.(\d{1,4}))?$/;
const SCALE = 10_000n;

/** مقدار دهدهی ← عدد صحیح با مقیاس ۱۰٬۰۰۰ («2.5» ← 25000)؛ نامعتبر ← null. */
export function quantityScaled(quantity: string | number | null | undefined): bigint | null {
  if (quantity === null || quantity === undefined || quantity === '') return null;
  const text = typeof quantity === 'number' ? quantity.toFixed(4) : quantity.trim();
  const match = QTY.exec(text);
  if (!match) return null;
  return BigInt(match[1] ?? '0') * SCALE + BigInt((match[2] ?? '').padEnd(4, '0'));
}

/** round_half_up(numerator ÷ denominator) برای مقادیر نامنفی. */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('مخرج باید مثبت باشد');
  if (numerator < 0n) return -divRoundHalfUp(-numerator, denominator);
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/** round(مقدار × نرخ). */
export function amountOf(quantity: string | number | null | undefined, unitRate: bigint | null | undefined): bigint {
  const scaled = quantityScaled(quantity);
  if (scaled === null || unitRate === null || unitRate === undefined) return 0n;
  return divRoundHalfUp(scaled * unitRate, SCALE);
}

export interface PricedItem {
  readonly pricingMode: PricingMode | null;
  readonly estimatedQuantity: string | null;
  readonly unitRate: string | null;
  readonly lumpSumAmount: string | null;
}

/** بودجهٔ برگ CBS: `round(مقدار برآورد × نرخ)` یا مبلغ مقطوع؛ ناقص ← ۰. */
export function cbsLeafBudget(item: PricedItem): bigint {
  if (item.pricingMode === 'lump_sum') return item.lumpSumAmount ? BigInt(item.lumpSumAmount) : 0n;
  if (item.pricingMode === 'unit_rate') return amountOf(item.estimatedQuantity, item.unitRate ? BigInt(item.unitRate) : null);
  return 0n;
}

/** زیربودجهٔ اتصال: `unit_rate` ← round(مقدار × نرخ)؛ `lump_sum` ← مبلغ تخصیص. */
export function linkSubBudget(item: PricedItem, link: { readonly quantity: string | null; readonly allocatedAmount: string | null }): bigint {
  if (item.pricingMode === 'lump_sum') return link.allocatedAmount ? BigInt(link.allocatedAmount) : 0n;
  if (item.pricingMode === 'unit_rate') return amountOf(link.quantity, item.unitRate ? BigInt(item.unitRate) : null);
  return 0n;
}

/** تخصیص‌یافتهٔ قلم با تحمل گرد کردن (۱۵.۷): اختلاف کمتر از شمار اتصال‌ها (ریال) تخصیص‌نیافته نیست. */
export function allocationState(budget: bigint, allocated: bigint, linkCount: number): 'over' | 'under' | 'full' {
  const tolerance = BigInt(linkCount);
  if (allocated > budget + tolerance) return 'over';
  if (allocated + tolerance < budget) return 'under';
  return 'full';
}

/** «بستن قلم» نرخ واحد: مقدار به بالا تا چهار رقم تا بودجه از هزینهٔ واقعی کمتر نشود (۴.۴). */
export function closingQuantity(actualCost: bigint, unitRate: bigint): string {
  const scaled = (actualCost * SCALE + unitRate - 1n) / unitRate;
  return `${scaled / SCALE}.${(scaled % SCALE).toString().padStart(4, '0')}`;
}
