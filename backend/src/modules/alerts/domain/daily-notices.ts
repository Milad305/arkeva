import { fa } from './text.js';

// متن خلاصهٔ روزانه NT-DIG-01 (notifications.md ۵.۶) و قاعدهٔ زمان یادآوری NT-FLD-04 (۵.۷) — تابع خالص.
//   • فقط از مقادیر ذخیره‌شده (AC-NT-08). مبلغ (BAC، AC، EAC) نمی‌آید؛ CPI و SPI برای همه (اصلاح 1405/08/22).
//   • نبودن هشدار یا تغییر ارسال را حذف نمی‌کند، فقط متن کوتاه می‌شود.
//   • ریسک‌ها با F14 (برش ریسک) به خلاصه افزوده می‌شوند.

export interface DigestFacts {
  readonly projectName: string;
  readonly progress: {
    readonly actual: number;
    readonly planned: number;
    readonly deviation: number;
    readonly cpi: number | null;
    readonly spi: number | null;
  } | null;
  /** پیشرفت واقعی snapshot دیروز (تهی = نیست). */
  readonly yesterdayActual: number | null;
  readonly alerts: { readonly critical: number; readonly warning: number; readonly info: number; readonly top: readonly string[] };
  readonly pendingItems: number;
  readonly overdueReviews: number;
}

const ratio = (value: number | null) => (value === null ? '—' : fa(value, 2));

export function digestText(facts: DigestFacts): { title: string; body: string } {
  const title = `خلاصهٔ روزانهٔ ${facts.projectName}`;
  const lines: string[] = [];
  const p = facts.progress;
  if (p) {
    const delta = facts.yesterdayActual === null ? null : p.actual - facts.yesterdayActual;
    const change = delta === null || Math.abs(delta) < 0.05 ? 'بدون تغییر نسبت به دیروز' : `${delta > 0 ? '+' : '−'}${fa(Math.abs(delta))} نسبت به دیروز`;
    lines.push(`پیشرفت واقعی ${fa(p.actual)}٪ در برابر برنامه‌ای ${fa(p.planned)}٪ (انحراف ${fa(p.deviation)}؛ ${change}).`);
    lines.push(`CPI ${ratio(p.cpi)} · SPI ${ratio(p.spi)}`);
  } else {
    lines.push('پیشرفت هنوز محاسبه نشده است.');
  }
  const open = facts.alerts.critical + facts.alerts.warning + facts.alerts.info;
  if (open > 0) {
    lines.push(`هشدارهای باز: ${fa(facts.alerts.critical, 0)} بحرانی، ${fa(facts.alerts.warning, 0)} هشدار، ${fa(facts.alerts.info, 0)} اطلاع.`);
    for (const item of facts.alerts.top) lines.push(`• ${item}`);
  }
  if (facts.pendingItems > 0 || facts.overdueReviews > 0) {
    lines.push(`گزارش‌های در انتظار: ${fa(facts.pendingItems, 0)} آیتم؛ معوق: ${fa(facts.overdueReviews, 0)}.`);
  }
  return { title, body: lines.join('\n') };
}

/**
 * آیا تیک ساعتی جاری (دقیقهٔ ۵ هر ساعت) نوبت یادآوری است؟ نخستین تیک در `dailyReminderTime` یا پس از آن، در همان ساعت
 * (۱۷:۰۰ ← ۱۷:۰۵؛ ۱۷:۳۰ ← ۱۸:۰۵) `[پیش‌فرض فنی]`.
 */
export function reminderDue(time: string, minuteOfDay: number): boolean {
  const target = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return minuteOfDay >= target && minuteOfDay < target + 60;
}
