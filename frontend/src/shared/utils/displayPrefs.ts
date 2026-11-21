// ترجیحات نمایش کاربر (F01 ۵.۷، W32) — فقط قالب نمایش؛ هیچ داده یا فرمولی را عوض نمی‌کند.
//
// C03 (اصلاح 1405/08/19): پیش‌فرض برای همه شمسی و ارقام فارسی است؛ فقط ترجیح خود کاربر
// نمایش خودش را میلادی یا لاتین می‌کند. API همیشه `date` میلادی و ارقام لاتین است.
// بی‌وابستگی تا `num.ts` و `date.ts` بی‌حلقه از آن بخوانند.

export type CalendarPref = 'jalali' | 'gregorian';
export type DigitsPref = 'fa' | 'latin';
/** واحد نمایش مبالغ: خودکار (بر اساس بزرگی)، میلیون یا میلیارد ریال (project-setup.md ۷). */
export type AmountScalePref = 'auto' | 'million' | 'billion';

export interface DisplayPrefs {
  calendar: CalendarPref;
  digits: DigitsPref;
  amountScale: AmountScalePref;
}

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = { calendar: 'jalali', digits: 'fa', amountScale: 'auto' };

let current: DisplayPrefs = { ...DEFAULT_DISPLAY_PREFS };
let version = 0;
const listeners = new Set<() => void>();

export function getDisplayPrefs(): DisplayPrefs {
  return current;
}

export function setDisplayPrefs(next: Partial<DisplayPrefs>): void {
  const merged = { ...current, ...next };
  if (merged.calendar === current.calendar && merged.digits === current.digits && merged.amountScale === current.amountScale) return;
  current = merged;
  version += 1;
  listeners.forEach((listener) => listener());
}

/** برای `useSyncExternalStore` — پوسته با تغییر نسخه صفحه را از نو می‌سازد. */
export function subscribeDisplayPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function displayPrefsVersion(): number {
  return version;
}
