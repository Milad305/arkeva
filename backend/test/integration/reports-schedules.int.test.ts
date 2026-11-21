import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ReportScheduleTick } from '../../src/modules/reports/application/report-schedule-events.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// F18 — ارسال و زمان‌بندی گزارش (management-reports.md ۷.۳، ۷.۴؛ برش ۱۸ب): AC-MR-03، ۰۵، ۰۶، ۰۸.

type UserKey = 'pm' | 'planner' | 'finance' | 'client';
let test: TestApp;
let org: SeededOrg<UserKey, 'ref'>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.76.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const pid = () => org.projects.ref;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    patch: (path: string, body: object) => agent.patch(path).set(auth).send(body),
    del: (path: string) => agent.delete(path).set(auth),
  };
}

interface Schedule {
  id: string;
  nextRunAt: string | null;
  lastRunStatus: string;
  frequencyLabel: string;
  splitAmounts: boolean;
  recipients: { kind: string; external: boolean; canViewAmounts: boolean }[];
}

const doneReports = async (where: string, params: unknown[]) =>
  (
    await test.owner.query<{
      id: string;
      status: string;
      includes_amounts: boolean;
      deliveries: { users: string[]; emails: string[] };
      source_kind: string;
      range_id: string;
    }>(`select id, status, includes_amounts, deliveries, source_kind, range_id from generated_report where ${where} order by includes_amounts desc`, params)
  ).rows;

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  org = await seedOrg(test.owner, {
    name: 'سازمان ارسال گزارش',
    users: {
      pm: { mobile: '09220100001', fullName: 'مریم احمدی', email: 'pm@org.test' },
      planner: { mobile: '09220100002', fullName: 'برنامه‌ریز', email: 'planner@org.test' },
      finance: { mobile: '09220100003', fullName: 'مالی', email: 'finance@org.test' },
      client: { mobile: '09220100004', fullName: 'ناظر کارفرما', email: 'client@org.test' },
    },
    projects: {
      ref: {
        code: 'PRJ-1405-951',
        name: 'ساختمان مرجع',
        manager: 'pm',
        members: { pm: 'project_manager', planner: 'planner', finance: 'finance', client: 'client_reviewer' },
      },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    await client.query(`update project set planned_start = null, activated_at = '2026-03-25T05:00:00Z' where id = $1`, [pid()]);
  } finally {
    client.release();
  }
  const reportId = uuidv7();
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, '2026-04-05', 'FR-S-1', now(), now(), now())`,
    [reportId, org.orgId, pid(), org.users.pm.id],
  );
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 'quantity', 300, 'approved', now(), now(), now())`,
    [uuidv7(), org.orgId, pid(), reportId, plan.ids.get('l111')],
  );
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  // نخستین محاسبه دوره‌های گزارش را می‌سازد
  await as('pm')
    .patch(`/v1/projects/${pid()}/settings`, { progress: { criticalThreshold: 14 } })
    .expect(200);
  await waitFor(async () => {
    const { rows } = await test.owner.query<{ n: number }>('select count(*)::int as n from reporting_period where project_id = $1', [pid()]);
    return (rows[0]?.n ?? 0) > 0;
  }, 40_000);
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('F18 ۷.۳ — ارسال به گیرندگان', () => {
  it('AC-MR-08 — نشانی بیرونی بی reports.send_external رد می‌شود', async () => {
    const denied = await as('planner').post(`/v1/projects/${pid()}/reports/send`, {
      templateId: 'rt-exec',
      rangeId: 'last_week',
      recipients: [{ kind: 'email', id: 'karfarma@client.test' }],
    });
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: 'PERMISSION_DENIED', details: { requiredPermission: 'reports.send_external' } });
    const bad = await as('pm').post(`/v1/projects/${pid()}/reports/send`, {
      templateId: 'rt-exec',
      rangeId: 'last_week',
      recipients: [{ kind: 'email', id: 'not-an-email' }],
    });
    expect(bad.status).toBe(422);
  });

  it('AC-MR-03 — گیرندگان مختلط دو نسخه؛ بی مبلغ برای ناظر کارفرما و بیرونی؛ ایمیل بیرونی با لینک ۷ روزه و پیوست', async () => {
    const result = data<{ internalCount: number; externalCount: number; splitAmounts: boolean }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid()}/reports/send`, {
            templateId: 'rt-exec',
            rangeId: 'last_week',
            recipients: [
              { kind: 'user', id: org.users.planner.id },
              { kind: 'user', id: org.users.client.id },
              { kind: 'email', id: 'Karfarma@Client.test' },
            ],
          })
          .expect(200)
      ).body,
    );
    expect(result).toEqual(expect.objectContaining({ internalCount: 2, externalCount: 1, splitAmounts: true }));
    await waitFor(async () => (await doneReports("project_id = $1 and template_id = 'rt-exec'", [pid()])).every((row) => row.status === 'done'), 60_000);
    const rows = await doneReports("project_id = $1 and template_id = 'rt-exec'", [pid()]);
    expect(rows.map((row) => [row.includes_amounts, row.deliveries])).toEqual([
      [true, { users: [org.users.planner.id], emails: [] }],
      [false, { users: [org.users.client.id], emails: ['karfarma@client.test'] }],
    ]);
    const mail = test.email.sent.find((message) => message.to === 'karfarma@client.test');
    expect(mail?.text).toMatch(/http:\/\/localhost:3000\/v1\/files\/content\?token=/);
    expect(mail?.attachments?.[0]?.fileName).toMatch(/\.pdf$/);
    expect(mail?.attachments?.[0]?.content.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const { rows: notices } = await test.owner.query<{ user_id: string }>(
      "select distinct user_id from notification where code = 'NT-RPT-01' and channel = 'in_app'",
      [],
    );
    expect(notices.map((row) => row.user_id)).toEqual(expect.arrayContaining([org.users.pm.id, org.users.planner.id, org.users.client.id]));
  }, 90_000);
});

describe('F18 ۷.۴ — زمان‌بندی', () => {
  let weekly: Schedule;

  it('دسترسی: بی reports.schedule ۴۰۳؛ مالی فقط قالب مالی؛ ناظر کارفرما نه', async () => {
    const body = {
      templateId: 'rt-supervisors',
      projectId: pid(),
      format: 'xlsx',
      frequency: 'weekly',
      weekday: 6,
      dayOfMonth: null,
      timeOfDay: '08:00',
      workingDaysOnly: false,
      recipients: [{ kind: 'user', id: org.users.planner.id }],
      enabled: true,
    };
    expect((await as('client').post('/v1/report-schedules', body)).status).toBe(403);
    expect((await as('finance').post('/v1/report-schedules', body)).status).toBe(403);
    await as('finance')
      .post('/v1/report-schedules', { ...body, templateId: 'rt-financial', recipients: [{ kind: 'role', id: 'finance' }] })
      .expect(201);
    expect((await as('planner').post('/v1/report-schedules', { ...body, recipients: [{ kind: 'email', id: 'x@client.test' }] })).status).toBe(403);
  });

  it('AC-MR-05 — هفتگی شنبه ۰۸:۰۰ تهران؛ تیک ساعتی سررسیده را اجرا، NT-RPT-01 و نوبت بعد', async () => {
    weekly = data<Schedule>(
      (
        await as('pm')
          .post('/v1/report-schedules', {
            templateId: 'rt-supervisors',
            projectId: pid(),
            format: 'xlsx',
            frequency: 'weekly',
            weekday: 6,
            dayOfMonth: null,
            timeOfDay: '08:00',
            workingDaysOnly: false,
            recipients: [
              { kind: 'user', id: org.users.planner.id },
              { kind: 'role', id: 'client_reviewer' },
            ],
            enabled: true,
          })
          .expect(201)
      ).body,
    );
    expect(weekly).toMatchObject({ nextRunAt: '2026-06-27T04:30:00.000Z', lastRunStatus: 'never', frequencyLabel: 'هر شنبه · ۰۸:۰۰', splitAmounts: false });
    const ran = data<{ id: string; requestedByName: string }>((await as('pm').post(`/v1/report-schedules/${weekly.id}/run-now`).expect(200)).body);
    expect(ran.requestedByName).toBe('مریم احمدی');
    const {
      rows: [after],
    } = await test.owner.query<{ next_run_at: Date }>('select next_run_at from report_schedule where id = $1', [weekly.id]);
    expect(after?.next_run_at.toISOString()).toBe('2026-06-27T04:30:00.000Z');

    test.clock.advance(Date.parse('2026-06-27T05:00:00Z') - test.clock.now().getTime());
    // زمان‌بندی مالی آزمون دسترسی هم شنبه ۰۸:۰۰ است
    expect(await test.app.get(ReportScheduleTick).onTick()).toBe(2);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ last_run_status: string; next_run_at: Date }>(
        'select last_run_status, next_run_at from report_schedule where id = $1',
        [weekly.id],
      );
      return rows[0]?.last_run_status === 'ok' && rows[0].next_run_at.toISOString() === '2026-07-04T04:30:00.000Z';
    }, 40_000);
    await waitFor(async () => (await doneReports('schedule_id = $1', [weekly.id])).every((row) => row.status === 'done'), 40_000);
    const rows = await doneReports('schedule_id = $1', [weekly.id]);
    // «اجرای همین حالا» و اجرای تیک
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === 'done' && row.deliveries.users.includes(org.users.client.id))).toBe(true);
    const { rows: notices } = await test.owner.query<{ n: number }>(
      "select count(*)::int as n from notification where code = 'NT-RPT-01' and user_id = $1 and channel = 'in_app'",
      [org.users.client.id],
    );
    expect(notices[0]?.n).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('AC-MR-06 — با بستن دوره گزارش رسمی دوره از عکس ساخته می‌شود', async () => {
    const schedule = data<Schedule>(
      (
        await as('pm')
          .post('/v1/report-schedules', {
            templateId: 'rt-financial',
            projectId: pid(),
            format: 'xlsx',
            frequency: 'on_period_close',
            weekday: null,
            dayOfMonth: null,
            timeOfDay: '10:00',
            workingDaysOnly: false,
            recipients: [{ kind: 'role', id: 'finance' }],
            enabled: true,
          })
          .expect(201)
      ).body,
    );
    expect(schedule.nextRunAt).toBeNull();
    const periods = data<{ id: string; startDate: string }[]>((await as('planner').get(`/v1/projects/${pid()}/periods`).expect(200)).body);
    const farvardin = periods.find((period) => period.startDate === '2026-03-21') as { id: string };
    await as('planner').post(`/v1/projects/${pid()}/periods/${farvardin.id}/close`).expect(200);
    await waitFor(async () => (await doneReports('schedule_id = $1', [schedule.id])).some((row) => row.status === 'done'), 40_000);
    const [row] = await doneReports('schedule_id = $1', [schedule.id]);
    expect(row).toMatchObject({
      source_kind: 'period_snapshot',
      range_id: `period:${farvardin.id}`,
      includes_amounts: true,
      deliveries: { users: [org.users.finance.id], emails: [] },
    });
  }, 60_000);

  it('توقف، فهرست و حذف؛ فقط سازنده یا مدیر پروژه', async () => {
    const paused = data<Schedule>((await as('pm').patch(`/v1/report-schedules/${weekly.id}`, { enabled: false }).expect(200)).body);
    expect(paused).toMatchObject({ nextRunAt: null, lastRunStatus: 'paused' });
    const list = data<Schedule[]>((await as('client').get('/v1/report-schedules').expect(200)).body);
    expect(list.map((entry) => entry.id)).toContain(weekly.id);
    expect((await as('planner').del(`/v1/report-schedules/${weekly.id}`)).status).toBe(403);
    await as('pm').del(`/v1/report-schedules/${weekly.id}`).expect(200);
  });
});
