import { describe, expect, it } from 'vitest';
import { DAILY_TICKS } from '../../../platform/scheduler/ticks.js';
import { digestText, reminderDue } from './daily-notices.js';

// خلاصهٔ روزانه و زمان یادآوری (notifications.md ۵.۶، ۵.۷).

describe('خلاصه و یادآوری روزانه', () => {
  it('AC-NT-08 — DigestTick ساعت ۰۷:۳۰ تهران؛ متن فقط از مقادیر داده‌شده، بی مبلغ، CPI و SPI برای همه', () => {
    expect(DAILY_TICKS.find((tick) => tick.name === 'DigestTick')).toMatchObject({ hour: 7, minute: 30 });
    const text = digestText({
      projectName: 'برج نمونه',
      progress: { actual: 49.2, planned: 55, deviation: -5.8, cpi: 0.9423, spi: 0.8909 },
      yesterdayActual: 48.7,
      alerts: { critical: 1, warning: 2, info: 0, top: ['انحراف آیتم 1.1.2', 'مصرف قلم C1'] },
      pendingItems: 4,
      overdueReviews: 1,
    });
    expect(text.title).toBe('خلاصهٔ روزانهٔ برج نمونه');
    expect(text.body).toContain('پیشرفت واقعی ۴۹٫۲٪ در برابر برنامه‌ای ۵۵٪');
    expect(text.body).toContain('+۰٫۵ نسبت به دیروز');
    expect(text.body).toContain('CPI ۰٫۹۴ · SPI ۰٫۸۹');
    expect(text.body).toContain('• انحراف آیتم 1.1.2');
    expect(text.body).toContain('۴ آیتم؛ معوق: ۱');
    expect(text.body).not.toMatch(/ریال/);
  });

  it('بی هشدار و تغییر، متن کوتاه می‌شود ولی حذف نمی‌شود', () => {
    const text = digestText({
      projectName: 'پ',
      progress: { actual: 10, planned: 10, deviation: 0, cpi: null, spi: null },
      yesterdayActual: 10,
      alerts: { critical: 0, warning: 0, info: 0, top: [] },
      pendingItems: 0,
      overdueReviews: 0,
    });
    expect(text.body.split('\n')).toHaveLength(2);
    expect(text.body).toContain('بدون تغییر نسبت به دیروز');
    expect(text.body).toContain('CPI — · SPI —');
  });

  it('یادآوری: نخستین تیک ساعتی در ساعت تنظیم یا پس از آن', () => {
    expect(reminderDue('17:00', 17 * 60 + 5)).toBe(true);
    expect(reminderDue('17:00', 16 * 60 + 5)).toBe(false);
    expect(reminderDue('17:30', 17 * 60 + 5)).toBe(false);
    expect(reminderDue('17:30', 18 * 60 + 5)).toBe(true);
    expect(reminderDue('17:00', 18 * 60 + 5)).toBe(false);
  });
});
