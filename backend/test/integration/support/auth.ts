import type { Response } from 'supertest';
import { TEST_PASSWORD } from '../../fixtures/organizations.js';
import type { TestAgent, TestApp } from './app.js';

// گام‌های ورود از راه HTTP، همان‌طور که پنل وب می‌رود (W01 ← W03).

export const REFRESH_COOKIE = 'pj_refresh';

/** مقدار کوکی تازه‌سازی در Set-Cookie، یا null. */
export function refreshCookieOf(response: Response): string | null {
  const header = response.headers['set-cookie'] as unknown;
  const lines = Array.isArray(header) ? (header as string[]) : typeof header === 'string' ? [header] : [];
  const line = lines.find((item) => item.startsWith(`${REFRESH_COOKIE}=`));
  if (!line) return null;
  const value = line.slice(REFRESH_COOKIE.length + 1).split(';')[0] ?? '';
  return value ? decodeURIComponent(value) : '';
}

/** خط کامل Set-Cookie برای بررسی ویژگی‌ها. */
export function refreshCookieLine(response: Response): string | undefined {
  const header = response.headers['set-cookie'] as unknown;
  const lines = Array.isArray(header) ? (header as string[]) : typeof header === 'string' ? [header] : [];
  return lines.find((item) => item.startsWith(`${REFRESH_COOKIE}=`));
}

export function login(agent: TestAgent, identifier: string, password = TEST_PASSWORD) {
  return agent.post('/v1/auth/login').send({ identifier, password });
}

export function refresh(agent: TestAgent, cookie: string | null) {
  const call = agent.post('/v1/auth/refresh').set('X-Requested-With', 'projeyar');
  return cookie === null ? call : call.set('Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(cookie)}`);
}

export function logout(agent: TestAgent, cookie: string | null) {
  const call = agent.post('/v1/auth/logout').set('X-Requested-With', 'projeyar');
  return cookie === null ? call : call.set('Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(cookie)}`);
}

export interface SignedIn {
  readonly accessToken: string;
  readonly cookie: string;
}

/** ورود کامل با رمز و کد پیامکی. */
export async function signIn(test: TestApp, ip: string, mobile: string): Promise<SignedIn> {
  const agent = test.http(ip);
  const first = await login(agent, mobile).expect(200);
  const body = first.body as { data: { outcome: string; otpToken?: string; session?: { accessToken: string } } };
  if (body.data.outcome === 'success') {
    const cookie = refreshCookieOf(first);
    if (!body.data.session || !cookie) throw new Error('ورود بی‌OTP نشست نداد');
    return { accessToken: body.data.session.accessToken, cookie };
  }
  const second = await agent
    .post('/v1/auth/otp/verify')
    .send({ otpToken: body.data.otpToken, code: test.sms.lastCode(mobile) })
    .expect(200);
  const cookie = refreshCookieOf(second);
  if (!cookie) throw new Error('کوکی تازه‌سازی نیامد');
  return { accessToken: (second.body as { data: { accessToken: string } }).data.accessToken, cookie };
}
