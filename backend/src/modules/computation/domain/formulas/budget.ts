// ذخیرهٔ احتیاطی (F02 ۵.۲؛ C02؛ AC-PS-02). مبلغ bigint ریال؛ درصد رشتهٔ دهدهی تا چهار رقم (C04)؛
// گرد کردن نیمه به بالا فقط همین‌جا، در لحظهٔ ساخت مبلغ نهایی.

const PCT = /^(\d{1,3})(?:\.(\d{1,4}))?$/;

/** درصد دهدهی ← عدد صحیح با مقیاس ۱۰٬۰۰۰ («5.25» ← 52500). */
export function percentScaled(pct: string): bigint {
  const match = PCT.exec(pct.trim());
  if (!match) throw new Error(`درصد ${pct} دهدهی معتبر نیست`);
  return BigInt(match[1] ?? '0') * 10_000n + BigInt((match[2] ?? '').padEnd(4, '0'));
}

/** round_half_up(budget × pct ÷ 100). */
export function contingencyReserve(budget: bigint, pct: string): bigint {
  if (budget < 0n) throw new Error('بودجه منفی است');
  return (budget * percentScaled(pct) + 500_000n) / 1_000_000n;
}

/** سهم CBS از بودجهٔ کل ویزارد = بودجه − ذخیره (cbs.md ۶.۱). */
export function cbsShare(budget: bigint, reserve: bigint): bigint {
  return budget - reserve;
}
