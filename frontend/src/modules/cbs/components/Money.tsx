import { formatRialParts, toFaDigits } from '@/shared/utils/num';

/**
 * مبلغ ریالی خوانا: «۴۰۰ میلیون ریال». `short` واحد «ریال» را برای ستون‌های باریک
 * می‌اندازد. ورودی رشتهٔ ریال کامل است (C02)؛ `null` یعنی مبلغ از سرور حذف شده (D11).
 */
export function Money({ value, short, className }: { value: string | null | undefined; short?: boolean; className?: string }) {
  if (value === null || value === undefined) return <span className="tx5">—</span>;
  const parts = formatRialParts(value);
  const unit = short ? parts.unit.replace(/\s*ریال$/, '') : parts.unit;
  return (
    <span className={`nowrap ${className ?? 't-12 tx7'}`} title={`${toFaDigits(BigInt(value).toLocaleString('en-US'))} ریال`}>
      {parts.value} {unit && <span className="tx5">{unit}</span>}
    </span>
  );
}
