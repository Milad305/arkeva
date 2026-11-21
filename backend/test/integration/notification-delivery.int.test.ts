import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DailyNotices } from '../../src/modules/alerts/application/daily-notices.js';
import { DeadLetterNotifications } from '../../src/modules/notifications/application/dead-letter.consumer.js';
import { NotificationDelivery } from '../../src/modules/notifications/application/notification-delivery.js';
import { Notifier, type NotifyInput } from '../../src/modules/notifications/index.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۱۲ب — ارسال اعلان در کانال‌ها (F13؛ notifications.md ۴.۲، ۵.۱، ۵.۴–۵.۷؛ AC-NT-01، ۰۵، ۰۶، ۰۸، ۰۹، ۱۰).
// زمان: یکشنبه ۱۴۰۵/۰۳/۳۱ (2026-06-21) ← شب همان روز ← صبح دوشنبه ← جمعه (تعطیل تقویم پروژه).

type UserKey = 'pm' | 'admin' | 'sup1' | 'sup2';
type ProjectKey = 'a' | 'b';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const plans = {} as Record<ProjectKey, ReferencePlan>;
let pmToken = '';
let ipCounter = 0;
const nextIp = (): string => `10.71.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const leaf = (project: ProjectKey, key: string) => plans[project].ids.get(key) as string;

function asPm() {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (name: string, value: string) => T }>(req: T) => req.set('Authorization', `Bearer ${pmToken}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    put: (path: string, body: object) => auth(agent.put(path)).send(body),
    post: (path: string, body: object) => auth(agent.post(path)).send(body),
  };
}

/** کار سیستمی در سازمان (مثل مصرف‌کننده و کار صف). */
function inOrg<T>(fn: () => Promise<T>): Promise<T> {
  const orm = test.app.get(MikroORM);
  return test.app.get(ClsService).run(() => {
    test.app.get(AppContext).setJobScope({ orgId: org.orgId, traceId: 'ERR-NT12-00' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return fn();
    });
  });
}

const notify = (input: Omit<NotifyInput, 'orgId'>) => inOrg(() => test.app.get(MikroORM).em.transactional((tx) => test.app.get(Notifier).notify(tx, input)));

interface Row extends Record<string, unknown> {
  id: string;
  channel: string;
  status: string;
  scheduled_at: Date | null;
  attempts: number;
  failure_reason: string | null;
  body: string;
  subject_id: string;
}
const rows = async (userKey: UserKey, notificationCode: string) =>
  (
    await test.owner.query<Row>(
      `select id, channel, status, scheduled_at, attempts, failure_reason, body, subject_id from notification where user_id = $1 and code = $2 order by created_at, channel`,
      [org.users[userKey].id, notificationCode],
    )
  ).rows;
const channels = async (userKey: UserKey, notificationCode: string, subjectId: string) =>
  (await rows(userKey, notificationCode))
    .filter((row) => row.subject_id === subjectId)
    .map((row) => row.channel)
    .sort();

/** ساعت ثابت فقط جلو می‌رود. */
const at = (iso: string) => test.clock.advance(Date.parse(iso) - test.clock.now().getTime());

const cost = (subjectId: string): Omit<NotifyInput, 'orgId'> => ({
  code: 'AL-CST-01',
  projectId: org.projects.a,
  recipients: [org.users.pm.id],
  subjectId,
  title: 'مصرف قلم CBS بیش از ۹۰٪',
  body: 'قلم C1 به ۹۲٪ بودجه رسید.',
  link: '/projects/a/cbs',
  severity: 'warning',
});

async function report(project: ProjectKey, author: UserKey, workDate: string) {
  const id = uuidv7();
  const when = `${workDate}T10:00:00Z`;
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, $5, $6, $7, $7, $7)`,
    [id, org.orgId, org.projects[project], org.users[author].id, workDate, `FR-N-${id.slice(-8)}`, when],
  );
}

beforeAll(async () => {
  test = await startTestApp();
  at('2026-06-21T08:00:00Z'); // یکشنبه ۱۱:۳۰ تهران
  org = await seedOrg(test.owner, {
    name: 'سازمان ارسال اعلان',
    users: {
      pm: { mobile: '09170100001', email: 'pm@example.test' },
      admin: { mobile: '09170100002', email: 'admin@example.test', orgAdmin: true },
      sup1: { mobile: '09170100003' },
      sup2: { mobile: '09170100004' },
    },
    projects: {
      a: { code: 'PRJ-1405-501', name: 'برج آ', manager: 'pm', members: { pm: 'project_manager', sup1: 'supervisor', sup2: 'supervisor' } },
      b: { code: 'PRJ-1405-502', name: 'برج ب', manager: 'pm', members: { pm: 'project_manager', sup2: 'supervisor' } },
    },
  });
  const client = await test.owner.connect();
  try {
    for (const key of ['a', 'b'] as const) {
      plans[key] = await insertReferencePlan(client, {
        orgId: org.orgId,
        projectId: org.projects[key],
        actorUserId: org.users.pm.id,
        now: new Date().toISOString(),
      });
      await client.query(`update project set activated_at = '2026-06-01T05:00:00Z' where id = $1`, [org.projects[key]]);
    }
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = $2`, [org.users.sup1.id, leaf('a', 'l111')]);
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = $2`, [org.users.sup2.id, leaf('a', 'l121')]);
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = $2`, [org.users.sup2.id, leaf('b', 'l111')]);
    // سرپرستان کاربر اپ‌اند: توکن پوش فعال (POST /me/devices)
    for (const key of ['sup1', 'sup2'] as const) {
      await client.query(
        `insert into device_token (id, org_id, user_id, platform, token, created_at, last_seen_at) values ($1, $2, $3, 'android', $4, now(), now())`,
        [uuidv7(), org.orgId, org.users[key].id, `fcm-${key}`],
      );
    }
  } finally {
    client.release();
  }
  pmToken = (await signIn(test, nextIp(), org.users.pm.mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('ارسال اعلان در کانال‌ها (برش ۱۲ب)', () => {
  it('AC-NT-01 — ماتریس W30 همان اعمال واقعی است؛ پیامک غیرفوری و کانال الزامی رد می‌شوند', async () => {
    const pid = org.projects.a;
    const matrix = data<{ code: string; channels: Record<string, string> }[]>((await asPm().get(`/v1/projects/${pid}/notification-matrix`).expect(200)).body);
    expect(matrix).toHaveLength(8);
    expect(matrix.find((row) => row.code === 'AL-CST-01')?.channels).toEqual({ in_app: 'locked_on', email: 'on', sms: 'na', push: 'na' });
    expect(code((await asPm().put(`/v1/projects/${pid}/notification-matrix`, { code: 'AL-PRG-01', channel: 'sms', on: true }).expect(422)).body)).toBe(
      'NOTIFICATION_SETTING_INVALID',
    );
    await asPm().put(`/v1/projects/${pid}/notification-matrix`, { code: 'NT-APR-01', channel: 'in_app', on: false }).expect(422);

    // ایمیل خاموش ← فقط in_app
    const off = data<{ code: string; channels: Record<string, string> }[]>(
      (await asPm().put(`/v1/projects/${pid}/notification-matrix`, { code: 'AL-CST-01', channel: 'email', on: false }).expect(200)).body,
    );
    expect(off.find((row) => row.code === 'AL-CST-01')?.channels.email).toBe('off');
    await notify(cost('c-off'));
    expect(await channels('pm', 'AL-CST-01', 'c-off')).toEqual(['in_app']);

    // دوباره روشن ← in_app و ایمیل؛ ایمیل با کار صف فرستاده می‌شود
    await asPm().put(`/v1/projects/${pid}/notification-matrix`, { code: 'AL-CST-01', channel: 'email', on: true }).expect(200);
    await notify(cost('c-on'));
    expect(await channels('pm', 'AL-CST-01', 'c-on')).toEqual(['email', 'in_app']);
    await waitFor(async () => (await rows('pm', 'AL-CST-01')).some((row) => row.subject_id === 'c-on' && row.channel === 'email' && row.status === 'sent'));
    expect(test.email.sent.some((message) => message.to === 'pm@example.test' && message.subject.includes('CBS'))).toBe(true);

    // بخش «اعلان‌ها»ی تنظیمات پروژه همان ماتریس است
    const settings = data<{ notifications: unknown[] }>((await asPm().get(`/v1/projects/${pid}/settings`).expect(200)).body);
    expect(settings.notifications).toHaveLength(8);
  });

  it('AC-NT-06 — شکست ارسال ۳ بار با فاصلهٔ ۱، ۵ و ۳۰ دقیقه تکرار می‌شود و سپس failed با دلیل', async () => {
    test.email.failing = true;
    try {
      await notify(cost('c-fail'));
      const email = async () => (await rows('pm', 'AL-CST-01')).find((row) => row.subject_id === 'c-fail' && row.channel === 'email') as Row;
      await waitFor(async () => (await email()).attempts === 1);
      const first = await email();
      expect(first.status).toBe('pending');
      expect(first.scheduled_at?.toISOString()).toBe(new Date(test.clock.now().getTime() + 60_000).toISOString());
      const delivery = test.app.get(NotificationDelivery);
      expect(await inOrg(() => delivery.deliver(first.id))).toBe('retry');
      expect((await email()).scheduled_at?.toISOString()).toBe(new Date(test.clock.now().getTime() + 5 * 60_000).toISOString());
      expect(await inOrg(() => delivery.deliver(first.id))).toBe('retry');
      expect((await email()).scheduled_at?.toISOString()).toBe(new Date(test.clock.now().getTime() + 30 * 60_000).toISOString());
      expect(await inOrg(() => delivery.deliver(first.id))).toBe('failed');
      const failed = await email();
      expect(failed).toMatchObject({ status: 'failed', attempts: 4 });
      expect(failed.failure_reason).toContain('ایمیل');
      expect(await inOrg(() => delivery.deliver(first.id))).toBe('skipped');
    } finally {
      test.email.failing = false;
    }
  });

  it('AC-NT-09 — یادآوری در ساعت پروژه، یک پیام برای سرپرست دو پروژه، نه برای کسی که گزارش داده', async () => {
    const daily = test.app.get(DailyNotices);
    expect(await inOrg(() => daily.reminder(org.orgId))).toBe(0); // ۱۱:۳۰ — هنوز نوبت نیست
    at('2026-06-21T13:35:00Z'); // ۱۷:۰۵ تهران
    await report('a', 'sup1', '2026-06-21');
    expect(await inOrg(() => daily.reminder(org.orgId))).toBe(1);
    expect(await rows('sup1', 'NT-FLD-04')).toHaveLength(0);
    const sup2 = await rows('sup2', 'NT-FLD-04');
    expect(sup2.map((row) => row.channel).sort()).toEqual(['in_app', 'push']);
    expect(sup2[0]?.body).toContain('برج آ');
    expect(sup2[0]?.body).toContain('برج ب');
    // تیک بعدی همان روز پیام دوم نمی‌سازد
    at('2026-06-21T14:05:00Z');
    await inOrg(() => daily.reminder(org.orgId));
    expect(await rows('sup2', 'NT-FLD-04')).toHaveLength(2);
    await waitFor(() => Promise.resolve(test.push.sent.some((message) => message.tokens.includes('fcm-sup2'))));
  });

  it('AC-NT-05 — ساعت آرام پوش غیرفوری را تا ۰۷:۰۰ نگه می‌دارد و پیامک فوری را تأخیر نمی‌دهد', async () => {
    at('2026-06-21T19:30:00Z'); // ۲۳:۰۰ تهران
    const pushes = test.push.sent.length;
    await notify({
      code: 'NT-FLD-02',
      projectId: org.projects.a,
      recipients: [org.users.sup1.id],
      subjectId: 'rej-1',
      title: 'رد شد',
      body: 'آیتم 1.1.1 رد شد.',
      link: '/x',
    });
    const push = (await rows('sup1', 'NT-FLD-02')).find((row) => row.channel === 'push');
    expect(push).toMatchObject({ status: 'pending' });
    expect(push?.scheduled_at?.toISOString()).toBe('2026-06-22T03:30:00.000Z');
    await notify({
      code: 'NT-FLD-01',
      projectId: org.projects.a,
      recipients: [org.users.sup1.id],
      subjectId: 'rev-1',
      title: 'برگشت برای اصلاح',
      body: 'آیتم 1.1.1 برای اصلاح برگشت: عکس واضح نیست',
      link: '/x',
    });
    expect((await rows('sup1', 'NT-FLD-01')).map((row) => row.channel).sort()).toEqual(['in_app', 'push', 'sms']);
    await waitFor(() => Promise.resolve(test.sms.sent.some((message) => message.to === org.users.sup1.mobile && message.text.includes('برگشت'))));
    expect(test.sms.sent.every((message) => message.text.length <= 140)).toBe(true);
    // پوش NT-FLD-01 هم فوری نیست و مثل NT-FLD-02 تا صبح می‌ماند
    expect(test.push.sent.length).toBe(pushes);
  });

  it('AC-NT-10 — NT-ASG-01 هم به سرپرست قبلی و هم جدید پیامک می‌دهد', async () => {
    await asPm()
      .post(`/v1/projects/${org.projects.a}/assignments`, { wbsItemIds: [leaf('a', 'l111')], supervisorUserId: org.users.sup2.id })
      .expect(200);
    for (const key of ['sup1', 'sup2'] as const) {
      await waitFor(() => Promise.resolve(test.sms.sent.some((message) => message.to === org.users[key].mobile && /سپرده|گرفته/.test(message.text))));
      expect((await rows(key, 'NT-ASG-01')).map((row) => row.channel)).toContain('sms');
    }
  });

  it('ترجیح شخصی W32 فقط کاهنده است؛ دید «حساب من» و ساعت آرام', async () => {
    const account = data<{ notifications: { groups: { key: string; channels: Record<string, string> }[]; quietHours: { from: string } } }>(
      (
        await asPm()
          .put('/v1/me/notification-preferences', {
            groups: [
              { key: 'alerts', label: 'هشدارها', description: 'x', channels: { email: 'off', in_app: 'off', push: 'na' } },
              { key: 'assignment', channels: { sms: 'off' } },
            ],
            quietHours: { enabled: true, from: '22:00', to: '06:30' },
          })
          .expect(200)
      ).body,
    );
    const saved = account.notifications;
    const alerts = saved.groups.find((group) => group.key === 'alerts');
    expect(alerts?.channels).toMatchObject({ in_app: 'locked_on', email: 'off', push: 'na' });
    expect(saved.groups.find((group) => group.key === 'assignment')?.channels.email).toBe('locked_on');
    expect(saved.quietHours.from).toBe('22:00');
    const me = data<{ notifications: { groups: unknown[] } }>((await asPm().get('/v1/me').expect(200)).body);
    expect(me.notifications.groups).toHaveLength(7);
    await notify(cost('c-pref'));
    expect(await channels('pm', 'AL-CST-01', 'c-pref')).toEqual(['in_app']);
    await asPm()
      .put('/v1/me/notification-preferences', { groups: [], quietHours: { enabled: true, from: '9:00', to: '07:00' } })
      .expect(400);
    await asPm()
      .put('/v1/me/notification-preferences', { groups: [{ key: 'nope', channels: {} }] })
      .expect(422);
    await asPm()
      .put('/v1/me/notification-preferences', { groups: [{ key: 'alerts', channels: {} }] })
      .expect(200);
  });

  it('AC-NT-08 — خلاصهٔ روزانه ۰۷:۳۰ فقط از مقادیر ذخیره‌شده، فقط ایمیل مدیر پروژه، یک بار در روز', async () => {
    at('2026-06-22T04:00:00Z'); // دوشنبه ۰۷:۳۰ تهران
    const daily = test.app.get(DailyNotices);
    expect(await inOrg(() => daily.digest(org.orgId, org.projects.a, '2026-06-22'))).toBe(1);
    await inOrg(() => daily.digest(org.orgId, org.projects.a, '2026-06-22'));
    const digest = await rows('pm', 'NT-DIG-01');
    expect(digest.map((row) => row.channel)).toEqual(['email']);
    // محاسبه‌ای ذخیره نشده (پروژه بی project_progress): متن کوتاه، بدون محاسبهٔ تازه
    expect(digest[0]?.body).toContain('هنوز محاسبه نشده');
    expect(digest[0]?.body).not.toMatch(/ریال/);
    await waitFor(() => Promise.resolve(test.email.sent.some((message) => message.subject === 'خلاصهٔ روزانهٔ برج آ')));
  });

  it('AC-NT-09 — یادآوری در روز تعطیل تقویم پروژه نمی‌آید', async () => {
    at('2026-06-26T13:35:00Z'); // جمعه ۱۷:۰۵
    expect(await inOrg(() => test.app.get(DailyNotices).reminder(org.orgId))).toBe(0);
  });

  it('کار dead ← NT-SYS-01 به مدیر سازمان (درون‌برنامه و ایمیل)', async () => {
    await inOrg(() => test.app.get(DeadLetterNotifications).handle({ queue: 'storage.cleanup', jobId: uuidv7(), orgId: org.orgId, error: new Error('x') }));
    await inOrg(() => test.app.get(DeadLetterNotifications).handle({ queue: 'storage.cleanup', jobId: uuidv7(), orgId: org.orgId, error: new Error('x') }));
    const dead = await rows('admin', 'NT-SYS-01');
    expect(dead.map((row) => row.channel).sort()).toEqual(['email', 'in_app']);
    expect(dead[0]?.body).toContain('storage.cleanup');
  });
});
