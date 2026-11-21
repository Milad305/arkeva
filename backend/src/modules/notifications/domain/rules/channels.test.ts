import { describe, expect, it } from 'vitest';
import { channelsFor, deliveryTime, groupOf, MATRIX_BY_CODE, matrixState, type Recipient } from './channels.js';

// کانال‌های اعلان (notifications.md ۴.۲، ۵.۱، ۵.۴).

const web: Recipient = { pmOrFinance: true, hasEmail: true, appUser: false, off: new Set() };
const app: Recipient = { pmOrFinance: false, hasEmail: false, appUser: true, off: new Set() };
const row = (code: string) => {
  const found = MATRIX_BY_CODE.get(code);
  if (!found) throw new Error(code);
  return found;
};

describe('کانال‌های اعلان', () => {
  it('AC-NT-01 — ماتریس W30: پیامک فقط رویداد فوری؛ na و locked_on عوض نمی‌شوند؛ پروژه بر سازمان غالب', () => {
    expect(matrixState(row('NT-APR-01'), { project: { sms: true, push: false } })).toEqual({ in_app: 'locked_on', email: 'off', sms: 'na', push: 'off' });
    expect(matrixState(row('AL-CST-01'), { org: { email: false }, project: { email: true } }).email).toBe('on');
    // حتی اگر ماتریس روشن باشد، پیامک غیرفوری فرستاده نمی‌شود
    expect(channelsFor('AL-CST-01', 'warning', web, { in_app: 'locked_on', email: 'on', sms: 'on', push: 'na' })).toEqual(['in_app', 'email']);
  });

  it('پیش‌فرض دسته‌ای: هشدار warning ← ایمیل فقط برای مدیر و مالی، پوش فقط کاربر اپ؛ بحرانی ایمیل؛ NT-ASG-01 پیامک (AC-NT-10)', () => {
    expect(channelsFor('AL-PRG-02', 'warning', web, null)).toEqual(['in_app', 'email']);
    expect(channelsFor('AL-PRG-02', 'warning', { ...web, pmOrFinance: false }, null)).toEqual(['in_app']);
    expect(channelsFor('AL-FLD-01', 'warning', app, null)).toEqual(['in_app', 'push']);
    expect(channelsFor('AL-PRG-02', 'critical', web, null)).toEqual(['in_app', 'email']);
    expect(channelsFor('NT-ASG-01', null, app, null)).toEqual(['in_app', 'sms', 'push']);
    expect(channelsFor('NT-RSK-05', null, { ...web, appUser: true }, null)).toEqual(['in_app']);
    expect(groupOf('NT-RSK-05')).toBe('risks');
  });

  it('ترجیح کاربر فقط کاهنده؛ in_app و اعلان الزامی خاموش نمی‌شوند', () => {
    const muted: Recipient = { ...app, off: new Set(['push', 'sms', 'in_app']) };
    expect(channelsFor('AL-FLD-01', 'warning', muted, null)).toEqual(['in_app']);
    expect(channelsFor('NT-ASG-01', null, muted, null)).toEqual(['in_app', 'sms', 'push']);
    expect(groupOf('AL-APR-01')).toBe('approvals');
    expect(groupOf('NT-FLD-04')).toBe('field');
    expect(groupOf('AL-CST-02')).toBe('alerts');
  });

  it('AC-NT-05 — ساعت آرام: پوش غیرفوری تا ۰۷:۰۰ تهران؛ پیامک و in_app و بحرانی فوری', () => {
    const quiet = { enabled: true, from: '21:00', to: '07:00' };
    const night = new Date('2026-06-21T19:30:00Z'); // ۲۳:۰۰ تهران
    expect(deliveryTime('push', 'warning', quiet, night).toISOString()).toBe('2026-06-22T03:30:00.000Z');
    expect(deliveryTime('email', null, quiet, night).toISOString()).toBe('2026-06-22T03:30:00.000Z');
    expect(deliveryTime('sms', null, quiet, night)).toBe(night);
    expect(deliveryTime('push', 'critical', quiet, night)).toBe(night);
    expect(deliveryTime('push', 'warning', quiet, new Date('2026-06-21T08:00:00Z')).toISOString()).toBe('2026-06-21T08:00:00.000Z');
    expect(deliveryTime('push', 'warning', { ...quiet, enabled: false }, night)).toBe(night);
  });
});
