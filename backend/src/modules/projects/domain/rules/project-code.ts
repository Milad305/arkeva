// کد خوانای پروژه (C05: `PRJ-<سال شمسی>-<NNN>`؛ F02 ۵.۱). تغییرناپذیر، یکتا در سازمان، و پس از حذف
// دوباره استفاده نمی‌شود (۸.۴) — دفتر کدها (`project_code_register`) را فرمان ساخت نگه می‌دارد.

export const PROJECT_CODE = /^PRJ-\d{4}-\d{3}$/;

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** شمارهٔ بعدی همان سال پس از بزرگ‌ترین کد ثبت‌شده؛ کدهای دستی بالاتر را رد می‌کند. */
export function nextCode(year: number, registered: readonly string[]): string {
  const prefix = `PRJ-${year}-`;
  const taken = new Set(registered.map(normalizeCode));
  const max = [...taken].filter((code) => code.startsWith(prefix)).reduce((value, code) => Math.max(value, Number(code.slice(prefix.length)) || 0), 0);
  let next = max + 1;
  while (taken.has(`${prefix}${String(next).padStart(3, '0')}`)) next += 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
