/** ارقام فارسی برای پیام‌های کاربر (`CLAUDE.md` ۵: ارقام فقط با toFaDigits). */
export function toFaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(digit)));
}
