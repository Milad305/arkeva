// شناسهٔ ورود (F01 ۵.۱): ایمیل یا شمارهٔ موبایل. تابع خالص با تست.

const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC = '٠١٢٣٤٥٦٧٨٩';

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN.indexOf(digit);
    return String(persian >= 0 ? persian : ARABIC.indexOf(digit));
  });
}

/** «۰۹۱۲ ۳۴۵ ۴۳۲۱»، «+989123454321» و «9123454321» همه «09123454321». */
export function normalizeMobile(value: string): string | null {
  const digits = toLatinDigits(value).replace(/[\s\-()]/g, '');
  const local = digits.replace(/^(\+98|0098)/, '0').replace(/^9(\d{9})$/, '09$1');
  return /^09\d{9}$/.test(local) ? local : null;
}

export interface LoginIdentifier {
  readonly mobile: string | null;
  readonly email: string | null;
}

export function parseIdentifier(raw: string): LoginIdentifier {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return { mobile: null, email: trimmed.toLowerCase() };
  return { mobile: normalizeMobile(trimmed), email: null };
}

/** «0912 *** 4321» — W03. */
export function maskMobile(mobile: string): string {
  return mobile.length < 11 ? mobile : `${mobile.slice(0, 4)} *** ${mobile.slice(-4)}`;
}
