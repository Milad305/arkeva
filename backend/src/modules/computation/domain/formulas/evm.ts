import { divRoundHalfUp } from './cbs.js';

// شاخص‌های ارزش کسب‌شده و پیش‌بینی (F11؛ evm.md ۴–۶؛ cbs.md ۸؛ progress-calculation.md ۵.۵). تابع خالص؛ مبالغ bigint
// ریال، نسبت‌ها با دقت کامل (C04)؛ EAC با گرد نیمه به بالا روی مبلغ نهایی (C02).

export type EacMethod = 'cpi' | 'remaining' | 'composite';
export type ItemStatus = 'not_started' | 'on_track' | 'ahead' | 'warning' | 'critical' | 'completed';

export interface EvmInput {
  readonly bac: bigint;
  readonly pv: bigint;
  /** EV در تاریخ داده (برای SV و SPI). */
  readonly ev: bigint;
  /** EV در تاریخ شاخص‌های هزینه t_c (OD-19). */
  readonly evAtCost: bigint;
  /** AC تا t_c. */
  readonly ac: bigint;
  readonly method: EacMethod;
}

export interface EvmResult {
  readonly cv: bigint;
  readonly sv: bigint;
  readonly cpi: number | null;
  readonly spi: number | null;
  readonly eac: bigint;
  readonly eacRemaining: bigint;
  readonly eacComposite: bigint | null;
  readonly vac: bigint;
  /** بر پایهٔ BAC؛ null وقتی AC ≥ BAC («فراتر از بودجه»). */
  readonly tcpi: number | null;
  /** بر پایهٔ EAC — فقط راهنمای عدد. */
  readonly tcpiEac: number | null;
  /** EV کمتر از ۱۰٪ BAC (evm.md ۵). */
  readonly lowConfidence: boolean;
}

export function evm(input: EvmInput): EvmResult {
  const { bac, pv, ev, evAtCost, ac } = input;
  const cpi = evAtCost > 0n && ac > 0n ? Number(evAtCost) / Number(ac) : null;
  const spi = pv > 0n ? Number(ev) / Number(pv) : null;
  // EV یا AC صفر ← CPI تعریف‌نشده و EAC = max(BAC, AC) (evm.md ۵)
  const eacCpi = cpi === null ? (bac > ac ? bac : ac) : divRoundHalfUp(bac * ac, evAtCost);
  const eacRemaining = ac + (bac - evAtCost);
  // (BAC − EV) ÷ (CPI × SPI) = (BAC − EV) × AC × PV ÷ (EV_tc × EV) — با bigint تا ممیز شناور وارد مبلغ نشود (C02)
  const eacComposite = cpi !== null && spi !== null && ev > 0n ? ac + divRoundHalfUp((bac - evAtCost) * ac * pv, evAtCost * ev) : null;
  const eac = input.method === 'remaining' ? eacRemaining : input.method === 'composite' ? (eacComposite ?? eacCpi) : eacCpi;
  return {
    cv: evAtCost - ac,
    sv: ev - pv,
    cpi,
    spi,
    eac,
    eacRemaining,
    eacComposite,
    vac: bac - eac,
    tcpi: bac > ac ? Number(bac - evAtCost) / Number(bac - ac) : null,
    tcpiEac: eac > ac ? Number(bac - evAtCost) / Number(eac - ac) : null,
    lowConfidence: bac > 0n && evAtCost * 10n < bac,
  };
}

export interface EarnedSchedule {
  /** روز کاری از شروع که PV در آن به EV می‌رسید (درون‌یابی خطی). */
  readonly es: number;
  readonly spiT: number;
  /** مدت پیش‌بینی‌شده به روز کاری. */
  readonly forecastDuration: number;
  /** تأخیر پیش‌بینی‌شده به روز کاری، گرد نیمه به بالا. */
  readonly delayDays: number;
}

/**
 * Earned Schedule (evm.md ۶؛ OD-07). `pvCurve[k]` = PV تجمعی پایان روز کاری k (k=0 شروع، پیش از هر کار)؛ آخرین نقطه = BAC
 * در پایان برنامه. `at` = روزهای کاری سپری‌شده تا تاریخ داده. EV صفر ← null.
 */
export function earnedSchedule(pvCurve: readonly number[], ev: number, at: number): EarnedSchedule | null {
  if (ev <= 0 || at <= 0 || pvCurve.length < 2) return null;
  const duration = pvCurve.length - 1;
  let es = duration;
  for (let k = 1; k < pvCurve.length; k += 1) {
    const before = pvCurve[k - 1] as number;
    const after = pvCurve[k] as number;
    if (after >= ev) {
      // منحنی مسطح: اولین نقطهٔ برابر (۷)
      es = after === before ? k : k - 1 + (ev - before) / (after - before);
      break;
    }
  }
  const spiT = es / at;
  const forecastDuration = duration / spiT;
  return { es, spiT, forecastDuration, delayDays: Math.round(forecastDuration - duration + 1e-9) };
}

/** وضعیت آیتم از انحراف گرد‌نشده و آستانه‌های پروژه (progress-calculation.md ۵.۵). */
export function itemStatus(actual: number, planned: number, thresholds: { readonly warning: number; readonly critical: number }): ItemStatus {
  if (actual >= 100) return 'completed';
  if (actual === 0 && planned === 0) return 'not_started';
  const d = actual - planned;
  if (d <= -thresholds.critical) return 'critical';
  if (d <= -thresholds.warning) return 'warning';
  if (d <= 0) return 'on_track';
  return 'ahead';
}

/**
 * پیش‌بینی پایان برگ (evm.md ۶.۳): نرخ ۱۴ روز تقویمی اخیر به واحد درصد در روز کاری؛ نرخ ≤ ۰ ← میانگین از شروع؛ برگ
 * شروع‌نشده ← تاریخ برنامه‌ای؛ برگ تمام‌شده ← تاریخ آخرین تأیید. خروجی شمار روز کاری پس از تاریخ داده یا تاریخ ثابت.
 */
export function leafForecastDays(input: {
  readonly actualNow: number;
  readonly actual14DaysAgo: number;
  /** روزهای کاری آن ۱۴ روز. */
  readonly workDaysIn14: number;
  /** روزهای کاری از نخستین تأیید تا تاریخ داده. */
  readonly workDaysSinceStart: number;
}): number | null {
  if (input.actualNow >= 100) return 0;
  const recent = input.workDaysIn14 > 0 ? (input.actualNow - input.actual14DaysAgo) / input.workDaysIn14 : 0;
  const rate = recent > 0 ? recent : input.workDaysSinceStart > 0 && input.actualNow > 0 ? input.actualNow / input.workDaysSinceStart : 0;
  if (rate <= 0) return null;
  return Math.ceil((100 - input.actualNow) / rate - 1e-9);
}

export interface CbsItemFigures {
  readonly budget: bigint;
  readonly ac: bigint;
  readonly ev: bigint;
  readonly consumedPercent: number | null;
  readonly cpi: number | null;
  readonly eac: bigint;
  readonly eacVariancePercent: number | null;
  readonly eacLowConfidence: boolean;
}

/** شاخص‌های برگ CBS (cbs.md ۸). والد را فراخواننده با جمع فرزندان می‌سازد. */
export function cbsLeafFigures(budget: bigint, ac: bigint, ev: bigint): CbsItemFigures {
  const cpi = ev > 0n && ac > 0n ? Number(ev) / Number(ac) : null;
  const eac = ev > 0n && ac > 0n ? divRoundHalfUp(budget * ac, ev) : budget > ac ? budget : ac;
  return figures(budget, ac, ev, eac, cpi);
}

export function cbsParentFigures(children: readonly CbsItemFigures[]): CbsItemFigures {
  const sum = (key: 'budget' | 'ac' | 'ev' | 'eac') => children.reduce((total, child) => total + child[key], 0n);
  const ac = sum('ac');
  const ev = sum('ev');
  return figures(sum('budget'), ac, ev, sum('eac'), ev > 0n && ac > 0n ? Number(ev) / Number(ac) : null);
}

function figures(budget: bigint, ac: bigint, ev: bigint, eac: bigint, cpi: number | null): CbsItemFigures {
  return {
    budget,
    ac,
    ev,
    consumedPercent: budget > 0n ? (Number(ac) * 100) / Number(budget) : null,
    cpi,
    eac,
    eacVariancePercent: budget > 0n ? (Number(eac - budget) * 100) / Number(budget) : null,
    eacLowConfidence: budget > 0n && ev * 10n < budget,
  };
}
