import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// حداقل نسخهٔ اپ کارگاه (field-app.md ۵.۳؛ تصمیم 1405/08/30): سرآیند X-App-Version و ۴۲۶ APP_VERSION_UNSUPPORTED فقط برای ترافیک اپ.

let test: TestApp;
let org: SeededOrg<'pm', 'live'>;
let webToken: string;
let ip = 0;
const nextIp = () => `10.89.0.${++ip}`;

beforeAll(async () => {
  test = await startTestApp({ env: { APP_MIN_VERSION: '1.2.0' } });
  org = await seedOrg(test.owner, {
    name: 'سازمان نسخه',
    users: { pm: { mobile: '09169100001' } },
    projects: { live: { code: 'PRJ-1405-991', manager: 'pm', members: { pm: 'project_manager' } } },
  });
  webToken = (await signIn(test, nextIp(), org.users.pm.mobile)).accessToken;
}, 120_000);

afterAll(async () => {
  await test?.close();
});

const requestCode = (version?: string) => {
  const call = test.http(nextIp()).post('/v1/auth/app/request-code');
  return (version ? call.set('X-App-Version', version) : call).send({ mobile: '09169100009' });
};

describe('F08 ۵.۳ — حداقل نسخهٔ اپ', () => {
  it('مسیر اپ: نسخهٔ کمتر یا بی سرآیند ← ۴۲۶ با پیام فارسی و retryable: false؛ برابر یا بیشتر ← عادی', async () => {
    const old = await requestCode('1.1.9+40').expect(426);
    expect(old.body).toMatchObject({ code: 'APP_VERSION_UNSUPPORTED', retryable: false, details: { minVersion: '1.2.0', currentVersion: '1.1.9+40' } });
    expect((old.body as { message: string }).message).toMatch(/به‌روز/);
    expect(((await requestCode().expect(426)).body as { code: string }).code).toBe('APP_VERSION_UNSUPPORTED');
    await requestCode('1.2.0+7').expect(200);
    await requestCode('2.0').expect(200);
  });

  it('مسیر مشترک: وب بی سرآیند بررسی نمی‌شود؛ با سرآیند قدیمی ۴۲۶', async () => {
    const agent = () => test.http(nextIp());
    await agent().get('/v1/notifications/unread-count').set('Authorization', `Bearer ${webToken}`).expect(200);
    await agent().get('/v1/notifications/unread-count').set('Authorization', `Bearer ${webToken}`).set('X-App-Version', '1.0.0').expect(426);
    await agent().get(`/v1/projects/${org.projects.live}/members`).set('Authorization', `Bearer ${webToken}`).set('X-App-Version', '1.0.0').expect(200);
  });
});
