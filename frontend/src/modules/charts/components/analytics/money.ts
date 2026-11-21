import { faNum } from '@/shared/utils/num';

/**
 * واحد نمایش مبلغ نمودار از بزرگی سری: میلیارد ریال برای پروژه‌های بزرگ، میلیون ریال
 * برای کوچک (مثال مرجع: BAC = ۱٬۰۰۰ میلیون). فقط قالب نمایش است (C02).
 */
export function moneyScale(values: Array<string | number | null | undefined>): { unit: string; format: (value: number | string, digits?: number) => string } {
  const max = Math.max(0, ...values.map((value) => Math.abs(Number(value ?? 0))).filter(Number.isFinite));
  const divisor = max >= 10e9 ? 1e9 : 1e6;
  const unit = divisor === 1e9 ? 'میلیارد ریال' : 'میلیون ریال';
  return {
    unit,
    format: (value, digits = 0) => {
      const scaled = Number(value) / divisor;
      return faNum(Math.round(scaled * 10 ** digits) / 10 ** digits, scaled % 1 === 0 ? 0 : digits);
    },
  };
}
