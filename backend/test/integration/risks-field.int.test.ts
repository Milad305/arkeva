import { createHash } from 'node:crypto';
import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AlertEvaluator } from '../../src/modules/alerts/module.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۱۳ب — مشکل کارگاه و قواعد هشدار ریسک (risk.md ۵.۳، ۵.۵، ۱۱؛ 04-alert-engine ۳.۶–۳.۷؛ AC-RK-04، ۰۵، ۱۱).

type UserKey = 'pm' | 'planner' | 'sup' | 'sup2';

let test: TestApp;
let org: SeededOrg<UserKey, 'main'>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.73.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
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
    delete: (path: string, body: object = {}) => auth(agent.delete(path)).send(body),
  };
}

/** ورود اپ با کد پیامکی (field-app.md ۳). */
async function appLogin(mobile: string): Promise<string> {
  const agent = () => test.http(nextIp());
  const step = data<{ otpToken: string }>((await agent().post('/v1/auth/app/request-code').send({ mobile }).expect(200)).body);
  const sent = [...test.sms.sent].reverse().find((message) => message.to === mobile);
  const smsCode = /\d{5}/.exec(sent?.text ?? '')?.[0] as string;
  return data<{ session: { accessToken: string } }>(
    (await agent().post('/v1/auth/app/verify').send({ otpToken: step.otpToken, code: smsCode }).expect(200)).body,
  ).session.accessToken;
}

function evaluate() {
  const orm = test.app.get(MikroORM);
  return test.app.get(ClsService).run(() => {
    test.app.get(AppContext).setJobScope({ orgId: org.orgId, traceId: 'ERR-RK13-01' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return test.app.get(AlertEvaluator).evaluate(pid());
    });
  });
}

interface IssueState {
  id: string;
  riskId: string;
  riskCode: string;
  status: string;
  category: string;
  photos: { id: string; uploadStatus: string }[];
}

const issue = (overrides: Record<string, unknown> = {}) => ({
  id: uuidv7(),
  projectId: pid(),
  type: 'material',
  title: 'میلگرد نمرهٔ ۱۶ تمام شد',
  description: 'تا فردا ظهر کار آرماتوربندی متوقف می‌شود',
  effect: 'stop',
  wbsItemId: id('l121'),
  deviceRecordedAt: '2026-06-21T07:30:00Z',
  photos: [{ id: uuidv7(), sha256: 'a'.repeat(64), takenAt: '2026-06-21T07:29:00Z' }],
  ...overrides,
});

const alerts = async (ruleCode: string) =>
  (
    await test.owner.query<{ subject_id: string; severity: string; status: string }>(
      `select subject_id, severity, status from alert where project_id = $1 and rule_code = $2 and status in ('open', 'seen') order by subject_id`,
      [pid(), ruleCode],
    )
  ).rows;

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  org = await seedOrg(test.owner, {
    name: 'سازمان مشکل کارگاه',
    users: {
      pm: { mobile: '09190100001', fullName: 'مریم احمدی' },
      planner: { mobile: '09190100002', fullName: 'علی رضایی' },
      sup: { mobile: '09190100003', fullName: 'حسین کارگاهی' },
      sup2: { mobile: '09190100004', fullName: 'سرپرست دوم' },
    },
    projects: {
      main: {
        code: 'PRJ-1405-701',
        name: 'برج کارگاه',
        manager: 'pm',
        members: { pm: 'project_manager', planner: 'planner', sup: 'supervisor', sup2: 'supervisor' },
      },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = any($2)`, [org.users.sup.id, [id('l121'), id('l122')]]);
    await client.query(`update project set activated_at = '2026-06-01T05:00:00Z' where id = $1`, [pid()]);
  } finally {
    client.release();
  }
  tokens.pm = (await signIn(test, nextIp(), org.users.pm.mobile)).accessToken;
  tokens.planner = (await signIn(test, nextIp(), org.users.planner.mobile)).accessToken;
  tokens.sup = await appLogin(org.users.sup.mobile);
  tokens.sup2 = await appLogin(org.users.sup2.mobile);
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('مشکل کارگاه و قواعد ریسک (برش ۱۳ب)', () => {
  let first: IssueState;

  it('AC-RK-04 — مشکل کارگاه ← ریسک identified با منبع field، بی امتیاز، دستهٔ نگاشته، پیوند به برگ، مالک مدیر پروژه و NT-RSK-04', async () => {
    const body = issue();
    first = data<IssueState>((await as('sup').post('/v1/field/issues', body).expect(200)).body);
    expect(first).toMatchObject({ id: body.id, riskCode: 'RSK-001', status: 'identified', category: 'تأمین' });
    expect(first.photos).toEqual([{ id: body.photos[0]?.id, uploadStatus: 'pending' }]);

    const risk = data<{
      source: string;
      score: number | null;
      owner: { id: string };
      links: { kind: string; targetId: string }[];
      event: string;
      consequence: string;
      sourceReportedBy: string;
      history: { kind: string; text: string }[];
    }>((await as('pm').get(`/v1/risks/${first.riskId}`).expect(200)).body);
    expect(risk).toMatchObject({ source: 'field', score: null, owner: { id: org.users.pm.id }, consequence: 'توقف کار', sourceReportedBy: 'حسین کارگاهی' });
    expect(risk.event).toContain('آرماتوربندی');
    expect(risk.links).toEqual([expect.objectContaining({ kind: 'wbs_item', targetId: id('l121') })]);
    expect(risk.history[0]).toMatchObject({ kind: 'created' });

    const { rows: notes } = await test.owner.query<{ title: string }>(
      `select title from notification where code = 'NT-RSK-04' and user_id = $1 and channel = 'in_app'`,
      [org.users.pm.id],
    );
    expect(notes.map((row) => row.title)).toEqual(['حسین کارگاهی مشکل «میلگرد نمرهٔ ۱۶ تمام شد» را از کارگاه گزارش کرد.']);
    const { rows: events } = await test.owner.query<{ type: string }>(
      `select type from domain_event where project_id = $1 and type in ('SiteIssueReported', 'RiskChanged')`,
      [pid()],
    );
    expect(events.map((row) => row.type).sort()).toEqual(['RiskChanged', 'SiteIssueReported']);

    // نگاشت نوع ← دسته (۵.۳)
    for (const [type, category] of [
      ['safety', 'ایمنی'],
      ['equipment', 'منابع'],
      ['design', 'طراحی'],
      ['weather', 'محیطی'],
      ['other', 'فنی'],
    ] as const) {
      const state = data<IssueState>(
        (
          await as('sup')
            .post('/v1/field/issues', issue({ type, photos: [], wbsItemId: null, title: `مشکل ${type}` }))
            .expect(200)
        ).body,
      );
      expect(state.category).toBe(category);
    }
  });

  it('AC-RK-05 — ارسال دوباره (قطع وسط کار) ریسک تکراری نمی‌سازد؛ شناسهٔ دیگری با همان UUID رد می‌شود', async () => {
    const body = issue({ id: first.id });
    const again = data<IssueState>((await as('sup').post('/v1/field/issues', body).expect(200)).body);
    expect(again).toMatchObject({ riskId: first.riskId, riskCode: 'RSK-001' });
    const parallel = issue({ title: 'نشت آب در زیرزمین', type: 'other', photos: [] });
    const [a, b] = await Promise.all([as('sup').post('/v1/field/issues', parallel), as('sup').post('/v1/field/issues', parallel)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(data<IssueState>(a.body).riskId).toBe(data<IssueState>(b.body).riskId);
    const { rows } = await test.owner.query('select 1 from site_issue where id = $1', [parallel.id]);
    expect(rows).toHaveLength(1);
    expect(code((await as('sup2').post('/v1/field/issues', body).expect(409)).body)).toBe('FIELD_ENTRY_NOT_ALLOWED');
    // ناظر و برنامه‌ریز مشکل کارگاه از اپ نمی‌فرستند مگر risk.create داشته باشند؛ کد پایه risk.create_site_issue است
    await as('pm')
      .post('/v1/field/issues', issue({ photos: [] }))
      .expect(403);
  });

  it('عکس مشکل با /uploads و نوع issue_photo؛ فقط گزارش‌دهنده و با هش اعلام‌شده', async () => {
    const bytes = Buffer.from('site-issue-photo');
    const sha = createHash('sha256').update(bytes).digest('hex');
    const photoId = uuidv7();
    const posted = data<IssueState>(
      (
        await as('sup')
          .post('/v1/field/issues', issue({ photos: [{ id: photoId, sha256: sha, takenAt: '2026-06-21T07:40:00Z' }] }))
          .expect(200)
      ).body,
    );
    await as('sup2')
      .post('/v1/uploads', { kind: 'issue_photo', projectId: pid(), subjectId: photoId, fileName: 'p.jpg', contentType: 'image/jpeg', size: bytes.length })
      .expect(403);
    const session = data<{ uploadId: string }>(
      (
        await as('sup')
          .post('/v1/uploads', { kind: 'issue_photo', projectId: pid(), subjectId: photoId, fileName: 'p.jpg', contentType: 'image/jpeg', size: bytes.length })
          .expect(201)
      ).body,
    );
    const agent = test.http(nextIp());
    await agent
      .put(`/v1/uploads/${session.uploadId}/parts/1`)
      .set('Authorization', `Bearer ${tokens.sup}`)
      .set('Content-Type', 'application/octet-stream')
      .send(bytes)
      .expect(200);
    await as('sup').post(`/v1/uploads/${session.uploadId}/complete`, { sha256: sha }).expect(200);
    const again = data<IssueState>(
      (
        await as('sup')
          .post('/v1/field/issues', issue({ id: posted.id }))
          .expect(200)
      ).body,
    );
    expect(again.photos).toEqual([{ id: photoId, uploadStatus: 'complete' }]);
  });

  it('AC-RK-11 — سرپرست فقط مشکل‌های خودش را با وضعیت و دسته می‌بیند (همگام‌سازی اپ و دفتر)', async () => {
    const sync = data<{ issues: Record<string, unknown>[] }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(sync.issues.length).toBeGreaterThanOrEqual(7);
    expect(sync.issues.find((entry) => entry['id'] === first.id)).toMatchObject({
      riskCode: 'RSK-001',
      status: 'identified',
      category: 'تأمین',
      effect: 'stop',
    });
    for (const entry of sync.issues) expect(Object.keys(entry)).not.toContain('score');
    expect(data<{ issues: unknown[] }>((await as('sup2').get('/v1/field/sync').expect(200)).body).issues).toHaveLength(0);

    // پس از ارزیابی مدیر، سرپرست وضعیت تازه را می‌بیند ولی نه امتیاز
    await as('pm')
      .patch(`/v1/risks/${first.riskId}`, {
        title: 'میلگرد نمرهٔ ۱۶ تمام شد',
        category: 'تأمین',
        probability: 4,
        impact: 4,
        responseStrategy: 'mitigate',
        ownerUserId: org.users.planner.id,
        links: [{ kind: 'wbs_item', targetId: id('l121') }],
      })
      .expect(200);
    const after = data<{ issues: Record<string, unknown>[] }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(after.issues.find((entry) => entry['id'] === first.id)).toMatchObject({ status: 'assessed' });
  });

  it('شمار ریسک باز در سربرگ پروژه (W10) و برگ WBS (W11)', async () => {
    const project = data<{ counts: { openRisks: number; openHighRisks: number } }>((await as('pm').get(`/v1/projects/${pid()}`).expect(200)).body);
    const { rows } = await test.owner.query<{ open: number; high: number }>(
      `select count(*)::int as open, count(*) filter (where score >= 15)::int as high from risk where project_id = $1 and status in ('identified', 'assessed', 'in_action')`,
      [pid()],
    );
    expect(project.counts).toMatchObject({ openRisks: rows[0]?.open, openHighRisks: 1 });
    const item = data<{ openRiskCount: number }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid()}/wbs/${id('l121')}`)
          .expect(200)
      ).body,
    );
    const { rows: linked } = await test.owner.query<{ n: number }>(
      `select count(*)::int as n from risk_link l join risk r on r.id = l.risk_id where l.target_id = $1 and r.status in ('identified', 'assessed', 'in_action')`,
      [id('l121')],
    );
    expect(item.openRiskCount).toBe(linked[0]?.n);
    expect(item.openRiskCount).toBeGreaterThanOrEqual(2);
  });

  it('AL-RSK-01..04 و AL-X-01 — شرط، شدت و رفع', async () => {
    // AL-RSK-01: ریسک ۱۶ ← warning
    await evaluate();
    expect((await alerts('AL-RSK-01')).map((row) => `${row.subject_id}:${row.severity}`)).toEqual([`${first.riskId}:warning`]);
    // AL-RSK-04: مشکل ارزیابی‌نشده تا ۲ روز هشدار ندارد، پس از آن دارد
    expect(await alerts('AL-RSK-04')).toHaveLength(0);
    test.clock.advance(2 * 86_400_000 + 3_600_000);
    await evaluate();
    expect((await alerts('AL-RSK-04')).length).toBeGreaterThanOrEqual(6);

    // AL-RSK-02: اقدام معوق؛ AL-RSK-03: بازبینی سررسیده
    const action = data<{ actions: { id: string }[] }>(
      (
        await as('pm')
          .post(`/v1/risks/${first.riskId}/actions`, { title: 'خرید از تأمین‌کنندهٔ دوم', dueDate: '2026-06-22', ownerUserId: org.users.planner.id })
          .expect(201)
      ).body,
    ).actions[0] as { id: string };
    await as('pm')
      .patch(`/v1/risks/${first.riskId}`, {
        title: 'میلگرد نمرهٔ ۱۶ تمام شد',
        category: 'تأمین',
        probability: 4,
        impact: 5,
        responseStrategy: 'mitigate',
        ownerUserId: org.users.planner.id,
        nextReviewDate: '2026-06-22',
        links: [{ kind: 'wbs_item', targetId: id('l121') }],
      })
      .expect(200);
    await evaluate();
    expect((await alerts('AL-RSK-01')).map((row) => row.severity)).toEqual(['critical']);
    expect((await alerts('AL-RSK-02')).map((row) => row.subject_id)).toEqual([action.id]);
    expect((await alerts('AL-RSK-03')).map((row) => row.subject_id)).toEqual([first.riskId]);
    await as('planner').patch(`/v1/risk-actions/${action.id}`, { status: 'done' }).expect(200);
    await evaluate();
    expect(await alerts('AL-RSK-02')).toHaveLength(0);
    await as('pm').post(`/v1/risks/${first.riskId}/status`, { status: 'closed', closeReason: 'mitigated' }).expect(200);
    await evaluate();
    expect(await alerts('AL-RSK-01')).toHaveLength(0);
    expect(await alerts('AL-RSK-03')).toHaveLength(0);

    // AL-X-01 روی مثال مرجع هیچ برگ بحرانی ندارد (04 ۴)
    expect(await alerts('AL-X-01')).toHaveLength(0);
  });

  it('حذف مالک از پروژه ← مالکیت ریسک‌های باز به مدیر پروژه', async () => {
    const risk = data<{ id: string }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid()}/risks`, {
            title: 'ریسک مالک برنامه‌ریز',
            category: 'فنی',
            probability: 2,
            impact: 2,
            responseStrategy: 'accept',
            ownerUserId: org.users.planner.id,
            links: [],
            firstAction: null,
            notifyBelowThreshold: false,
          })
          .expect(201)
      ).body,
    );
    await as('pm').delete(`/v1/projects/${pid()}/members/${org.users.planner.id}`).expect(200);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ owner_user_id: string }>('select owner_user_id from risk where id = $1', [risk.id]);
      return rows[0]?.owner_user_id === org.users.pm.id;
    });
    const detail = data<{ history: { text: string }[] }>((await as('pm').get(`/v1/risks/${risk.id}`).expect(200)).body);
    expect(detail.history[0]?.text).toContain('مالکیت به مدیر پروژه رسید');
    // NT-RSK-05 فقط درون‌برنامه به مدیر پروژه (تصمیم 1405/08/25)
    const { rows: notes } = await test.owner.query<{ channel: string; title: string }>(
      `select channel, title from notification where code = 'NT-RSK-05' and user_id = $1`,
      [org.users.pm.id],
    );
    expect(notes.map((row) => row.channel)).toEqual(['in_app']);
    expect(notes[0]?.title).toMatch(/پس از حذف علی رضایی از پروژه به شما رسید/);
  });
});
