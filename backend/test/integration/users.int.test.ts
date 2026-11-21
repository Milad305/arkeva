import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ORG_ADMIN_ROLE_ID, SYSTEM_ROLE_IDS } from '../../src/database/system-ids.js';
import { seedOrg, type SeededOrg, TEST_PASSWORD } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { login, refresh, refreshCookieOf, signIn, type SignedIn } from './support/auth.js';

// برش ۱ — کاربران، دعوت، نقش‌ها، حساب من، بازیابی و انقضای رمز (F01؛ AC-AC-01، ۰۸، ۰۹، ۱۰، ۱۱، ۱۲).

type UserKey = 'admin' | 'admin2' | 'pm' | 'reviewer' | 'planner' | 'supervisor' | 'locked' | 'victim' | 'pwd' | 'expired' | 'device' | 'twofa';
type ProjectKey = 'main' | 'other' | 'closed';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let other: SeededOrg<'admin', never>;
const sessions = {} as Record<'admin' | 'pm' | 'admin2', SignedIn>;
let ipCounter = 0;
const nextIp = (): string => `10.60.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

const errorCode = (body: unknown): string => (body as { code: string }).code;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;

function as(token: string) {
  const agent = test.http(nextIp());
  const auth = (call: ReturnType<typeof agent.get>) => call.set('Authorization', `Bearer ${token}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
    patch: (path: string, body: object = {}) => auth(agent.patch(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
  };
}
const admin = () => as(sessions.admin.accessToken);
const pm = () => as(sessions.pm.accessToken);

async function userRow(id: string) {
  const { rows } = await test.owner.query<{ status: string; is_org_admin: boolean; two_factor_enabled: boolean; locked_until: Date | null }>(
    'select status, is_org_admin, two_factor_enabled, locked_until from app_user where id = $1',
    [id],
  );
  return rows[0];
}

async function userByMobile(mobile: string) {
  const { rows } = await test.owner.query<{ id: string; status: string }>('select id, status from app_user where mobile = $1', [mobile]);
  return rows[0];
}

async function activeMember(projectId: string, userId: string): Promise<boolean> {
  const { rows } = await test.owner.query("select 1 from project_member where project_id = $1 and user_id = $2 and status = 'active'", [projectId, userId]);
  return rows.length > 0;
}

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان کاربران',
    users: {
      admin: { mobile: '09141000001', orgAdmin: true },
      admin2: { mobile: '09141000002', orgAdmin: true },
      pm: { mobile: '09141000003' },
      reviewer: { mobile: '09141000004' },
      planner: { mobile: '09141000005' },
      supervisor: { mobile: '09141000006' },
      locked: { mobile: '09141000007', status: 'locked' },
      victim: { mobile: '09141000008' },
      pwd: { mobile: '09141000009' },
      expired: { mobile: '09141000010' },
      device: { mobile: '09141000011' },
      twofa: { mobile: '09141000012' },
    },
    projects: {
      main: { code: 'PRJ-1405-301', manager: 'pm', members: { pm: 'project_manager', reviewer: 'reviewer', planner: 'planner', supervisor: 'supervisor', victim: 'planner' } },
      other: { code: 'PRJ-1405-302', manager: 'admin', members: { admin: 'project_manager', victim: 'reviewer' } },
      closed: { code: 'PRJ-1405-303', manager: 'pm', status: 'archived', members: { pm: 'project_manager' } },
    },
  });
  other = await seedOrg(test.owner, { name: 'سازمان دیگر', users: { admin: { mobile: '09142000001', orgAdmin: true } } });
  sessions.admin = await signIn(test, nextIp(), org.users.admin.mobile);
  sessions.admin2 = await signIn(test, nextIp(), org.users.admin2.mobile);
  sessions.pm = await signIn(test, nextIp(), org.users.pm.mobile);
});

afterAll(async () => {
  await test?.close();
});

describe('F01 ۵.۶ — دعوت و فعال‌سازی', () => {
  it('AC-AC-09 — دعوت کاربر invited و دعوت ۷روزه می‌سازد، پیامک می‌فرستد و سهم مجوز می‌گیرد', async () => {
    const before = data<{ seats: { used: number } }>((await admin().get('/v1/users').expect(200)).body).seats.used;
    const response = await admin()
      .post('/v1/invitations', { fullName: 'مهندس تازه', mobile: '0914 300 0001', email: 'new.one@example.com', projectId: org.projects.main, roles: ['reviewer'] })
      .expect(201);
    expect(data(response.body)).toHaveProperty('invitationId');
    const invited = await userByMobile('09143000001');
    expect(invited?.status).toBe('invited');
    expect(test.sms.sent.at(-1)).toMatchObject({ to: '09143000001' });
    const list = data<{ seats: { used: number }; rows: { kind: string; fullName: string; contact: string | null }[] }>((await admin().get('/v1/users').expect(200)).body);
    expect(list.seats.used).toBe(before + 1);
    expect(list.rows.find((row) => row.fullName === 'مهندس تازه')).toMatchObject({ kind: 'invitation', contact: 'new.one@example.com' });
  });

  it('AC-AC-09 — ظرفیت پر: دعوت تازه SEATS_FULL؛ دعوت لغوشده سهم را آزاد می‌کند', async () => {
    const used = data<{ seats: { used: number } }>((await admin().get('/v1/users').expect(200)).body).seats.used;
    await test.owner.query('update organization set seat_limit = $1 where id = $2', [used + 1, org.orgId]);
    const first = await admin().post('/v1/invitations', { fullName: 'سهم آخر', mobile: '09143000002', projectId: org.projects.main, roles: ['planner'] }).expect(201);
    const full = await admin().post('/v1/invitations', { fullName: 'بی‌سهم', mobile: '09143000003', projectId: org.projects.main, roles: ['planner'] }).expect(409);
    expect(errorCode(full.body)).toBe('SEATS_FULL');
    await admin().delete(`/v1/invitations/${data<{ invitationId: string }>(first.body).invitationId}`).expect(200);
    await admin().post('/v1/invitations', { fullName: 'بی‌سهم', mobile: '09143000003', projectId: org.projects.main, roles: ['planner'] }).expect(201);
    await test.owner.query('update organization set seat_limit = 60 where id = $1', [org.orgId]);
  });

  it('§۷.۳ ردیف ۱۶ — شمارهٔ کاربر فعال (حتی در سازمان دیگر) دعوت نمی‌شود: IDENTITY_TAKEN', async () => {
    const own = await admin().post('/v1/invitations', { fullName: 'تکراری', mobile: org.users.reviewer.mobile, projectId: org.projects.main, roles: ['planner'] }).expect(409);
    expect(errorCode(own.body)).toBe('IDENTITY_TAKEN');
    const foreign = await admin().post('/v1/invitations', { fullName: 'تکراری', mobile: other.users.admin.mobile, projectId: org.projects.main, roles: ['planner'] }).expect(409);
    expect(errorCode(foreign.body)).toBe('IDENTITY_TAKEN');
  });

  it('F01 ۵.۶ — پروژهٔ بایگانی‌شده عضو تازه نمی‌گیرد؛ مدیر پروژه فقط در پروژهٔ خودش دعوت می‌کند', async () => {
    const closed = await admin().post('/v1/invitations', { fullName: 'بسته', mobile: '09143000004', projectId: org.projects.closed, roles: ['planner'] }).expect(409);
    expect(errorCode(closed.body)).toBe('PROJECT_READ_ONLY');
    const foreign = await pm().post('/v1/invitations', { fullName: 'دیگر', mobile: '09143000004', projectId: org.projects.other, roles: ['planner'] }).expect(403);
    expect(errorCode(foreign.body)).toBe('PERMISSION_DENIED');
    await pm().post('/v1/invitations', { fullName: 'دعوت مدیر پروژه', mobile: '09143000004', projectId: org.projects.main, roles: ['finance'] }).expect(201);
  });

  it('D11 — مدیر پروژه فقط اعضای پروژه‌های خودش را بی مخاطب می‌بیند', async () => {
    const list = data<{ rows: { userId: string | null; contact: string | null }[] }>((await pm().get('/v1/users').expect(200)).body);
    expect(list.rows.every((row) => row.contact === null)).toBe(true);
    expect(list.rows.some((row) => row.userId === org.users.admin2.id)).toBe(false);
    expect(list.rows.some((row) => row.userId === org.users.reviewer.id)).toBe(true);
    await as(sessions.pm.accessToken).post(`/v1/users/${org.users.reviewer.id}/unlock`).expect(403);
  });

  it('تصمیم 1405/08/22 — دعوت‌شده با «فراموشی رمز» فعال می‌شود و عضو پروژه می‌شود', async () => {
    await admin().post('/v1/invitations', { fullName: 'فعال‌شونده', mobile: '09143000005', projectId: org.projects.main, roles: ['reviewer'] }).expect(201);
    const agent = test.http(nextIp());
    const forgot = data<{ resetToken: string; maskedMobile: string }>((await agent.post('/v1/auth/forgot-password').send({ mobile: '09143000005' }).expect(200)).body);
    expect(forgot.maskedMobile).toBe('0914 *** 0005');
    const code = test.sms.lastCode('09143000005');
    const wrong = await test.http(nextIp()).post('/v1/auth/password/verify-code').send({ resetToken: forgot.resetToken, code: code === '000000' ? '111111' : '000000' }).expect(422);
    expect(errorCode(wrong.body)).toBe('OTP_INVALID');
    await test.http(nextIp()).post('/v1/auth/password/verify-code').send({ resetToken: forgot.resetToken, code }).expect(200);
    const reset = await test
      .http(nextIp())
      .post('/v1/auth/password/reset')
      .send({ resetToken: forgot.resetToken, code, newPassword: 'Fresh-Pass-1405', revokeOtherSessions: true })
      .expect(200);
    expect(refreshCookieOf(reset)).toBeTruthy();
    const user = await userByMobile('09143000005');
    expect(user?.status).toBe('active');
    expect(await activeMember(org.projects.main, user!.id)).toBe(true);
    const again = await test.http(nextIp()).post('/v1/auth/password/reset').send({ resetToken: forgot.resetToken, code, newPassword: 'Other-Pass-1405', revokeOtherSessions: true }).expect(422);
    expect(errorCode(again.body)).toBe('RESET_TOKEN_INVALID');
  });

  it('F01 ۵.۱ — شمارهٔ ناشناس همان پاسخ را می‌گیرد و پیامکی نمی‌رود', async () => {
    const count = test.sms.sent.length;
    const response = await test.http(nextIp()).post('/v1/auth/forgot-password').send({ mobile: '09149999999' }).expect(200);
    expect(data(response.body)).toMatchObject({ maskedMobile: '0914 *** 9999' });
    expect(test.sms.sent.length).toBe(count);
  });
});

describe('F01 ۵.۶ — مدیریت حساب‌ها', () => {
  it('AC-AC-01 — مدیر سازمان قفل حساب را باز می‌کند', async () => {
    await test.owner.query("update app_user set locked_until = now() + interval '10 minutes' where id = $1", [org.users.locked.id]);
    await admin().post(`/v1/users/${org.users.locked.id}/unlock`).expect(200);
    expect(await userRow(org.users.locked.id)).toMatchObject({ status: 'active', locked_until: null });
    const again = await admin().post(`/v1/users/${org.users.locked.id}/unlock`).expect(409);
    expect(errorCode(again.body)).toBe('USER_STATE_CONFLICT');
  });

  it('AC-AC-12 — آخرین مدیر سازمان برداشته نمی‌شود؛ کسی نقش خودش را کم نمی‌کند', async () => {
    const self = await admin().patch(`/v1/users/${org.users.admin.id}`, { isOrgAdmin: false }).expect(409);
    expect(errorCode(self.body)).toBe('SELF_ACTION_NOT_ALLOWED');
    await admin().patch(`/v1/users/${org.users.admin2.id}`, { isOrgAdmin: false }).expect(200);
    expect((await userRow(org.users.admin2.id))?.is_org_admin).toBe(false);
    await admin().patch(`/v1/users/${org.users.planner.id}`, { isOrgAdmin: true }).expect(200);
    const disable = await admin().get(`/v1/users/${org.users.admin.id}/disable-impact`).expect(200);
    expect(data<{ blockedReason: string | null }>(disable.body).blockedReason).toContain('خودتان');
    await admin().patch(`/v1/users/${org.users.planner.id}`, { isOrgAdmin: false }).expect(200);
  });

  it('F01 ۵.۶ — غیرفعال‌سازی: مدیر پروژه بسته است؛ دیگری از همهٔ پروژه‌ها خارج و نشستش باطل می‌شود', async () => {
    const blocked = await admin().post(`/v1/users/${org.users.pm.id}/disable`, { reason: 'آزمون' }).expect(409);
    expect(errorCode(blocked.body)).toBe('MEMBER_REMOVAL_BLOCKED');

    const victim = await signIn(test, nextIp(), org.users.victim.mobile);
    const impact = data<{ projects: { projectId: string; blockedReason: string | null }[] }>((await admin().get(`/v1/users/${org.users.victim.id}/disable-impact`).expect(200)).body);
    expect(impact.projects.map((row) => row.projectId).sort()).toEqual([org.projects.main, org.projects.other].sort());
    await admin().post(`/v1/users/${org.users.victim.id}/disable`, { reason: 'پایان همکاری', transfers: {} }).expect(200);
    expect((await userRow(org.users.victim.id))?.status).toBe('disabled');
    expect(await activeMember(org.projects.main, org.users.victim.id)).toBe(false);
    expect(await activeMember(org.projects.other, org.users.victim.id)).toBe(false);
    await refresh(test.http(nextIp()), victim.cookie).expect(401);

    await admin().post(`/v1/users/${org.users.victim.id}/enable`).expect(200);
    expect((await userRow(org.users.victim.id))?.status).toBe('active');
    expect(await activeMember(org.projects.main, org.users.victim.id)).toBe(false);
  });

  it('§۷.۳ ردیف ۱۷ — کاربری که فقط نقش سرپرست دارد به پنل وب وارد نمی‌شود', async () => {
    const response = await login(test.http(nextIp()), org.users.supervisor.mobile).expect(403);
    expect(errorCode(response.body)).toBe('WEB_ACCESS_APP_ONLY');
  });

  it('F01 ۵.۶ — ورود از فایل: پیش‌نمایش بی تغییر، commit دعوت و افزودن عضو', async () => {
    const rows = [
      { line: 2, fullName: 'ردیف تازه', mobile: '۰۹۱۴۳۰۰۰۰۰۶', email: '', projectCode: 'prj-1405-301', role: 'واحد مالی' },
      { line: 3, fullName: 'برنامه‌ریز', mobile: org.users.planner.mobile, email: '', projectCode: 'PRJ-1405-302', role: 'planner' },
      { line: 4, fullName: 'بی‌پروژه', mobile: '09143000007', email: '', projectCode: 'PRJ-0000', role: 'planner' },
      { line: 5, fullName: 'برنامه‌ریز', mobile: org.users.planner.mobile, email: '', projectCode: 'PRJ-1405-301', role: 'planner' },
    ];
    const preview = data<{ counts: Record<string, number>; committed: boolean }>((await admin().post('/v1/users/import?commit=false', { rows }).expect(200)).body);
    expect(preview).toMatchObject({ committed: false, counts: { invite: 1, add: 1, unchanged: 1, error: 1 } });
    expect(await userByMobile('09143000006')).toBeUndefined();
    const committed = data<{ counts: Record<string, number> }>((await admin().post('/v1/users/import?commit=true', { rows }).expect(200)).body);
    expect(committed.counts).toMatchObject({ invite: 1, add: 1 });
    expect((await userByMobile('09143000006'))?.status).toBe('invited');
    expect(await activeMember(org.projects.other, org.users.planner.id)).toBe(true);
  });

  it('F01 ۵.۶ — عملیات گروهی: دعوت دوباره فرستاده می‌شود؛ کاربر بی دعوت رد می‌شود', async () => {
    const list = data<{ rows: { rowId: string; kind: string; fullName: string }[] }>((await admin().get('/v1/users').expect(200)).body);
    const invitation = list.rows.find((row) => row.kind === 'invitation');
    const result = data<{ done: number; skipped: { reason: string }[] }>(
      (await admin().post('/v1/users/bulk', { action: 'resend', rowIds: [invitation!.rowId, org.users.reviewer.id] }).expect(200)).body,
    );
    expect(result.done).toBe(1);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'دعوت در انتظار ندارد' })]);
  });

  it('org.settings — ورود دومرحله‌ای اجباری سازمان', async () => {
    await admin().patch('/v1/org/security', { require2fa: true }).expect(200);
    const users = data<{ require2fa: boolean }>((await admin().get('/v1/users').expect(200)).body);
    expect(users.require2fa).toBe(true);
    await admin().patch('/v1/org/security', { require2fa: false }).expect(200);
  });
});

describe('F01 ۵.۱ و ۵.۷ — حساب من، رمز و دستگاه', () => {
  it('AC-AC-10 — رمز فعلی غلط، سیاست رمز و رمز تکراری رد؛ رمز درست می‌نشیند', async () => {
    const me = await signIn(test, nextIp(), org.users.pwd.mobile);
    const other = await signIn(test, nextIp(), org.users.pwd.mobile);
    const call = () => as(me.accessToken);
    expect(errorCode((await call().put('/v1/me/password', { current: 'Wrong-1405', next: 'Valid-Pass-1', signOutOthers: false }).expect(422)).body)).toBe('PASSWORD_INCORRECT');
    expect(errorCode((await call().put('/v1/me/password', { current: TEST_PASSWORD, next: 'short', signOutOthers: false }).expect(422)).body)).toBe('PASSWORD_POLICY');
    expect(errorCode((await call().put('/v1/me/password', { current: TEST_PASSWORD, next: TEST_PASSWORD, signOutOthers: false }).expect(422)).body)).toBe('PASSWORD_REUSED');
    // AC-AC-11 — خروج از همهٔ دستگاه‌های دیگر
    const changed = data<{ signedOut: number }>((await call().put('/v1/me/password', { current: TEST_PASSWORD, next: 'Brand-New-1405', signOutOthers: true }).expect(200)).body);
    expect(changed.signedOut).toBe(1);
    await refresh(test.http(nextIp()), other.cookie).expect(401);
    await refresh(test.http(nextIp()), me.cookie).expect(200);
    const back = await call().put('/v1/me/password', { current: 'Brand-New-1405', next: TEST_PASSWORD, signOutOthers: false }).expect(422);
    expect(errorCode(back.body)).toBe('PASSWORD_REUSED');
  });

  it('تصمیم 1405/08/22 — رمز منقضی پس از کد پیامکی توکن «رمز تازه» می‌دهد و بی کد عوض می‌شود', async () => {
    await test.owner.query("update app_user set password_changed_at = now() - interval '100 days' where id = $1", [org.users.expired.id]);
    const agent = test.http(nextIp());
    const first = data<{ otpToken: string }>((await login(agent, org.users.expired.mobile).expect(200)).body);
    const expired = await agent.post('/v1/auth/otp/verify').send({ otpToken: first.otpToken, code: test.sms.lastCode(org.users.expired.mobile) }).expect(403);
    expect(errorCode(expired.body)).toBe('PASSWORD_EXPIRED');
    const resetToken = (expired.body as { details: { resetToken: string } }).details.resetToken;
    const reset = await test.http(nextIp()).post('/v1/auth/password/reset').send({ resetToken, newPassword: 'Renewed-Pass-1', revokeOtherSessions: true }).expect(200);
    expect(data<{ user: { id: string } }>(reset.body).user.id).toBe(org.users.expired.id);
  });

  it('W03 — «این دستگاه را به خاطر بسپار» مرحلهٔ کد را تا ۳۰ روز می‌بخشد', async () => {
    const agent = test.http(nextIp());
    const first = data<{ otpToken: string }>((await login(agent, org.users.device.mobile).expect(200)).body);
    const verified = await agent
      .post('/v1/auth/otp/verify')
      .send({ otpToken: first.otpToken, code: test.sms.lastCode(org.users.device.mobile), trustDevice: true })
      .expect(200);
    const cookies = ([] as string[]).concat((verified.headers['set-cookie'] as unknown as string[] | undefined) ?? []);
    const device = cookies.find((line) => line.startsWith('pj_device='));
    expect(device).toContain('HttpOnly');
    const value = device!.split(';')[0]!;
    const again = await test.http(nextIp()).post('/v1/auth/login').set('Cookie', value).send({ identifier: org.users.device.mobile, password: TEST_PASSWORD }).expect(200);
    expect(data<{ outcome: string }>(again.body).outcome).toBe('success');
  });

  it('F01 ۵.۷ — پروفایل، ترجیحات، دستگاه‌ها و تاریخچهٔ ورود', async () => {
    const me = await signIn(test, nextIp(), org.users.twofa.mobile);
    const call = () => as(me.accessToken);
    const account = data<{ profile: { fullName: string }; sessions: { current: boolean }[]; security: { rotationDays: number } }>((await call().get('/v1/me').expect(200)).body);
    expect(account.sessions.some((session) => session.current)).toBe(true);
    expect(account.security.rotationDays).toBe(90);
    const updated = data<{ profile: { fullName: string; department: string | null } }>(
      (await call().patch('/v1/me', { fullName: 'نام تازه کاربر', jobTitle: 'کارشناس', department: 'مالی' }).expect(200)).body,
    );
    expect(updated.profile).toMatchObject({ fullName: 'نام تازه کاربر', department: 'مالی' });
    await call().patch('/v1/me', { preferences: { calendar: 'gregorian', digits: 'latin', amountScale: 'million', startPage: null } }).expect(200);
    const history = data<{ result: string }[]>((await call().get('/v1/me/login-history?days=30').expect(200)).body);
    expect(history[0]?.result).toBe('success');
    const current = account.sessions.find((session) => session.current) as unknown as { id: string };
    expect(errorCode((await call().delete(`/v1/me/sessions/${current.id}`).expect(409)).body)).toBe('SESSION_IS_CURRENT');
  });

  it('F01 ۵.۷ — ورود دومرحله‌ای: خاموش با رمز، اجبار سازمان، روشن با کد step-up و ۸ کد پشتیبان', async () => {
    const me = await signIn(test, nextIp(), org.users.twofa.mobile);
    const call = () => as(me.accessToken);
    await admin().patch('/v1/org/security', { require2fa: true }).expect(200);
    expect(errorCode((await call().post('/v1/me/2fa/disable', { password: TEST_PASSWORD }).expect(409)).body)).toBe('TWO_FACTOR_REQUIRED_BY_ORG');
    await admin().patch('/v1/org/security', { require2fa: false }).expect(200);
    await call().post('/v1/me/2fa/disable', { password: TEST_PASSWORD }).expect(200);
    expect((await userRow(org.users.twofa.id))?.two_factor_enabled).toBe(false);
    expect(errorCode((await call().post('/v1/me/2fa/backup-codes').expect(409)).body)).toBe('TWO_FACTOR_OFF');

    await call().post('/v1/auth/step-up', { purpose: 'account.enable_2fa', subjectId: org.users.twofa.id }).expect(200);
    const enabled = data<{ backupCodes: string[] }>((await call().post('/v1/me/2fa/enable', { code: test.sms.lastCode(org.users.twofa.mobile) }).expect(200)).body);
    expect(enabled.backupCodes).toHaveLength(8);
    expect((await userRow(org.users.twofa.id))?.two_factor_enabled).toBe(true);
    const account = data<{ security: { backupCodesLeft: number } }>((await call().get('/v1/me').expect(200)).body);
    expect(account.security.backupCodesLeft).toBe(8);
  });
});

describe('W27 — نقش‌ها و ماتریس دسترسی', () => {
  const plannerId = SYSTEM_ROLE_IDS.planner;

  it('access-control ۵.۲ — نقش‌ها با کاتالوگ؛ مدیر سازمان قفل است', async () => {
    const roles = data<{ roles: { id: string; kind: string; modified: boolean; userCount: number }[]; catalog: unknown[] }>((await admin().get('/v1/roles').expect(200)).body);
    expect(roles.roles[0]).toMatchObject({ id: ORG_ADMIN_ROLE_ID, kind: 'admin' });
    expect(roles.roles.filter((role) => role.kind === 'system')).toHaveLength(6);
    expect(roles.catalog.length).toBeGreaterThan(0);
    const locked = await admin().put(`/v1/roles/${ORG_ADMIN_ROLE_ID}/permissions`, { grants: [], reason: null }).expect(409);
    expect(errorCode(locked.body)).toBe('ROLE_LOCKED');
    await pm().get('/v1/roles').expect(403);
  });

  it('AC-AC-08 — ذخیرهٔ دسترسی: ممیزی قبل/بعد با دلیل، رویداد، اثر روی دسترسی و بازگشت به پیش‌فرض', async () => {
    const roles = data<{ roles: { id: string; grants: { code: string; scope: string }[]; defaults: { code: string; scope: string }[] | null }[] }>(
      (await admin().get('/v1/roles').expect(200)).body,
    );
    const planner = roles.roles.find((role) => role.id === plannerId)!;
    const without = planner.grants.filter((grant) => grant.code !== 'wbs.edit');
    const impact = data<{ perRole: { users: number }[] }>((await admin().post('/v1/roles/impact', { changes: [{ roleId: plannerId, grants: without }] }).expect(200)).body);
    expect(impact.perRole[0]?.users).toBeGreaterThan(0);

    const saved = data<{ modified: boolean }>((await admin().put(`/v1/roles/${plannerId}/permissions`, { grants: without, reason: 'برنامه‌ریز فقط می‌بیند' }).expect(200)).body);
    expect(saved.modified).toBe(true);
    const audit = await test.owner.query<{ reason: string; before: { grants: unknown[] }; after: { grants: unknown[] } }>(
      "select reason, before, after from audit_log where org_id = $1 and entity_id = $2 and action = 'role.permissions_changed'",
      [org.orgId, plannerId],
    );
    expect(audit.rows[0]).toMatchObject({ reason: 'برنامه‌ریز فقط می‌بیند' });
    expect(audit.rows[0]!.before.grants.length - audit.rows[0]!.after.grants.length).toBe(1);
    const events = await test.owner.query("select 1 from domain_event where org_id = $1 and type = 'RolePermissionChanged'", [org.orgId]);
    expect(events.rows.length).toBeGreaterThan(0);

    const plannerSession = await signIn(test, nextIp(), org.users.planner.mobile);
    const me = data<{ permissions: { code: string }[] }>((await as(plannerSession.accessToken).get('/v1/auth/me').expect(200)).body);
    expect(me.permissions.some((grant) => grant.code === 'wbs.edit')).toBe(false);
    // سازمان دیگر پیش‌فرض را دارد
    const foreign = await test.owner.query('select 1 from org_role_custom where org_id = $1', [other.orgId]);
    expect(foreign.rows).toHaveLength(0);

    const trail = data<{ roleName: string; removed: { code: string }[] }[]>((await admin().get('/v1/roles/audit').expect(200)).body);
    expect(trail[0]?.removed.map((grant) => grant.code)).toEqual(['wbs.edit']);

    const reverted = data<{ modified: boolean }>((await admin().put(`/v1/roles/${plannerId}/permissions`, { grants: planner.defaults, reason: null }).expect(200)).body);
    expect(reverted.modified).toBe(false);
    const rows = await test.owner.query('select 1 from org_role_grant where org_id = $1', [org.orgId]);
    expect(rows.rows).toHaveLength(0);
  });

  it('OD-09 — نقش سفارشی با کپی ساخته و حذف می‌شود؛ نقش سیستمی حذف نمی‌شود', async () => {
    const created = data<{ id: string; kind: string; grants: unknown[] }>((await admin().post('/v1/roles', { name: 'ناظر مقیم', copyFromId: SYSTEM_ROLE_IDS.reviewer }).expect(201)).body);
    expect(created.kind).toBe('custom');
    expect(created.grants.length).toBeGreaterThan(0);
    expect(errorCode((await admin().post('/v1/roles', { name: 'ناظر مقیم', copyFromId: null }).expect(409)).body)).toBe('ROLE_NAME_TAKEN');
    const hidden = await as((await signIn(test, nextIp(), other.users.admin.mobile)).accessToken).get('/v1/roles').expect(200);
    expect(data<{ roles: { id: string }[] }>(hidden.body).roles.some((role) => role.id === created.id)).toBe(false);
    expect(errorCode((await admin().delete(`/v1/roles/${SYSTEM_ROLE_IDS.reviewer}`).expect(409)).body)).toBe('ROLE_IN_USE');
    await admin().delete(`/v1/roles/${created.id}`).expect(200);
  });
});
