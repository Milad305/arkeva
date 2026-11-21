import type { QueuePolicy } from 'pg-boss';

// صف‌های زیرساخت (docs/backend/08 ۳). صف هر ماژول کنار همان ماژول تعریف و با Jobs.define ثبت می‌شود.

export interface QueueDef {
  readonly name: string;
  readonly policy: QueuePolicy;
  /** F20 ۳.۱: تا ۸ بار با تأخیر نمایی، بعد صف dead. */
  readonly retryLimit: number;
  readonly retryDelaySec: number;
  readonly retryBackoff: boolean;
  readonly expireInSeconds: number;
  /** اولویت ارسال (F20 ۴: پیامک > محاسبات > اعلان > گزارش > فایل). */
  readonly priority: number;
  /** تعداد کار هم‌زمان در هر نمونهٔ کارگر. */
  readonly concurrency: number;
}

/** هر کاری که همهٔ تلاش‌هایش شکست خورد اینجا می‌ماند تا دستی دوباره پخش شود (F20 ۳.۱). */
export const DEAD_LETTER_QUEUE = 'dead.letter';
export const EVENT_DISPATCH_QUEUE = 'event.dispatch';

const RETRYING = { retryLimit: 8, retryDelaySec: 2, retryBackoff: true } as const;

export const PLATFORM_QUEUES: readonly QueueDef[] = [
  { name: DEAD_LETTER_QUEUE, policy: 'standard', retryLimit: 0, retryDelaySec: 0, retryBackoff: false, expireInSeconds: 60, priority: 0, concurrency: 1 },
  // سریالی به ازای پروژه، موازی میان پروژه‌ها (AC-PL-03): کلید = projectId یا orgId
  { name: EVENT_DISPATCH_QUEUE, policy: 'key_strict_fifo', ...RETRYING, expireInSeconds: 300, priority: 80, concurrency: 4 },
];

/**
 * صف هر مصرف‌کنندهٔ رویداد (08 ۲.۱). همان سیاست پخش: هر مصرف‌کننده رویدادهای یک پروژه را به ترتیب
 * و پروژه‌های مختلف را موازی می‌گیرد (AC-PL-03) `[پیش‌فرض فنی]` — 08 ۳ صف مصرف‌کننده را standard نوشته بود.
 */
export function consumerQueue(consumer: string): QueueDef {
  return { name: `consumer.${consumer}`, policy: 'key_strict_fifo', ...RETRYING, expireInSeconds: 600, priority: 50, concurrency: 4 };
}

/** صف هر تیک (08 ۴)؛ اجرای تکراری را tick_run بی‌اثر می‌کند. */
export function tickQueue(tick: string): QueueDef {
  return {
    name: `tick.${tick}`,
    policy: 'singleton',
    retryLimit: 3,
    retryDelaySec: 60,
    retryBackoff: true,
    expireInSeconds: 3600,
    priority: 70,
    concurrency: 1,
  };
}
