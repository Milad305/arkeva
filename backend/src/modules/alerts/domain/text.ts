import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';

// قالب‌بندی جای‌خالی‌های راهنما (04-alert-engine ۳): ارقام فارسی، درصد تا یک رقم اعشار، مبلغ به میلیون ریال.

type Value = string | number | null | undefined;

export function fa(value: Value, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return toFaDigits(value);
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  const text = Math.abs(rounded).toString().replace('.', '٫');
  return `${rounded < 0 ? '−' : ''}${toFaDigits(text)}`;
}

/** مبلغ ریال (رشتهٔ bigint) ← «۱٬۰۶۱ میلیون ریال». */
export function amount(value: Value): string {
  if (value === null || value === undefined) return '—';
  const millions = Math.round(Number(value) / 1_000_000);
  return `${toFaDigits(millions.toLocaleString('en-US').replace(/,/g, '٬'))} میلیون ریال`;
}

export const date = (value: Value): string => (typeof value === 'string' ? toFaDigits(formatJalali(value)) : '—');
