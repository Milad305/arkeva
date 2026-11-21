import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * ترکیب کلاس‌ها. تنها راه مجاز برای کلاس شرطی — هیچ ternary پیچیده‌ای داخل className.
 *
 * نکته دربارهٔ kit: کلاس‌های بوم (`btn`, `card`, `fld`, …) برای twMerge ناشناخته‌اند،
 * پس دست‌نخورده عبور می‌کنند؛ فقط utility‌های Tailwind با هم ادغام می‌شوند.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
