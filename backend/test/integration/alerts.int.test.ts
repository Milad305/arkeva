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

// برش ۱۲الف — موتور هشدار (F12؛ 04-alert-engine). مثال طلایی سرتاسری روی پروژهٔ مثال مرجع (تاریخ داده 2026-06-21) و چرخهٔ هشدار
// از API: AC-AL-01 تا ۰۷ و ۱۰. AC-AL-08 و ۰۹ در registry.test.ts.

type UserKey = 'pm' | 'planner' | 'finance' | 'reviewer' | 'sup1' | 'sup2';
type ProjectKey = 'ref';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let plan: ReferencePlan;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.89.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const M = (millions: number) => String(BigInt(millions) * 1_000_000n);
const id = (key: string) => plan.ids.get(key) as string;
const pid = () => org.projects.ref;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    patch: (path: string, body: object = {}) => auth(agent.patch(path)).send(body),
  };
}

interface AlertRow extends Record<string, unknown> {
  id: string;
  rule_code: string;
  subject_id: string;
  severity: string;
  status: string;
}

async function rows<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await test.owner.query<T>(sql, params)).rows;
}
const active = () =>
  rows<AlertRow>(
    `select id, rule_code, subject_id, severity, status from alert where project_id = $1 and status in ('open', 'seen') order by rule_code, subject_id`,
    [pid()],
  );
const signature = async () => (await active()).map((alert) => `${alert.rule_code}:${alert.subject_id}:${alert.severity}`).sort();
const notifications = async (ruleCode: string) =>
  (await rows<{ n: number }>(`select count(*)::int as n from notification where code = $1 and org_id = $2`, [ruleCode, org.orgId]))[0]?.n ?? 0;

function evaluate() {
  const orm = test.app.get(MikroORM);
  return test.app.get(ClsService).run(() => {
    test.app.get(AppContext).setJobScope({ orgId: org.orgId, traceId: 'ERR-AL12-01' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return test.app.get(AlertEvaluator).evaluate(pid());
    });
  });
}

async function approved(leaf: string, author: string, workDate: string, method: 'quantity' | 'steps', value: number | Record<string, number>) {
  const reportId = uuidv7();
  const at = `${workDate}T10:00:00Z`;
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, $5, $6, $7, $7, $7)`,
    [reportId, org.orgId, pid(), author, workDate, `FR-A-${reportId.slice(-8)}`, at],
  );
  if (!leaf) return;
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, steps_progress, status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9, $9, $9)`,
    [uuidv7(), org.orgId, pid(), reportId, id(leaf), method, method === 'quantity' ? value : null, method === 'steps' ? JSON.stringify(value) : null, at],
  );
}

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  const team = { pm: 'project_manager', planner: 'planner', finance: 'finance', reviewer: 'reviewer', sup1: 'supervisor', sup2: 'supervisor' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان هشدار',
    users: {
      pm: { mobile: '09160100001' },
      planner: { mobile: '09160100002' },
      finance: { mobile: '09160100003' },
      reviewer: { mobile: '09160100004' },
      sup1: { mobile: '09160100005' },
      sup2: { mobile: '09160100006' },
    },
    projects: { ref: { code: 'PRJ-1405-991', manager: 'pm', members: team } },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    // سرپرست هر برگ، حوزهٔ تأیید، شروع دوره‌ها از خرداد، تاریخ کامل بودن هزینه‌ها = تاریخ داده: فقط قواعد پیشرفت و هزینه می‌مانند
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = any($2)`, [org.users.sup1.id, [id('l111'), id('l112')]]);
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = any($2)`, [org.users.sup2.id, [id('l121'), id('l122')]]);
    await client.query(
      `insert into approval_route (id, org_id, project_id, area_name, root_item_ids, reviewer_user_id, sort_order, created_at, updated_at)
       values ($1, $2, $3, 'همه', $4, $5, 0, now(), now())`,
      [uuidv7(), org.orgId, pid(), JSON.stringify([id('g1'), id('g2')]), org.users.reviewer.id],
    );
    await client.query(`update project set planned_start = null, activated_at = '2026-06-01T05:00:00Z', costs_complete_through = '2026-06-21' where id = $1`, [
      pid(),
    ]);
  } finally {
    client.release();
  }
  await approved('l111', org.users.sup1.id, '2026-04-05', 'quantity', 300);
  await approved('l111', org.users.sup1.id, '2026-04-15', 'quantity', 200);
  await approved('l112', org.users.sup1.id, '2026-05-10', 'quantity', 120);
  await approved('l112', org.users.sup1.id, '2026-05-20', 'quantity', 60);
  await approved('l121', org.users.sup2.id, '2026-06-15', 'steps', { formwork: 100 });
  await approved('l121', org.users.sup2.id, '2026-06-19', 'steps', { rebar: 100 });
  // گزارش امروز هر دو سرپرست (بی آیتم): AL-FLD-01 برقرار نیست
  await approved('', org.users.sup1.id, '2026-06-21', 'quantity', 0);
  await approved('', org.users.sup2.id, '2026-06-21', 'quantity', 0);
  for (const key of ['pm', 'planner', 'finance', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  // هزینه‌ها (cbs.md ۹.۲) ← محاسبه ← ComputeFinished ← ارزیابی هشدار
  for (const [key, amount, quantity] of [
    ['C1', 105, '500'],
    ['C2', 215, '215'],
    ['C3', 140, '2.8'],
    ['C4', 60, null],
  ] as const) {
    await as('finance')
      .post(`/v1/projects/${pid()}/cost-entries`, {
        cbsItemId: id(key),
        costDate: '2026-06-01',
        amount: M(amount),
        ...(quantity ? { quantity } : {}),
        documentNo: key,
        post: true,
      })
      .expect(201);
  }
  // همهٔ چهار ردیف محاسبه شده باشند، سپس یک ارزیابی قطعی (اجراهای صف بعدی همان نتیجه را می‌دهند)
  await waitFor(async () => {
    const [row] = await rows<{ ac: string; compute_state: string }>('select ac::text, compute_state from project_progress where project_id = $1', [pid()]);
    return row?.ac === M(520) && row.compute_state === 'fresh';
  }, 40_000);
  await evaluate();
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('موتور هشدار سرتاسری', () => {
  it('AC-AL-01 — مثال طلایی: دقیقاً همین هشدارها؛ نه AL-CST-03، نه AL-X-01، نه والدها', async () => {
    expect(await signature()).toEqual(
      [
        `AL-PRG-01:${id('l112')}:warning`,
        `AL-PRG-01:${id('l121')}:warning`,
        `AL-PRG-02:${pid()}:warning`,
        `AL-PRG-03:${pid()}:warning`,
        `AL-CST-01:${id('C1')}:warning`,
        `AL-CST-02:${id('C1')}:warning`,
        `AL-CST-02:${id('C2')}:warning`,
        `AL-CST-02:${id('C3')}:warning`,
        `AL-CST-04:${pid()}:warning`,
      ].sort(),
    );
    // اعلان درون‌برنامه به مخاطب: سرپرست برگ برای AL-PRG-01، مدیر و مالی برای هزینه
    await waitFor(async () => (await notifications('AL-CST-04')) >= 2);
    const prgOf112 = () =>
      rows<{ user_id: string }>(`select user_id from notification where code = 'AL-PRG-01' and org_id = $1 and channel = 'in_app' and body like '%1.1.2%'`, [
        org.orgId,
      ]);
    await waitFor(async () => (await prgOf112()).length > 0);
    const [prg] = await prgOf112();
    expect(prg?.user_id).toBe(org.users.sup1.id);
  });

  it('AC-AL-02 — ارزیابی دوباره هشدار یا اعلان تکراری نمی‌سازد', async () => {
    const before = await signature();
    const sent = await notifications('AL-PRG-02');
    const result = await evaluate();
    expect(result).toMatchObject({ created: 0, escalated: 0, resolved: 0 });
    expect(await signature()).toEqual(before);
    expect(await notifications('AL-PRG-02')).toBe(sent);
  });

  it('AC-AL-07 — بی cbs.view_amounts متن هزینه مبلغ ندارد؛ با آن دارد', async () => {
    const mine = data<{ total: number; items: { ruleCode: string; subjectId: string; guidance: string; actionLink: string }[] }>(
      (await as('reviewer').get('/v1/alerts/mine?limit=50').expect(200)).body,
    );
    expect(mine.total).toBe(9);
    const hidden = mine.items.find((alert) => alert.ruleCode === 'AL-CST-02' && alert.subjectId === id('C2'));
    expect(hidden?.guidance).not.toContain('ریال');
    expect(hidden?.actionLink).toBe(`/projects/${pid()}/cbs/${id('C2')}`);
    const shown = data<{ ruleCode: string; subjectId: string; guidance: string }[]>(
      (await as('finance').get(`/v1/projects/${pid()}/alerts`).expect(200)).body,
    ).find((alert) => alert.ruleCode === 'AL-CST-02' && alert.subjectId === id('C2'));
    expect(shown?.guidance).toContain('میلیون ریال');
  });

  it('AC-AL-03 — ارتقا به بحرانی همان هشدار را ارتقا می‌دهد و یک اعلان تازه برای مدیر', async () => {
    const [before] = await rows<AlertRow>(`select id from alert where project_id = $1 and rule_code = 'AL-PRG-01' and subject_id = $2 and status = 'open'`, [
      pid(),
      id('l112'),
    ]);
    const pmBefore = (await rows<{ n: number }>(`select count(*)::int as n from notification where code = 'AL-PRG-01' and user_id = $1`, [org.users.pm.id]))[0]
      ?.n;
    await as('pm')
      .patch(`/v1/projects/${pid()}/settings`, { progress: { criticalThreshold: 8 } })
      .expect(200);
    await waitFor(async () => (await active()).some((alert) => alert.rule_code === 'AL-PRG-01' && alert.severity === 'critical'));
    const [after] = await rows<AlertRow>(
      `select id, severity from alert where project_id = $1 and rule_code = 'AL-PRG-01' and subject_id = $2 and status = 'open'`,
      [pid(), id('l112')],
    );
    expect(after).toMatchObject({ id: before?.id, severity: 'critical' });
    await waitFor(
      async () =>
        ((await rows<{ n: number }>(`select count(*)::int as n from notification where code = 'AL-PRG-01' and user_id = $1`, [org.users.pm.id]))[0]?.n ?? 0) >
        (pmBefore ?? 0),
    );
  });

  it('AC-AL-06 — بحرانی ردپذیر نیست؛ بی دلیل رد نمی‌شود؛ ردشده با ارزیابی دوباره باز نمی‌شود؛ فقط مدیر پروژه', async () => {
    const all = await active();
    const critical = all.find((alert) => alert.severity === 'critical') as AlertRow;
    const c1 = all.find((alert) => alert.rule_code === 'AL-CST-01') as AlertRow;
    expect(code((await as('pm').post(`/v1/alerts/${critical.id}/dismiss`, { reason: 'می‌دانیم' }).expect(409)).body)).toBe('ALERT_NOT_DISMISSIBLE');
    await as('pm').post(`/v1/alerts/${c1.id}/dismiss`, { reason: '' }).expect(422);
    await as('reviewer').post(`/v1/alerts/${c1.id}/dismiss`, { reason: 'خرید انجام شده' }).expect(403);
    await as('pm').post(`/v1/alerts/${c1.id}/dismiss`, { reason: 'خرید انجام شده و صورت‌حساب بعدی نمی‌آید' }).expect(200);
    await evaluate();
    expect((await active()).some((alert) => alert.rule_code === 'AL-CST-01')).toBe(false);
    await as('reviewer')
      .post(`/v1/alerts/${(all.find((alert) => alert.rule_code === 'AL-PRG-02') as AlertRow).id}/seen`)
      .expect(200);
  });

  it('AC-AL-04 — رفع شرط ← resolved؛ برقراری دوباره در ۲۴ ساعت همان هشدار را بی اعلان تازه باز می‌کند', async () => {
    const [cpi] = await rows<AlertRow>(`select id from alert where project_id = $1 and rule_code = 'AL-CST-04' and status in ('open', 'seen')`, [pid()]);
    const sent = await notifications('AL-CST-04');
    await as('pm')
      .patch(`/v1/projects/${pid()}/alert-rules/AL-CST-04`, { params: { warn: 0.9 } })
      .expect(200);
    await evaluate();
    expect((await rows<AlertRow>(`select status from alert where id = $1`, [cpi?.id]))[0]?.status).toBe('resolved');
    await as('pm')
      .patch(`/v1/projects/${pid()}/alert-rules/AL-CST-04`, { params: { warn: 0.95 } })
      .expect(200);
    await evaluate();
    expect((await rows<AlertRow>(`select status from alert where id = $1`, [cpi?.id]))[0]?.status).toBe('open');
    expect(await notifications('AL-CST-04')).toBe(sent);
  });

  it('AC-AL-05 — خاموش کردن قاعده هشدارهای بازش را رفع می‌کند؛ غیرقابل‌خاموش‌ها نه؛ W30 همهٔ ۳۱ قاعده', async () => {
    const rules = data<{ code: string; enabled: boolean; canDisable: boolean }[]>((await as('pm').get(`/v1/projects/${pid()}/alert-rules`).expect(200)).body);
    expect(rules).toHaveLength(31);
    expect(rules.find((rule) => rule.code === 'AL-STR-06')).toMatchObject({ canDisable: false, enabled: true });
    const off = data<{ enabled: boolean }>((await as('pm').patch(`/v1/projects/${pid()}/alert-rules/AL-CST-02`, { enabled: false }).expect(200)).body);
    expect(off.enabled).toBe(false);
    expect((await active()).some((alert) => alert.rule_code === 'AL-CST-02')).toBe(false);
    expect(code((await as('pm').patch(`/v1/projects/${pid()}/alert-rules/AL-STR-06`, { enabled: false }).expect(422)).body)).toBe('ALERT_RULE_INVALID');
    expect(
      code(
        (
          await as('pm')
            .patch(`/v1/projects/${pid()}/alert-rules/AL-CST-01`, { params: { pct: 20 } })
            .expect(422)
        ).body,
      ),
    ).toBe('ALERT_RULE_INVALID');
    await as('finance').patch(`/v1/projects/${pid()}/alert-rules/AL-CST-02`, { enabled: true }).expect(403);
    const settings = data<{ alertRules: { code: string; enabled: boolean }[] }>((await as('pm').get(`/v1/projects/${pid()}/settings`).expect(200)).body);
    expect(settings.alertRules.find((rule) => rule.code === 'AL-CST-02')?.enabled).toBe(false);
  });

  it('AC-AL-10 — هشدارهای پروژهٔ بایگانی‌شده همه resolved می‌شوند', async () => {
    await test.owner.query(`update project set status = 'archived' where id = $1`, [pid()]);
    await evaluate();
    expect(await active()).toEqual([]);
  });
});
