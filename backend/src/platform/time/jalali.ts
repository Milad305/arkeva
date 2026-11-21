// تبدیل تاریخ میلادی ↔ شمسی (C03: ذخیره میلادی، نمایش شمسی). ابزار تاریخ است، نه فرمول کسب‌وکار.
// میلادی ← شمسی با تقویم persian خود ICU نود؛ شمسی ← میلادی با حدس نزدیک و اصلاح روزبه‌روز
// تا هر دو جهت از یک منبع بیایند و ناسازگار نشوند.

export interface JalaliDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const DAY_MS = 86_400_000;

const persian = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function parseIso(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`تاریخ ${iso} به شکل YYYY-MM-DD نیست`);
  const time = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(time)) throw new Error(`تاریخ ${iso} معتبر نیست`);
  return time;
}

const isoOf = (time: number): string => new Date(time).toISOString().slice(0, 10);

/** تاریخ میلادی YYYY-MM-DD ← شمسی. */
export function toJalali(iso: string): JalaliDate {
  const parts = Object.fromEntries(persian.formatToParts(new Date(parseIso(iso))).map((part) => [part.type, part.value]));
  return { year: Number.parseInt(parts['year'] ?? '', 10), month: Number(parts['month']), day: Number(parts['day']) };
}

const compare = (a: JalaliDate, b: JalaliDate): number => a.year - b.year || a.month - b.month || a.day - b.day;

/** شمسی ← تاریخ میلادی YYYY-MM-DD؛ تاریخ ناموجود (مثل ۳۰ اسفند سال کبیسه‌نشده) null. */
export function fromJalali(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (month > 6 && day > 30) return null;
  const target = { year, month, day };
  // ۱ فروردین همیشه ۱۹ تا ۲۲ مارس است؛ حدس با ماه‌های ۳۱ و ۳۰ روزه
  const offset = month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30;
  let time = Date.UTC(year + 621, 2, 20) + (offset + day - 1) * DAY_MS;
  for (let step = 0; step < 6; step += 1) {
    const diff = compare(target, toJalali(isoOf(time)));
    if (diff === 0) return isoOf(time);
    time += Math.sign(diff) * DAY_MS;
  }
  return null;
}

/** سال شمسی یک تاریخ میلادی. */
export const jalaliYear = (iso: string): number => toJalali(iso).year;

/** «۱۴۰۴/۰۴/۰۱» با ارقام لاتین؛ تبدیل ارقام با toFaDigits در لایهٔ پیام. */
export function formatJalali(iso: string): string {
  const { year, month, day } = toJalali(iso);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/** روزهای میلادی از start تا finish، هر دو سر شامل. */
export function eachDay(start: string, finish: string): string[] {
  const days: string[] = [];
  for (let time = parseIso(start); time <= parseIso(finish); time += DAY_MS) days.push(isoOf(time));
  return days;
}

/** روز هفته: ۰ = شنبه … ۶ = جمعه (ترتیب هفتهٔ ایرانی). */
export function weekdayIndex(iso: string): number {
  return (new Date(parseIso(iso)).getUTCDay() + 1) % 7;
}
