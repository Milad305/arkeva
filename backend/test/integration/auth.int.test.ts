import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, TEST_PASSWORD } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { login, logout, refresh, refreshCookieLine, refreshCookieOf, signIn } from './support/auth.js';

// ورود، کد پیامکی، قفل، چرخش کوکی و خروج (F01 ۵.۱؛ W01–W03؛ docs/backend/07 ۲).

let test: TestApp;

/** پیشوند سازمان خوش‌شکل ولی ناموجود؛ بقیهٔ توکن بدشکل. */
const MALFORMED_ORG = '00000000-0000-7000-8000-000000000000';

interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
  retryable: boolean;
}
const errorOf = (body: unknown): ErrorBody => body as ErrorBody;

async function attempts(userId: string): Promise<{ result: string; method: string }[]> {
  const rows = await test.owner.query<{ result: string; method: string }>(
    'select result, method from login_attempt where user_id = $1 order by created_at, id',
    [userId],
  );
  return rows.rows;
}

async function sessionRow(userId: string): Promise<{ revoked: boolean; revoke_reason: string | null }[]> {
  const rows = await test.owner.query<{ revoked: boolean; revoke_reason: string | null }>(
    'select revoked_at is not null as revoked, revoke_reason from auth_session where user_id = $1 order by created_at',
    [userId],
  );
  return rows.rows;
}

beforeAll(async () => {
  test = await startTestApp();
});

afterAll(async () => {
  await test?.close();
});

describe('F01 ۵.۱ — ورود با رمز و کد پیامکی', () => {
  it('W02 — رمز نادرست ۴۰۱ با شمار تلاش باقی‌مانده و ثبت در login_attempt', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان ورود ۱', users: { ali: { mobile: '09121000001' } } });
    const response = await login(test.http('10.1.0.1'), '09121000001', 'wrong-password').expect(401);

    expect(errorOf(response.body)).toMatchObject({ code: 'INVALID_CREDENTIALS', retryable: false });
    expect(errorOf(response.body).details).toEqual({ remainingAttempts: 4 });
    expect(errorOf(response.body).traceId).toMatch(/^ERR-[0-9A-F]{4}-\d{2}$/);
    expect(await attempts(org.users.ali.id)).toEqual([{ result: 'bad_password', method: 'password' }]);
  });

  it('W02 — کاربر ناموجود همان ۴۰۱ را بی‌شمار تلاش می‌گیرد', async () => {
    const response = await login(test.http('10.1.0.2'), '09129999999').expect(401);
    expect(errorOf(response.body).code).toBe('INVALID_CREDENTIALS');
    expect(errorOf(response.body).details).toBeUndefined();
  });

  it('W03 — رمز درست ← otp_required؛ کد نادرست OTP_INVALID؛ کد درست ← نشست و کوکی HttpOnly', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان ورود ۲', users: { sara: { mobile: '09121000002', orgAdmin: true } } });
    const agent = test.http('10.1.0.3');

    const first = await login(agent, '09121000002').expect(200);
    const step = (first.body as { data: { outcome: string; otpToken: string; maskedMobile: string; resendAfterSec: number } }).data;
    expect(step).toMatchObject({ outcome: 'otp_required', maskedMobile: '0912 *** 0002', resendAfterSec: 60 });
    expect(refreshCookieOf(first)).toBeNull();

    const code = test.sms.lastCode('09121000002');
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await agent.post('/v1/auth/otp/verify').send({ otpToken: step.otpToken, code: wrong }).expect(401);
    expect(errorOf(bad.body).code).toBe('OTP_INVALID');

    const ok = await agent.post('/v1/auth/otp/verify').send({ otpToken: step.otpToken, code }).expect(200);
    const session = (ok.body as { success: boolean; data: { accessToken: string; user: { id: string; isOrgAdmin: boolean } } });
    expect(session.success).toBe(true);
    expect(session.data.user).toMatchObject({ id: org.users.sara.id, isOrgAdmin: true });

    const line = refreshCookieLine(ok) ?? '';
    expect(line).toMatch(/HttpOnly/i);
    expect(line).toMatch(/SameSite=Strict/i);
    expect(line).toMatch(/Path=\/v1\/auth/);
    expect(refreshCookieOf(ok)?.startsWith(`${org.orgId}.`)).toBe(true);

    const me = await agent.get('/v1/auth/me').set('Authorization', `Bearer ${session.data.accessToken}`).expect(200);
    expect((me.body as { data: { user: { id: string } } }).data.user.id).toBe(org.users.sara.id);

    expect(await attempts(org.users.sara.id)).toEqual([
      { result: 'otp_failed', method: 'otp' },
      { result: 'success', method: 'otp' },
    ]);
  });

  it('W03 — کد مصرف‌شده دوباره پذیرفته نمی‌شود', async () => {
    await seedOrg(test.owner, { name: 'سازمان ورود ۳', users: { reza: { mobile: '09121000003' } } });
    const agent = test.http('10.1.0.4');
    const first = await login(agent, '09121000003').expect(200);
    const { otpToken } = (first.body as { data: { otpToken: string } }).data;
    const code = test.sms.lastCode('09121000003');

    await agent.post('/v1/auth/otp/verify').send({ otpToken, code }).expect(200);
    const again = await agent.post('/v1/auth/otp/verify').send({ otpToken, code }).expect(401);
    expect(errorOf(again.body).code).toBe('OTP_EXPIRED');
  });

  it('W03 — توکن مرحلهٔ دوم بدشکل ۴۰۱ OTP_EXPIRED، نه ۵۰۰', async () => {
    const agent = test.http('10.1.0.9');
    const malformed = await agent.post('/v1/auth/otp/verify').send({ otpToken: `${MALFORMED_ORG}.x.y`, code: '123456' }).expect(401);
    expect(errorOf(malformed.body).code).toBe('OTP_EXPIRED');
    const resend = await agent.post('/v1/auth/otp/resend').send({ otpToken: `${MALFORMED_ORG}.x.y` }).expect(401);
    expect(errorOf(resend.body).code).toBe('OTP_EXPIRED');
  });

  it('W03 — کد پس از پنج دقیقه منقضی است', async () => {
    await seedOrg(test.owner, { name: 'سازمان ورود ۴', users: { mina: { mobile: '09121000004' } } });
    const agent = test.http('10.1.0.5');
    const first = await login(agent, '09121000004').expect(200);
    const { otpToken } = (first.body as { data: { otpToken: string } }).data;

    test.clock.advance(test.config.auth.otpTtlSec * 1000 + 1);
    const late = await agent.post('/v1/auth/otp/verify').send({ otpToken, code: test.sms.lastCode('09121000004') }).expect(401);
    expect(errorOf(late.body).code).toBe('OTP_EXPIRED');
  });

  it('F01 ۵.۱ — کاربر بی‌ورود دومرحله‌ای مستقیم نشست و کوکی می‌گیرد', async () => {
    await seedOrg(test.owner, { name: 'سازمان ورود ۵', users: { nima: { mobile: '09121000005', twoFactor: false } } });
    const response = await login(test.http('10.1.0.6'), '09121000005').expect(200);
    const data = (response.body as { data: { outcome: string; session: { accessToken: string } } }).data;
    expect(data.outcome).toBe('success');
    expect(data.session.accessToken).toEqual(expect.any(String));
    expect(refreshCookieOf(response)).toEqual(expect.any(String));
  });

  it('F01 ۵.۱ — ورود با ایمیل، بی‌حساسیت به حروف', async () => {
    await seedOrg(test.owner, {
      name: 'سازمان ورود ۶',
      users: { elham: { mobile: '09121000006', email: 'Elham@Example.ir', twoFactor: false } },
    });
    const response = await login(test.http('10.1.0.7'), 'elham@example.IR').expect(200);
    expect((response.body as { data: { outcome: string } }).data.outcome).toBe('success');
  });

  it('§۷.۳ ردیف ۱۶ — موبایل در کل نصب یکتاست (تصمیم کاربر 1405/08/22): سازمان دوم همان شماره را نمی‌گیرد', async () => {
    await seedOrg(test.owner, { name: 'سازمان یکتا الف', users: { one: { mobile: '09121000007' } } });
    await expect(seedOrg(test.owner, { name: 'سازمان یکتا ب', users: { two: { mobile: '09121000007' } } })).rejects.toMatchObject({ code: '23505' });
    const response = await login(test.http('10.1.0.8'), '09121000007').expect(200);
    expect((response.body as { data: { outcome: string } }).data.outcome).toBe('otp_required');
  });
});

describe('W02 — قفل پس از ۵ تلاش ناموفق', () => {
  it('W02 — پنجمین رمز نادرست حساب را قفل و پیامک هشدار می‌فرستد؛ رمز درست هم تا پایان قفل ۴۲۳', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان قفل ۱', users: { omid: { mobile: '09122000001' } } });
    const agent = test.http('10.2.0.1');

    for (const remaining of [4, 3, 2, 1]) {
      const response = await login(agent, '09122000001', 'wrong').expect(401);
      expect(errorOf(response.body).details).toEqual({ remainingAttempts: remaining });
    }
    const fifth = await login(agent, '09122000001', 'wrong').expect(423);
    expect(errorOf(fifth.body)).toMatchObject({ code: 'ACCOUNT_LOCKED', details: { lockMinutes: 15 } });
    expect(test.sms.sent.filter((message) => message.to === '09122000001')).toHaveLength(1);

    // رمز درست از IP دیگر (محدودیت نرخ جداست) هم در قفل رد می‌شود
    const correct = await login(test.http('10.2.0.2'), '09122000001', TEST_PASSWORD).expect(423);
    expect(errorOf(correct.body).code).toBe('ACCOUNT_LOCKED');

    const user = await test.owner.query<{ status: string; failed_login_count: number }>(
      'select status, failed_login_count from app_user where id = $1',
      [org.users.omid.id],
    );
    expect(user.rows[0]).toEqual({ status: 'locked', failed_login_count: 5 });
    expect((await attempts(org.users.omid.id)).map((row) => row.result)).toEqual([
      'bad_password',
      'bad_password',
      'bad_password',
      'bad_password',
      'locked',
      'locked',
    ]);
  });

  it('W02 — پس از پایان قفل، رمز درست ورود را ادامه می‌دهد و شمارنده صفر می‌شود', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان قفل ۲', users: { leila: { mobile: '09122000002' } } });
    const agent = test.http('10.2.0.3');
    for (let index = 0; index < 4; index += 1) await login(agent, '09122000002', 'wrong').expect(401);
    await login(agent, '09122000002', 'wrong').expect(423);

    test.clock.advance(test.config.auth.loginLockMin * 60_000 + 1_000);
    const response = await login(test.http('10.2.0.4'), '09122000002').expect(200);
    expect((response.body as { data: { outcome: string } }).data.outcome).toBe('otp_required');

    const user = await test.owner.query<{ status: string; failed_login_count: number; locked_until: Date | null }>(
      'select status, failed_login_count, locked_until from app_user where id = $1',
      [org.users.leila.id],
    );
    expect(user.rows[0]).toEqual({ status: 'active', failed_login_count: 0, locked_until: null });
  });

  it('F20 — محدودیت نرخ: ششمین درخواست ورود از یک IP در یک دقیقه ۴۲۹', async () => {
    await seedOrg(test.owner, { name: 'سازمان نرخ', users: { saba: { mobile: '09122000003' } } });
    const agent = test.http('10.2.0.5');
    for (let index = 0; index < 5; index += 1) await login(agent, '09129999990', 'wrong');
    const response = await login(agent, '09122000003').expect(429);
    expect(errorOf(response.body)).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });
});

describe('07 ۲ — چرخش کوکی تازه‌سازی', () => {
  it('07 ۲ — تازه‌سازی کوکی تازه و توکن دسترسی معتبر می‌دهد', async () => {
    await seedOrg(test.owner, { name: 'سازمان چرخش ۱', users: { arash: { mobile: '09123000001' } } });
    const signedIn = await signIn(test, '10.3.0.1', '09123000001');
    const agent = test.http('10.3.0.1');

    const response = await refresh(agent, signedIn.cookie).expect(200);
    const rotated = refreshCookieOf(response);
    expect(rotated).toEqual(expect.any(String));
    expect(rotated).not.toBe(signedIn.cookie);

    const token = (response.body as { data: { accessToken: string } }).data.accessToken;
    await agent.get('/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    await refresh(agent, rotated).expect(200);
  });

  it('07 ۲ — کوکی پیشین در مهلت هم‌زمانی: نشست بی‌چرخش دوباره (دو زبانهٔ یک مرورگر)', async () => {
    await seedOrg(test.owner, { name: 'سازمان چرخش ۲', users: { bahar: { mobile: '09123000002' } } });
    const signedIn = await signIn(test, '10.3.0.2', '09123000002');
    const agent = test.http('10.3.0.2');

    const first = await refresh(agent, signedIn.cookie).expect(200);
    const rotated = refreshCookieOf(first);
    test.clock.advance(5_000);
    const second = await refresh(agent, signedIn.cookie).expect(200);
    expect(refreshCookieOf(second)).toBeNull();
    await refresh(agent, rotated).expect(200);
  });

  it('07 ۲ — استفادهٔ دوباره از کوکی پیشین پس از مهلت: کل نشست باطل (reuse_detected)', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان چرخش ۳', users: { kian: { mobile: '09123000003' } } });
    const signedIn = await signIn(test, '10.3.0.3', '09123000003');
    const agent = test.http('10.3.0.3');

    const first = await refresh(agent, signedIn.cookie).expect(200);
    const rotated = refreshCookieOf(first);
    test.clock.advance(21_000);

    const stolen = await refresh(agent, signedIn.cookie).expect(401);
    expect(errorOf(stolen.body).code).toBe('SESSION_EXPIRED');
    // کوکی پاک می‌شود
    expect(refreshCookieOf(stolen)).toBe('');
    // صاحب واقعی هم با کوکی تازه دیگر راه ندارد و باید دوباره وارد شود
    await refresh(agent, rotated).expect(401);
    expect(await sessionRow(org.users.kian.id)).toEqual([{ revoked: true, revoke_reason: 'reuse_detected' }]);
  });

  it('07 ۲ — نشست بی‌کار بیش از ۳۰ دقیقه منقضی است', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان چرخش ۴', users: { dana: { mobile: '09123000004' } } });
    const signedIn = await signIn(test, '10.3.0.4', '09123000004');

    test.clock.advance(test.config.auth.refreshIdleTtlMin * 60_000 + 1_000);
    const response = await refresh(test.http('10.3.0.4'), signedIn.cookie).expect(401);
    expect(errorOf(response.body).code).toBe('SESSION_EXPIRED');
    expect((await sessionRow(org.users.dana.id))[0]?.revoke_reason).toBe('expired');
  });

  it('07 ۲ — بی سرآیند X-Requested-With تازه‌سازی ۴۰۳ است (دفاع CSRF)', async () => {
    await seedOrg(test.owner, { name: 'سازمان چرخش ۵', users: { hoda: { mobile: '09123000005' } } });
    const signedIn = await signIn(test, '10.3.0.5', '09123000005');
    const response = await test
      .http('10.3.0.5')
      .post('/v1/auth/refresh')
      .set('Cookie', `pj_refresh=${encodeURIComponent(signedIn.cookie)}`)
      .expect(403);
    expect(errorOf(response.body).code).toBe('CLIENT_HEADER_REQUIRED');
  });

  it('07 ۲ — بی کوکی یا با کوکی بدشکل ۴۰۱، نه ۵۰۰', async () => {
    const agent = test.http('10.3.0.6');
    expect(errorOf((await refresh(agent, null).expect(401)).body).code).toBe('SESSION_EXPIRED');
    expect(errorOf((await refresh(agent, 'not-a-token').expect(401)).body).code).toBe('SESSION_EXPIRED');
    expect(errorOf((await refresh(agent, `${MALFORMED_ORG}.not-a-uuid.secret`).expect(401)).body).code).toBe('SESSION_EXPIRED');
  });
});

describe('F01 — خروج', () => {
  it('F01 — خروج نشست را باطل و کوکی را پاک می‌کند؛ تازه‌سازی بعدی ۴۰۱', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان خروج ۱', users: { pari: { mobile: '09124000001' } } });
    const signedIn = await signIn(test, '10.4.0.1', '09124000001');
    const agent = test.http('10.4.0.1');

    const response = await logout(agent, signedIn.cookie).expect(204);
    expect(refreshCookieOf(response)).toBe('');
    expect(await sessionRow(org.users.pari.id)).toEqual([{ revoked: true, revoke_reason: 'logout' }]);

    await refresh(agent, signedIn.cookie).expect(401);
  });

  it('F01 — خروج با کوکی پیشین (پس از چرخش، در مهلت) هم نشست را می‌بندد', async () => {
    await seedOrg(test.owner, { name: 'سازمان خروج ۲', users: { yas: { mobile: '09124000002' } } });
    const signedIn = await signIn(test, '10.4.0.2', '09124000002');
    const agent = test.http('10.4.0.2');
    const rotated = refreshCookieOf(await refresh(agent, signedIn.cookie).expect(200));

    await logout(agent, signedIn.cookie).expect(204);
    await refresh(agent, rotated).expect(401);
  });

  it('F01 — خروج بی کوکی یا با کوکی نامعتبر همیشه ۲۰۴', async () => {
    const agent = test.http('10.4.0.3');
    await logout(agent, null).expect(204);
    await logout(agent, `${MALFORMED_ORG}.x.y`).expect(204);
  });

  it('F01 — خروج بی سرآیند X-Requested-With ۴۰۳', async () => {
    const response = await test.http('10.4.0.4').post('/v1/auth/logout').expect(403);
    expect(errorOf(response.body).code).toBe('CLIENT_HEADER_REQUIRED');
  });
});

describe('F01 — ثبت‌نام خودکار سازمان جدید (Self-Signup)', () => {
  it('سه‌مرحله‌ای: ارسال کد ← بررسی کد ← ساخت سازمان، مدیر سازمان، ۸ نوع پروژهٔ استاندارد و نشست فعال', async () => {
    const agent = test.http('10.8.0.1');
    const mobile = '09128880001';

    const requested = await agent.post('/v1/auth/register/request-code').send({ mobile }).expect(200);
    const step1 = (requested.body as { data: { signupToken: string; maskedMobile: string; resendAfterSec: number } }).data;
    expect(step1.maskedMobile).toBe('0912 *** 0001');

    const code = test.sms.lastCode(mobile);
    const wrong = code === '000000' ? '111111' : '000000';
    const badCode = await agent.post('/v1/auth/register/verify-code').send({ signupToken: step1.signupToken, code: wrong }).expect(422);
    expect(errorOf(badCode.body).code).toBe('OTP_INVALID');

    await agent.post('/v1/auth/register/verify-code').send({ signupToken: step1.signupToken, code }).expect(200);

    const completed = await agent
      .post('/v1/auth/register/complete')
      .send({
        signupToken: step1.signupToken,
        code,
        organizationName: 'شرکت مهندسی سازه‌گستر البرز',
        fullName: 'مهندس کاوه راد',
        email: 'kaveh@sazehgostar.ir',
        password: TEST_PASSWORD,
      })
      .expect(200);

    const session = (
      completed.body as {
        success: boolean;
        data: {
          accessToken: string;
          user: { id: string; fullName: string; isOrgAdmin: boolean };
          organization: { id: string; name: string; activeProjectCount: number };
        };
      }
    ).data;
    expect(session.user).toMatchObject({ fullName: 'مهندس کاوه راد', isOrgAdmin: true });
    expect(session.organization).toMatchObject({ name: 'شرکت مهندسی سازه‌گستر البرز', activeProjectCount: 0 });
    expect(refreshCookieOf(completed)?.startsWith(`${session.organization.id}.`)).toBe(true);

    // انواع پروژهٔ استاندارد برای سازمان تازه آماده است
    const types = await test.owner.query<{ count: string }>('select count(*)::text as count from project_type where org_id = $1', [
      session.organization.id,
    ]);
    expect(types.rows[0]?.count).toBe('8');

    // فهرست پروژه‌های سازمان تازه خالی است و دسترسی مدیر سازمان کامل است
    const projects = await agent.get('/v1/projects').set('Authorization', `Bearer ${session.accessToken}`).expect(200);
    expect((projects.body as { data: unknown[] }).data).toEqual([]);

    // توکن ثبت‌نام مصرف‌شده دوباره پذیرفته نمی‌شود و شمارهٔ ثبت‌شده مجدداً اجازهٔ ثبت‌نام نمی‌گیرد
    const replay = await agent
      .post('/v1/auth/register/complete')
      .send({
        signupToken: step1.signupToken,
        code,
        organizationName: 'سازمان تکراری',
        fullName: 'تکرار',
        password: TEST_PASSWORD,
      })
      .expect(422);
    expect(errorOf(replay.body).code).toBe('SIGNUP_TOKEN_INVALID');

    const duplicate = await test.http('10.8.0.2').post('/v1/auth/register/request-code').send({ mobile }).expect(409);
    expect(errorOf(duplicate.body).code).toBe('SIGNUP_MOBILE_TAKEN');

    // ورود بعدی با همان شماره و رمز عبور جدید کار می‌کند
    const nextLogin = await login(test.http('10.8.0.3'), mobile, TEST_PASSWORD).expect(200);
    expect((nextLogin.body as { data: { outcome: string } }).data.outcome).toBe('otp_required');
  });
});
