import type { WorkCalendar } from '../../computation/index.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { weekdayIndex } from '../../../platform/time/jalali.js';

// مهلت بررسی (approval-workflow.md ۴.۴؛ AC-AP-06): ورود + reviewDeadlineHours؛ اگر در روز غیرکاری تقویم پروژه (به وقت
// تهران) بیفتد، به نخستین روز کاری بعد با همان ساعت منتقل می‌شود `[تأییدشده]`. تابع خالص.

const working = (date: string, calendar: WorkCalendar): boolean => calendar.weekModes[weekdayIndex(date)] !== 'off' && !calendar.holidays.has(date);

export function reviewDueAt(enteredAt: Date, hours: number, calendar: WorkCalendar): Date {
  const due = new Date(enteredAt.getTime() + hours * 3_600_000);
  // تقویم خالی (پروژهٔ بی تقویم) همهٔ روزها را کاری می‌داند
  if (calendar.weekModes.length === 0) return due;
  const date = tehranClock(due).date;
  let target = date;
  for (let guard = 0; guard < 60 && !working(target, calendar); guard += 1) target = addDays(target, 1);
  if (target === date) return due;
  const shiftDays = Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  return new Date(due.getTime() + shiftDays * 86_400_000);
}
