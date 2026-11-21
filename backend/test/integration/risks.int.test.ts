import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۱۳الف — دفتر ریسک (F14؛ risk.md ۵، ۶، ۹، ۱۰؛ AC-RK-01..03، ۰۶..۱۰).

type UserKey = 'pm' | 'planner' | 'reviewer' | 'client' | 'outsider';
type ProjectKey = 'main' | 'other';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.72.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = () => org.projects.main;
const id = (key: string) => plan.ids.get(key) as string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (name: string, value: string) => T }>(req: T) => req.set('Authorization', `Bearer ${tokens[user]}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    patch: (path: string, body: object) => auth(agent.patch(path)).send(body),
    put: (path: string, body: object) => auth(agent.put(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
  };
}

interface Detail {
  id: string;
  code: string;
  status: string;
  score: number | null;
  level: string | null;
  costImpact: string | null;
  actions: { id: string; status: string; overdue: boolean }[];
  history: { kind: string; text: string }[];
  followers: { id: string }[];
  isFollowing: boolean;
  contingency: { allocated: string | null; projectRemaining: string | null };
  links: { kind: string; code: string | null }[];
  closeReason: string | null;
}

interface Register {
  items: { id: string; code: string; score: number | null; costImpact: string | null; status: string }[];
  summary: {
    open: number;
    highOrCritical: number;
    unassessedOpen: number;
    costImpact: string | null;
    scheduleImpactDays: number;
    scheduleImpactBasis: string;
    overdueActions: number;
  };
  matrix: Record<string, number>;
  categories: string[];
  nextCode: string | null;
}

const input = (overrides: Record<string, unknown> = {}) => ({
  title: 'تأخیر تحویل ورق فولاد',
  category: 'تأمین',
  probability: 4,
  impact: 4,
  responseStrategy: 'mitigate',
  ownerUserId: org.users.planner.id,
  costImpact: '3000000000',
  scheduleImpactDays: 12,
  links: [{ kind: 'wbs_item', targetId: id('l121') }],
  firstAction: null,
  notifyBelowThreshold: false,
  ...overrides,
});

/** بدنهٔ PATCH: همان ورودی بی فیلدهای فقط-ثبت. */
const edit = (overrides: Record<string, unknown> = {}) => {
  const body: Record<string, unknown> = { ...input(overrides) };
  delete body['firstAction'];
  delete body['notifyBelowThreshold'];
  return body;
};

const create = async (overrides: Record<string, unknown> = {}, user: UserKey = 'pm') =>
  data<Detail>((await as(user).post(`/v1/projects/${pid()}/risks`, input(overrides)).expect(201)).body);

const notifications = async (notificationCode: string, userKey: UserKey) =>
  (
    await test.owner.query<{ subject_id: string; title: string }>(
      `select subject_id, title from notification where code = $1 and user_id = $2 and channel = 'in_app'`,
      [notificationCode, org.users[userKey].id],
    )
  ).rows;

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  org = await seedOrg(test.owner, {
    name: 'سازمان ریسک',
    users: {
      pm: { mobile: '09180100001', fullName: 'مریم احمدی' },
      planner: { mobile: '09180100002', fullName: 'علی رضایی' },
      reviewer: { mobile: '09180100003', fullName: 'رضا کریمی' },
      client: { mobile: '09180100004', fullName: 'ناظر کارفرما' },
      outsider: { mobile: '09180100005', fullName: 'بیرونی' },
    },
    projects: {
      main: {
        code: 'PRJ-1405-601',
        name: 'برج ریسک',
        manager: 'pm',
        members: { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer', client: 'client_reviewer' },
      },
      other: { code: 'PRJ-1405-602', name: 'پروژهٔ دیگر', manager: 'outsider', members: { outsider: 'project_manager' } },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    await client.query(`update project set contingency_reserve = 10000000000 where id = $1`, [pid()]);
  } finally {
    client.release();
  }
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('دفتر ریسک (برش ۱۳الف)', () => {
  it('AC-RK-01 و AC-RK-02 — ۴×۴ = ۱۶ «بالا» و NT-RSK-02؛ زیر ۱۵ (۱۲) بی اعلان؛ ۴×۵ «بحرانی»؛ کد RSK-NNN', async () => {
    const register = data<Register>((await as('pm').get(`/v1/projects/${pid()}/risks`).expect(200)).body);
    expect(register.nextCode).toBe('RSK-001');
    expect(register.categories).toHaveLength(8);

    const high = await create({}, 'reviewer');
    expect(high).toMatchObject({ code: 'RSK-001', score: 16, level: 'high', status: 'assessed' });
    expect((await notifications('NT-RSK-02', 'pm')).map((row) => row.subject_id)).toEqual([high.id]);
    expect((await notifications('NT-RSK-02', 'planner')).map((row) => row.subject_id)).toEqual([high.id]); // مالک

    const medium = await create({ title: 'ترک بتن در تابستان', probability: 2, impact: 5, category: 'فنی' }, 'reviewer');
    expect(medium).toMatchObject({ code: 'RSK-002', score: 10, level: 'medium' });
    // بیشترین امتیاز زیر ۱۵ در مقیاس ۵×۵ (۱۴ ساختنی نیست)
    const below = await create({ title: 'کمبود نیروی ماهر', probability: 3, impact: 4 }, 'reviewer');
    expect(below.score).toBe(12);
    expect(await notifications('NT-RSK-02', 'pm')).toHaveLength(1);

    const critical = await create({ title: 'توقف کار با بارندگی شدید', probability: 4, impact: 5, category: 'محیطی' }, 'reviewer');
    expect(critical).toMatchObject({ score: 20, level: 'critical' });
    // امتیاز کمتر با انتخاب «اعلان به مدیر پروژه و مالک»
    const chosen = await create({ title: 'تغییر نقشهٔ سازه', probability: 1, impact: 2, category: 'طراحی', notifyBelowThreshold: true }, 'reviewer');
    expect((await notifications('NT-RSK-02', 'pm')).map((row) => row.subject_id)).toContain(chosen.id);
    expect(chosen.code).toBe('RSK-005');
  });

  it('ورودی و دسترسی: احتمال بی اثر، دستهٔ ناشناخته، مالک غیرعضو رد؛ غیرعضو ۴۰۴؛ ناظر بی risk.edit ویرایش نمی‌کند ولی مالک می‌کند', async () => {
    await as('pm')
      .post(`/v1/projects/${pid()}/risks`, input({ impact: null }))
      .expect(422);
    expect(
      code(
        (
          await as('pm')
            .post(`/v1/projects/${pid()}/risks`, input({ category: 'نامعلوم' }))
            .expect(422)
        ).body,
      ),
    ).toBe('RISK_INVALID');
    await as('pm')
      .post(`/v1/projects/${pid()}/risks`, input({ ownerUserId: org.users.outsider.id }))
      .expect(422);
    await as('pm')
      .post(`/v1/projects/${pid()}/risks`, input({ firstAction: { title: 'سفارش دوم', dueDate: null } }))
      .expect(422);
    await as('client').post(`/v1/projects/${pid()}/risks`, input()).expect(403);

    const risk = await create({ title: 'ریسک مالک علی' });
    await as('outsider').get(`/v1/risks/${risk.id}`).expect(404);
    await as('reviewer')
      .patch(`/v1/risks/${risk.id}`, edit({ title: 'ویرایش ناظر' }))
      .expect(403);
    const edited = data<Detail>(
      (
        await as('planner')
          .patch(`/v1/risks/${risk.id}`, edit({ title: 'ویرایش مالک ریسک' }))
          .expect(200)
      ).body,
    );
    expect(edited.status).toBe('assessed');
    // تغییر مالک فقط با risk.change_status_owner
    await as('planner')
      .patch(`/v1/risks/${risk.id}`, edit({ ownerUserId: org.users.reviewer.id }))
      .expect(403);
  });

  it('AC-RK-03 — تغییر امتیاز یک ردیف تاریخچه و NT-RSK-01 به دنبال‌کنندگان (نه خود ویرایش‌کننده)', async () => {
    const risk = await create({ title: 'نوسان قیمت سیمان', probability: 2, impact: 3, category: 'مالی' });
    await as('reviewer').post(`/v1/risks/${risk.id}/follow`).expect(200);
    const after = data<Detail>(
      (
        await as('pm')
          .patch(`/v1/risks/${risk.id}`, edit({ title: 'نوسان قیمت سیمان', probability: 4, impact: 3, category: 'مالی' }))
          .expect(200)
      ).body,
    );
    expect(after).toMatchObject({ score: 12, level: 'medium' });
    expect(after.history[0]?.text).toContain('از ۶ به ۱۲');
    const { rows } = await test.owner.query<{ score: number }>('select score from risk_score_history where risk_id = $1 order by created_at, id', [risk.id]);
    expect(rows.map((row) => row.score)).toEqual([6, 12]);
    expect((await notifications('NT-RSK-01', 'reviewer')).map((row) => row.subject_id)).toEqual([`${risk.id}:12`]);
    expect((await notifications('NT-RSK-01', 'planner')).map((row) => row.subject_id)).toEqual([`${risk.id}:12`]);
    expect(await notifications('NT-RSK-01', 'pm')).toHaveLength(0);
    // ویرایش بی تغییر امتیاز ردیف تازه نمی‌سازد
    await as('pm')
      .patch(`/v1/risks/${risk.id}`, edit({ title: 'نوسان قیمت سیمان و میلگرد', probability: 4, impact: 3, category: 'مالی' }))
      .expect(200);
    expect((await test.owner.query('select 1 from risk_score_history where risk_id = $1', [risk.id])).rows).toHaveLength(2);
  });

  it('AC-RK-06 — اقدام باز ← in_action؛ پایان همه ← assessed؛ موعد لازم؛ معوق', async () => {
    const risk = await create({ title: 'خرابی جرثقیل', category: 'منابع', firstAction: { title: 'قرارداد جرثقیل جایگزین', dueDate: '2026-06-20' } });
    expect(risk.status).toBe('in_action');
    expect(risk.actions[0]).toMatchObject({ status: 'open', overdue: true });
    await as('planner').post(`/v1/risks/${risk.id}/actions`, { title: 'بی موعد' }).expect(422);
    const two = data<Detail>((await as('planner').post(`/v1/risks/${risk.id}/actions`, { title: 'بازرسی ماهانه', dueDate: '2026-07-01' }).expect(201)).body);
    expect(two.actions).toHaveLength(2);
    for (const action of two.actions) await as('planner').patch(`/v1/risk-actions/${action.id}`, { status: 'done', completionNote: 'انجام شد' }).expect(200);
    const done = data<Detail>((await as('pm').get(`/v1/risks/${risk.id}`).expect(200)).body);
    expect(done.status).toBe('assessed');
    // اقدام تازهٔ دوم و دو «انجام شد» (اقدام فرم ثبت یادداشت جدا ندارد)
    expect(done.history.filter((entry) => entry.kind === 'action')).toHaveLength(3);
    await as('reviewer').patch(`/v1/risk-actions/${two.actions[0]?.id}`, { status: 'open' }).expect(403);
  });

  it('AC-RK-07 — بستن بی دلیل رد؛ بستن اقدام‌های باز را لغو می‌کند؛ بازگشایی', async () => {
    const risk = await create({ title: 'تأخیر مجوز شهرداری', category: 'قراردادی', firstAction: { title: 'پیگیری مجوز', dueDate: '2026-07-10' } });
    expect(code((await as('pm').post(`/v1/risks/${risk.id}/status`, { status: 'closed' }).expect(422)).body)).toBe('RISK_INVALID');
    await as('planner').post(`/v1/risks/${risk.id}/status`, { status: 'closed', closeReason: 'mitigated' }).expect(403);
    const closed = data<Detail>((await as('pm').post(`/v1/risks/${risk.id}/status`, { status: 'closed', closeReason: 'mitigated' }).expect(200)).body);
    expect(closed).toMatchObject({ status: 'closed', closeReason: 'mitigated' });
    expect(closed.actions.map((action) => action.status)).toEqual(['cancelled']);
    expect(closed.history[0]?.text).toContain('۱ اقدام باز لغو شد');
    await as('pm').post(`/v1/risks/${risk.id}/status`, { status: 'closed', closeReason: 'other' }).expect(409);
    await as('pm').patch(`/v1/risks/${risk.id}`, edit()).expect(409);
    const reopened = data<Detail>((await as('pm').post(`/v1/risks/${risk.id}/status`, { status: 'assessed', note: 'دوباره مطرح شد' }).expect(200)).body);
    expect(reopened).toMatchObject({ status: 'assessed', closeReason: null });
    const occurred = data<Detail>(
      (await as('pm').post(`/v1/risks/${risk.id}/status`, { status: 'occurred', actualCost: '۵۰۰٬۰۰۰٬۰۰۰', actualDelayDays: 6 }).expect(200)).body,
    );
    expect(occurred.status).toBe('occurred');
  });

  it('AC-RK-08 — تخصیص ذخیره بیش از باقی‌مانده رد؛ بستن تخصیص را آزاد می‌کند', async () => {
    const a = await create({ title: 'ریسک ذخیرهٔ اول' });
    const b = await create({ title: 'ریسک ذخیرهٔ دوم' });
    const first = data<Detail>((await as('pm').put(`/v1/risks/${a.id}/contingency`, { amount: '7000000000' }).expect(200)).body);
    expect(first.contingency).toEqual({ allocated: '7000000000', consumed: '0', projectRemaining: '3000000000', coveragePercent: 233 });
    const rejected = await as('pm').put(`/v1/risks/${b.id}/contingency`, { amount: '3500000000' }).expect(422);
    expect(code(rejected.body)).toBe('CONTINGENCY_EXCEEDED');
    expect((rejected.body as { message: string }).message).toContain('۳ میلیارد ریال');
    await as('pm').put(`/v1/risks/${b.id}/contingency`, { amount: '3000000000' }).expect(200);
    await as('planner').put(`/v1/risks/${b.id}/contingency`, { amount: '1' }).expect(403);
    // کاهش تخصیص خود ریسک همیشه مجاز
    await as('pm').put(`/v1/risks/${a.id}/contingency`, { amount: '5000000000' }).expect(200);
    await as('pm').post(`/v1/risks/${a.id}/status`, { status: 'closed', closeReason: 'accepted' }).expect(200);
    const after = data<Detail>((await as('pm').get(`/v1/risks/${b.id}`).expect(200)).body);
    expect(after.contingency.projectRemaining).toBe('7000000000');
    const { rows } = await test.owner.query<{ total: string }>('select sum(amount)::text as total from contingency_allocation where risk_id = $1', [a.id]);
    expect(rows[0]?.total).toBe('0');
  });

  it('AC-RK-09 و AC-RK-10 — ماتریس فقط باز و ارزیابی‌شده؛ بی cbs.view_amounts مبلغ در پاسخ نیست', async () => {
    const unassessed = await create({ title: 'ریسک ارزیابی‌نشده', probability: null, impact: null });
    expect(unassessed).toMatchObject({ status: 'identified', score: null, level: null });
    const register = data<Register>((await as('pm').get(`/v1/projects/${pid()}/risks`).expect(200)).body);
    const open = register.items.filter((item) => ['identified', 'assessed', 'in_action'].includes(item.status));
    const assessed = open.filter((item) => item.score !== null);
    expect(Object.values(register.matrix).reduce((sum, value) => sum + value, 0)).toBe(assessed.length);
    expect(register.summary.open).toBe(open.length);
    expect(register.summary.unassessedOpen).toBe(open.length - assessed.length);
    expect(register.summary.highOrCritical).toBe(assessed.filter((item) => (item.score ?? 0) >= 15).length);
    expect(register.summary).toMatchObject({ scheduleImpactBasis: 'max', scheduleImpactDays: 12 });
    expect(register.summary.costImpact).not.toBeNull();

    const blind = data<Register>((await as('client').get(`/v1/projects/${pid()}/risks`).expect(200)).body);
    expect(blind.summary.costImpact).toBeNull();
    expect(blind.items.every((item) => item.costImpact === null)).toBe(true);
    const detail = data<Detail>((await as('client').get(`/v1/risks/${register.items[0]?.id}`).expect(200)).body);
    expect(detail.costImpact).toBeNull();
    expect(detail.contingency).toEqual({ allocated: null, consumed: null, projectRemaining: null, coveragePercent: null });

    // نمای سراسری: فقط پروژه‌های قابل‌مشاهده
    const all = data<Register>((await as('outsider').get('/v1/risks').expect(200)).body);
    expect(all.items).toHaveLength(0);
    expect(data<Register>((await as('pm').get('/v1/risks').expect(200)).body).items.length).toBe(register.items.length);
  });

  it('یادداشت با @نام ← NT-RSK-03؛ پیوندها؛ دنبال کردن؛ ادغام و پیشنهاد ادغام', async () => {
    const risk = await create({
      title: 'ریسک یادداشت',
      links: [
        { kind: 'wbs_item', targetId: id('l121') },
        { kind: 'cbs_item', targetId: id('C1') },
      ],
    });
    expect(risk.links.map((link) => link.kind).sort()).toEqual(['cbs_item', 'wbs_item']);
    const noted = data<Detail>((await as('pm').post(`/v1/risks/${risk.id}/notes`, { text: '@رضا کریمی لطفاً نامهٔ تأمین‌کننده را پیوست کن' }).expect(201)).body);
    expect(noted.history[0]).toMatchObject({ kind: 'note' });
    expect((await notifications('NT-RSK-03', 'reviewer')).map((row) => row.title)).toEqual(['مریم احمدی شما را در یادداشت ریسک ' + risk.code + ' نام برد.']);
    await as('pm').post(`/v1/risks/${risk.id}/notes`, { text: '   ' }).expect(422);

    // مالک دنبال‌کنندهٔ همیشگی است
    expect(data<Detail>((await as('planner').delete(`/v1/risks/${risk.id}/follow`).expect(200)).body).isFollowing).toBe(true);
    expect(data<Detail>((await as('reviewer').post(`/v1/risks/${risk.id}/follow`).expect(200)).body).isFollowing).toBe(true);
    expect(data<Detail>((await as('reviewer').delete(`/v1/risks/${risk.id}/follow`).expect(200)).body).isFollowing).toBe(false);

    const duplicate = await create({ title: 'ریسک تکراری یادداشت' });
    const proposed = data<Detail>((await as('reviewer').post(`/v1/risks/${duplicate.id}/merge`, { intoRiskId: risk.id, propose: true }).expect(200)).body);
    expect(proposed.status).not.toBe('closed');
    expect((await notifications('NT-RSK-03', 'pm')).some((row) => row.title.includes('پیشنهاد ادغام'))).toBe(true);
    await as('reviewer').post(`/v1/risks/${duplicate.id}/merge`, { intoRiskId: risk.id, propose: false }).expect(403);
    await as('pm').post(`/v1/risks/${duplicate.id}/merge`, { intoRiskId: duplicate.id, propose: false }).expect(422);
    const merged = data<Detail>((await as('pm').post(`/v1/risks/${duplicate.id}/merge`, { intoRiskId: risk.id, propose: false }).expect(200)).body);
    expect(merged).toMatchObject({ status: 'closed', closeReason: 'other' });
    const into = data<Detail>((await as('pm').get(`/v1/risks/${risk.id}`).expect(200)).body);
    expect(into.history[0]?.text).toContain(`${duplicate.code}`);

    // رویدادها در همان تراکنش (outbox)
    const { rows } = await test.owner.query<{ type: string }>(`select distinct type from domain_event where project_id = $1 and type like 'Risk%'`, [pid()]);
    expect(rows.map((row) => row.type).sort()).toEqual(['RiskActionChanged', 'RiskChanged', 'RiskNoteMention']);
  });

  it('حذف پروژه با نقش اپ از جدول‌های فقط-درج ریسک (تاریخچه، یادداشت، ذخیره) cascade می‌شود', async () => {
    const risk = await create({ title: 'ریسک پاک‌سازی' });
    await as('pm').put(`/v1/risks/${risk.id}/contingency`, { amount: '1000' }).expect(200);
    const app = new pg.Pool({ connectionString: test.db.appUrl, max: 1 });
    try {
      const client = await app.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('app.org_id', $1, true)`, [org.orgId]);
        await client.query('delete from project where id = $1', [pid()]);
        await client.query('rollback');
      } finally {
        client.release();
      }
    } finally {
      await app.end();
    }
  });

  it('اعضا برای مالک و @نام', async () => {
    const people = data<{ members: { id: string }[]; managerId: string }>((await as('reviewer').get(`/v1/projects/${pid()}/risks/people`).expect(200)).body);
    expect(people.managerId).toBe(org.users.pm.id);
    expect(people.members).toHaveLength(4);
  });
});
