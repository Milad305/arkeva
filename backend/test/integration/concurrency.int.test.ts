import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { VerifyOtpCommand } from '../../src/modules/identity/application/otp.commands.js';
import { seedOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { login, refresh, refreshCookieOf, signIn } from './support/auth.js';

// هم‌روندی (docs/backend/05 ۹؛ الگوی 09 ۴): دو کار هم‌زمان، هر کدام با EntityManager جدا؛ پس از هر دو
// تعداد ردیف‌ها و نتیجه‌ها بررسی می‌شود، نه ترتیب. ماژول تأیید (approvals) هنوز ساخته نشده؛ این‌ها همان
// الگو روی انتقال‌های حالتی‌اند که امروز هست: مصرف کد پیامکی، چرخش کوکی، شمارش تلاش ناموفق.

let test: TestApp;

beforeAll(async () => {
  test = await startTestApp();
});

afterAll(async () => {
  await test?.close();
});

async function count(sql: string, params: unknown[]): Promise<number> {
  const { rows } = await test.owner.query<{ count: string }>(sql, params);
  return Number(rows[0]?.count ?? 0);
}

describe('05 ۹ — هم‌روندی', () => {
  it('09 ۴ — دو تأیید هم‌زمان یک کد پیامکی: یکی نشست می‌گیرد، دیگری OTP_EXPIRED؛ فقط یک نشست و یک ورود موفق', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان هم‌روندی ۱', users: { sina: { mobile: '09127000001' } } });
    const first = await login(test.http('10.8.0.1'), '09127000001').expect(200);
    const { otpToken } = (first.body as { data: { otpToken: string } }).data;
    const code = test.sms.lastCode('09127000001');

    const orm = test.app.get(MikroORM);
    const command = test.app.get(VerifyOtpCommand);
    const meta = { ip: '10.8.0.1', userAgent: 'vitest', client: 'web' as const };
    // هر فراخوان RequestContext خودش = EntityManager جدا (fork)، مثل دو درخواست HTTP
    const verify = () => RequestContext.create(orm.em, () => command.execute({ otpToken, code }, meta));

    const results = await Promise.allSettled([verify(), verify()]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: 'OTP_EXPIRED' });

    expect(await count('select count(*) from auth_session where user_id = $1', [org.users.sina.id])).toBe(1);
    expect(
      await count(`select count(*) from login_attempt where user_id = $1 and result = 'success'`, [org.users.sina.id]),
    ).toBe(1);
  });

  it('05 ۹ — دو تازه‌سازی هم‌زمان با یک کوکی: فقط یک چرخش و نشست باطل نمی‌شود', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان هم‌روندی ۲', users: { tara: { mobile: '09127000002' } } });
    const signedIn = await signIn(test, '10.8.0.2', '09127000002');
    const agent = test.http('10.8.0.2');

    const responses = await Promise.all([refresh(agent, signedIn.cookie), refresh(agent, signedIn.cookie)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const rotated = responses.map(refreshCookieOf).filter((cookie): cookie is string => typeof cookie === 'string');
    expect(rotated).toHaveLength(1);

    const { rows } = await test.owner.query<{ revoked_at: Date | null }>('select revoked_at from auth_session where user_id = $1', [
      org.users.tara.id,
    ]);
    expect(rows).toEqual([{ revoked_at: null }]);
    await refresh(agent, rotated[0] ?? null).expect(200);
  });

  it('05 ۹ — پنج رمز نادرست هم‌زمان: شمارنده دقیقاً ۵ و حساب یک بار قفل می‌شود', async () => {
    const org = await seedOrg(test.owner, { name: 'سازمان هم‌روندی ۳', users: { hamed: { mobile: '09127000003' } } });
    // هر درخواست از IP جدا تا محدودیت نرخ در کار نباشد؛ قفل ردیف کاربر شمارش را سریالی می‌کند
    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map((index) => login(test.http(`10.8.1.${index}`), '09127000003', 'wrong')),
    );
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([401, 401, 401, 401, 423]);

    const { rows } = await test.owner.query<{ failed_login_count: number; status: string }>(
      'select failed_login_count, status from app_user where id = $1',
      [org.users.hamed.id],
    );
    expect(rows[0]).toEqual({ failed_login_count: 5, status: 'locked' });
    expect(test.sms.sent.filter((message) => message.to === '09127000003')).toHaveLength(1);
  });
});
