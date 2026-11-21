import { describe, expect, it } from 'vitest';
import { deviceName } from './device-name.js';
import { maskMobile, normalizeMobile, parseIdentifier } from './identifier.js';
import { afterFailedLogin, minutesLeft } from './lockout.js';

/** F01 ۵.۱ — قواعد خالص ورود. */

describe('شناسهٔ ورود', () => {
  it('F01 ۵.۱ — موبایل با ارقام فارسی، فاصله و پیش‌شمارهٔ ۹۸ یکسان می‌شود', () => {
    expect(normalizeMobile('۰۹۱۲ ۳۴۵ ۴۳۲۱')).toBe('09123454321');
    expect(normalizeMobile('+989123454321')).toBe('09123454321');
    expect(normalizeMobile('00989123454321')).toBe('09123454321');
    expect(normalizeMobile('9123454321')).toBe('09123454321');
    expect(normalizeMobile('0912345')).toBeNull();
  });

  it('F01 ۵.۱ — ایمیل کوچک می‌شود و موبایل نمی‌گیرد', () => {
    expect(parseIdentifier('  M.Ahmadi@Abadgaran.IR ')).toEqual({ mobile: null, email: 'm.ahmadi@abadgaran.ir' });
    expect(parseIdentifier('۰۹۱۲۳۴۵۴۳۲۱')).toEqual({ mobile: '09123454321', email: null });
  });

  it('W03 — شمارهٔ ستاره‌دار', () => {
    expect(maskMobile('09123454321')).toBe('0912 *** 4321');
  });
});

describe('قفل موقت', () => {
  const policy = { maxFailed: 5, lockMinutes: 15 };
  const now = new Date('2026-11-12T08:00:00Z');

  it('F01 ۵.۱ — پیش از پنجمین شکست قفل نمی‌شود و تلاش باقی‌مانده را می‌گوید', () => {
    expect(afterFailedLogin(0, policy, now)).toEqual({ failedCount: 1, lockedUntil: null, remainingAttempts: 4 });
    expect(afterFailedLogin(3, policy, now)).toEqual({ failedCount: 4, lockedUntil: null, remainingAttempts: 1 });
  });

  it('F01 ۵.۱ — پنجمین شکست پیاپی ۱۵ دقیقه قفل می‌کند', () => {
    const outcome = afterFailedLogin(4, policy, now);
    expect(outcome.remainingAttempts).toBe(0);
    expect(outcome.lockedUntil?.toISOString()).toBe('2026-11-12T08:15:00.000Z');
  });

  it('W02 — دقیقهٔ باقی‌مانده گرد به بالا و دست‌کم یک', () => {
    expect(minutesLeft(new Date('2026-11-12T08:14:01Z'), now)).toBe(15);
    expect(minutesLeft(new Date('2026-11-12T08:00:10Z'), now)).toBe(1);
  });
});

describe('نام دستگاه', () => {
  it('W32 — مرورگر و سیستم‌عامل از user-agent', () => {
    const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
    expect(deviceName(chrome)).toBe('Chrome روی Windows');
    expect(deviceName(null)).toBe('مرورگر وب');
  });
});
