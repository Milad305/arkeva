import { describe, expect, it } from 'vitest';
import { reviewDueAt } from './deadline.js';

// مهلت بررسی (approval-workflow.md ۴.۴؛ AC-AP-06 بخش تعطیلی).

const site = { weekModes: ['full', 'full', 'full', 'full', 'full', 'half', 'off'] as const, holidays: new Set(['2026-06-07']) };

describe('مهلت بررسی', () => {
  it('۲۴ ساعت در روز کاری همان است', () => {
    // سه‌شنبه 2026-06-02 ساعت ۱۰ تهران ← چهارشنبه ۱۰
    expect(reviewDueAt(new Date('2026-06-02T06:30:00Z'), 24, site).toISOString()).toBe('2026-06-03T06:30:00.000Z');
  });

  it('AC-AP-06 — مهلتی که جمعه می‌افتد به شنبه با همان ساعت می‌رود؛ تعطیلی پشت‌سرهم هم رد می‌شود', () => {
    // پنجشنبه 2026-06-04 ساعت ۱۰ ← جمعه ۱۰ ← شنبه 06-06 ساعت ۱۰
    expect(reviewDueAt(new Date('2026-06-04T06:30:00Z'), 24, site).toISOString()).toBe('2026-06-06T06:30:00.000Z');
    // شنبه 06-06 ← یکشنبه 06-07 تعطیل ← دوشنبه 06-08
    expect(reviewDueAt(new Date('2026-06-06T06:30:00Z'), 24, site).toISOString()).toBe('2026-06-08T06:30:00.000Z');
  });
});
