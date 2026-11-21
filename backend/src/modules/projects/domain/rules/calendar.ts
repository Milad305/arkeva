import { fromJalali, jalaliYear } from '../../../../platform/time/jalali.js';
import type { CalendarHoliday, DayModeKey, WeekdayKey, WorkWeekDay } from '../project-settings.entity.js';
import { WEEKDAY_KEYS } from '../project-settings.entity.js';

// تقویم پروژه (F02 ۶؛ W28) — قواعد خالص.

/**
 * پیش‌تنظیم‌های تقویم (`OrgCalendarPreset` F02 ۴). تا صفحهٔ تنظیمات سازمان دو پیش‌تنظیم سیستمی
 * همان ماک‌اند `[پیش‌فرض فنی]`؛ شناسه‌ها همان فرانت.
 */
export const CALENDAR_PRESETS = [
  { id: 'cal-site6', name: 'کارگاه — ۶ روز در هفته', isDefault: true, modes: ['full', 'full', 'full', 'full', 'full', 'half', 'off'] },
  { id: 'cal-office5', name: 'اداری — ۵ روز در هفته', isDefault: false, modes: ['full', 'full', 'full', 'full', 'full', 'off', 'off'] },
] as const satisfies readonly { id: string; name: string; isDefault: boolean; modes: readonly DayModeKey[] }[];

export type CalendarPresetId = (typeof CALENDAR_PRESETS)[number]['id'];

export function presetOf(id: string | null | undefined): (typeof CALENDAR_PRESETS)[number] {
  return CALENDAR_PRESETS.find((preset) => preset.id === id) ?? CALENDAR_PRESETS[0];
}

export function workWeekOf(modes: readonly DayModeKey[]): WorkWeekDay[] {
  return WEEKDAY_KEYS.map((day, index) => ({ day, mode: modes[index] ?? 'off' }));
}

/**
 * تعطیلات رسمی ثابت خورشیدی همراه نرم‌افزار (تصمیم کاربر 1405/08/22). تعطیلات قمری را مدیر سازمان
 * هر سال از تقویم رسمی می‌افزاید؛ هیچ تاریخ قمری حدسی اینجا نیست.
 */
export const FIXED_OFFICIAL_HOLIDAYS: readonly (readonly [month: number, day: number, title: string])[] = [
  [1, 1, 'عید نوروز'],
  [1, 2, 'عید نوروز'],
  [1, 3, 'عید نوروز'],
  [1, 4, 'عید نوروز'],
  [1, 12, 'روز جمهوری اسلامی'],
  [1, 13, 'روز طبیعت'],
  [3, 14, 'رحلت امام خمینی'],
  [3, 15, 'قیام ۱۵ خرداد'],
  [11, 22, 'پیروزی انقلاب اسلامی'],
  [12, 29, 'ملی شدن صنعت نفت'],
];

export interface OfficialHoliday {
  readonly date: string;
  readonly title: string;
}

/** ثابت‌های یک سال شمسی + افزوده‌های سازمان در همان سال، مرتب و بی‌تکرار تاریخ. */
export function officialHolidaysOf(year: number, orgAdded: readonly OfficialHoliday[]): OfficialHoliday[] {
  const fixed = FIXED_OFFICIAL_HOLIDAYS.flatMap(([month, day, title]) => {
    const date = fromJalali(year, month, day);
    return date ? [{ date, title }] : [];
  });
  const byDate = new Map<string, OfficialHoliday>();
  for (const holiday of [...fixed, ...orgAdded.filter((item) => jalaliYear(item.date) === year)]) {
    if (!byDate.has(holiday.date)) byDate.set(holiday.date, holiday);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** سال‌های شمسی پوشش پروژه. */
export function yearsBetween(start: string, finish: string | null): number[] {
  const from = jalaliYear(start);
  const to = finish && finish >= start ? jalaliYear(finish) : from;
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/** سال‌هایی که هیچ تعطیلی رسمی‌شان در تقویم پروژه نیست (W28 «افزودن تعطیلات رسمی <سال>»). */
export function missingOfficialYears(holidays: readonly CalendarHoliday[], start: string | null, finish: string | null): number[] {
  if (!start) return [];
  const covered = new Set(holidays.filter((holiday) => holiday.type === 'official').map((holiday) => jalaliYear(holiday.date)));
  return yearsBetween(start, finish).filter((year) => !covered.has(year));
}

/** افزودن تعطیلات رسمی یک سال بی‌تکرار تاریخ (تعطیلی دستی همان روز می‌ماند). */
export function mergeOfficial(holidays: readonly CalendarHoliday[], official: readonly OfficialHoliday[]): CalendarHoliday[] {
  const existing = new Set(holidays.map((holiday) => holiday.date));
  const added = official.filter((holiday) => !existing.has(holiday.date)).map((holiday) => ({ ...holiday, type: 'official' as const, enabled: true }));
  return [...holidays, ...added].sort((a, b) => a.date.localeCompare(b.date));
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CalendarInput {
  readonly workWeek: readonly WorkWeekDay[];
  readonly dayStart: string;
  readonly dayEnd: string;
  readonly halfDayEnd: string;
  readonly holidays: readonly CalendarHoliday[];
}

/** خطاهای فیلدی تقویم W28 (پیام بی‌سرزنش با راه ادامه). */
export function calendarErrors(input: CalendarInput): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  if (![input.dayStart, input.dayEnd, input.halfDayEnd].every((value) => TIME.test(value))) {
    errors.push({ field: 'dayStart', message: 'ساعت‌ها را مثل ۰۷:۰۰ بنویسید.' });
  } else {
    if (input.dayEnd <= input.dayStart) errors.push({ field: 'dayEnd', message: 'پایان کار روزانه باید بعد از شروع باشد.' });
    if (input.halfDayEnd <= input.dayStart || input.halfDayEnd > input.dayEnd) {
      errors.push({ field: 'halfDayEnd', message: 'پایان نیم‌روز باید میان شروع و پایان کار روزانه باشد.' });
    }
  }
  const days = new Set(input.workWeek.map((day) => day.day));
  if (input.workWeek.length !== 7 || days.size !== 7) errors.push({ field: 'workWeek', message: 'هر هفت روز هفته را یک بار تنظیم کنید.' });
  if (!input.workWeek.some((day) => day.mode !== 'off')) errors.push({ field: 'workWeek', message: 'دست‌کم یک روز کاری در هفته لازم است.' });
  if (input.holidays.some((holiday) => !holiday.title.trim())) errors.push({ field: 'holidays', message: 'عنوان تعطیلی دستی را بنویسید.' });
  return errors;
}

/** حالت هر روز به ترتیب شنبه تا جمعه برای فرمول روز کاری. */
export function modesOf(workWeek: readonly WorkWeekDay[]): DayModeKey[] {
  return WEEKDAY_KEYS.map((key: WeekdayKey) => workWeek.find((day) => day.day === key)?.mode ?? 'off');
}
