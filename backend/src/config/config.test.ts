import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

/** docs/backend/04 ۹ و 10 ۲ — پیکربندی نادرست یعنی برنامه بالا نمی‌آید. */

const BASE = {
  DB_URL: 'postgres://app:secret@localhost:5432/projeyar',
  JWT_KEYS: 'k1:0123456789abcdef0123456789abcdef',
};

describe('پیکربندی', () => {
  it('10 ۲ — پیش‌فرض‌های توسعه', () => {
    const config = loadConfig(BASE);
    expect(config.env).toBe('development');
    expect(config.swaggerEnabled).toBe(true);
    expect(config.auth.jwtKeys).toEqual([{ kid: 'k1', secret: '0123456789abcdef0123456789abcdef' }]);
    expect(config.auth.otpDevCode).toBeNull();
  });

  it('تصمیم 1405/08/21 — کد ثابت OTP در production برنامه را از بالا آمدن باز می‌دارد', () => {
    expect(() => loadConfig({ ...BASE, NODE_ENV: 'production', OTP_DEV_CODE: '123456' })).toThrow(/OTP_DEV_CODE/);
    expect(loadConfig({ ...BASE, OTP_DEV_CODE: '123456' }).auth.otpDevCode).toBe('123456');
  });

  it('07 ۲ — کلید JWT کوتاه پذیرفته نیست و کوکی ناامن در production نه', () => {
    expect(() => loadConfig({ ...BASE, JWT_KEYS: 'k1:short' })).toThrow(/۳۲/);
    expect(() => loadConfig({ ...BASE, NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
  });

  it('04 ۹ — همهٔ خطاها یک‌جا گزارش می‌شوند', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/DB_URL[\s\S]*JWT_KEYS|JWT_KEYS[\s\S]*DB_URL/);
  });

  it('F08 ۵.۳ — حداقل نسخهٔ اپ اختیاری و با قالب نسخه', () => {
    expect(loadConfig(BASE).fieldApp.minVersion).toBeNull();
    expect(loadConfig({ ...BASE, APP_MIN_VERSION: '1.2.0' }).fieldApp.minVersion).toBe('1.2.0');
    expect(() => loadConfig({ ...BASE, APP_MIN_VERSION: 'v1' })).toThrow(/APP_MIN_VERSION/);
  });
});
