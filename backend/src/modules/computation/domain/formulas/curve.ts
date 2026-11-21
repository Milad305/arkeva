import { addDays } from '../../../../platform/scheduler/ticks.js';
import { type ModelNode, planSpan, stateAt } from './engine.js';
import { earnedSchedule } from './evm.js';
import { scheduleSpan, type WorkCalendar } from './schedule.js';

// منحنی‌های منحنی S (charts.md ۵، ۶.۲، ۶.۳؛ evm.md ۶.۲) — تابع خالص.
//   • versionCurve: درصد برنامه‌ای و PV پایان هر روز تقویمی یک نسخه با همان موتور پیشرفت (stateAt بی آیتم تأییدشده).
//   • forecastSeries: پیش‌بینی = PV_ref(ES + k × SPI(t)) روی روزهای کاری پس از تاریخ داده تا رسیدن به ۱۰۰٪ (OD-07).
//   • sampleDates: کاهش نقطه با نگه داشتن نقطه‌های کلیدی (charts.md ۱۰: حداکثر ۷۰۰).

export interface CurveRow {
  readonly date: string;
  readonly planned: number;
  readonly pv: number;
  readonly bac: number;
}

export function versionCurve(nodes: readonly ModelNode[], calendar: WorkCalendar): CurveRow[] {
  const model = { reference: nodes, shapes: new Map(), outOfReference: [], approved: new Map(), calendar };
  const span = planSpan(model);
  if (!span) return [];
  const rows: CurveRow[] = [];
  for (let date = span.start; date <= span.finish; date = addDays(date, 1)) {
    const state = stateAt(model, date);
    rows.push({ date, planned: state.planned, pv: state.pv, bac: state.bac });
  }
  return rows;
}

const isWorkDay = (date: string, calendar: WorkCalendar) => (scheduleSpan(date, date, calendar)?.workDays ?? 0) > 0;

/**
 * سری پیش‌بینی از تاریخ داده: `{date, percent}` روزهای کاری بعد تا ۱۰۰٪. EV صفر یا پیش از شروع ← خالی.
 * `rows` منحنی روزانهٔ نسخهٔ مرجع PV است.
 */
export function forecastSeries(
  rows: readonly CurveRow[],
  calendar: WorkCalendar,
  ev: number,
  actual: number,
  dataDate: string,
): { date: string; percent: number }[] {
  const workDays = rows.filter((row) => isWorkDay(row.date, calendar));
  const bac = rows.at(-1)?.bac ?? 0;
  if (workDays.length === 0 || bac <= 0) return [];
  const pvCurve = [0, ...workDays.map((row) => row.pv)];
  const at = workDays.filter((row) => row.date <= dataDate).length;
  const es = earnedSchedule(pvCurve, ev, at);
  if (!es) return [];
  const duration = pvCurve.length - 1;
  const percentAt = (position: number) => {
    if (position >= duration) return 100;
    const lower = Math.floor(position);
    const fraction = position - lower;
    const pv = (pvCurve[lower] as number) + ((pvCurve[lower + 1] as number) - (pvCurve[lower] as number)) * fraction;
    return (pv / bac) * 100;
  };
  const points = [{ date: dataDate, percent: actual }];
  let date = dataDate;
  for (let k = 1; k < 20_000; k += 1) {
    do date = addDays(date, 1);
    while (!isWorkDay(date, calendar));
    const percent = Math.max(actual, percentAt(es.es + k * es.spiT));
    points.push({ date, percent });
    if (percent >= 100) break;
  }
  return points;
}

/** تاریخ‌های نمونه: هر `step` روز یکی، به‌علاوهٔ همهٔ نقطه‌های کلیدی؛ حداکثر حدود `max`. */
export function sampleDates(all: readonly string[], keys: readonly string[], max: number): string[] {
  const sorted = [...new Set(all)].sort();
  const step = Math.max(1, Math.ceil(sorted.length / Math.max(1, max - keys.length)));
  const picked = new Set(sorted.filter((_date, index) => index % step === 0));
  if (sorted.length > 0) picked.add(sorted[sorted.length - 1] as string);
  for (const key of keys) if (sorted.includes(key)) picked.add(key);
  return [...picked].sort();
}
