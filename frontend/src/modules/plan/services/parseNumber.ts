import { toEnDigits } from '@/shared/utils/num';

/** عدد تایپ‌شده با ارقام فارسی و جداکنندهٔ «٫» یا «٬»؛ `null` اگر عدد نباشد. */
export function parseNumber(text: string): number | null {
  const value = Number(toEnDigits(text).replace(/[٫/]/g, '.').replace(/[٬,]/g, '').trim());
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
}
