import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RecomputeProject } from '../../src/modules/computation/module.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۹الف — موتور محاسبه (F10، F11). مثال مرجع (00 ۶) سرتاسری: برنامهٔ مبنا + آیتم‌های تأییدشده + هزینهٔ قطعی از API ←
// رویداد ← compute_run ← جدول‌های مشتق ← APIهای خواندن. تاریخ داده 1405/03/31 = 2026-06-21 (ساعت ثابت).
// AC-PC-01، AC-EV-01، AC-PC-04، AC-PC-09، AC-PC-10، AC-EV-06، AC-CBS-02، AC-WBS-10 (حذف مبلغ).

type UserKey = 'pm' | 'planner' | 'finance' | 'reviewer';
type ProjectKey = 'ref' | 'draft';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let plan: ReferencePlan;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
let reportCounter = 0;
const nextIp = (): string => `10.86.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const M = (millions: number | string) => String(BigInt(Math.round(Number(millions) * 1000)) * 1000n);
const id = (key: string) => plan.ids.get(key) as string;
const pid = () => org.projects.ref;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
  };
}

/** آیتم تأییدشده مستقیم در پایگاه داده (واقعیت F09؛ گردش تأیید در field-reports.int.test آزموده شده). */
async function approved(
  leaf: string,
  workDate: string,
  method: 'quantity' | 'percent' | 'steps',
  value: number | Record<string, number>,
  status: 'approved' | 'stage1' = 'approved',
) {
  const reportId = uuidv7();
  const at = `${workDate}T10:00:00Z`;
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'web_manual', $4, $5, $6, $7, $7, $7)`,
    [reportId, org.orgId, pid(), org.users.pm.id, workDate, `FR-T-${String(++reportCounter).padStart(4, '0')}`, at],
  );
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, reported_percent, steps_progress,
       status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $12, $10, $11, $11)`,
    [
      uuidv7(),
      org.orgId,
      pid(),
      reportId,
      id(leaf),
      method,
      method === 'quantity' ? value : null,
      method === 'percent' ? value : null,
      method === 'steps' ? JSON.stringify(value) : null,
      status === 'approved' ? `${workDate}T14:00:00Z` : null,
      at,
      status,
    ],
  );
}

function inScope<T>(work: () => Promise<T>): Promise<T> {
  const orm = test.app.get(MikroORM);
  return test.app.get(ClsService).run(() => {
    test.app.get(AppContext).setJobScope({ orgId: org.orgId, traceId: 'ERR-CP09-01' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return work();
    });
  });
}

/** ردیف‌های SQL با نوع صریح (نقش مالک، بیرون از RLS). */
async function rows<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await test.owner.query<T>(sql, params)).rows;
}

interface ProgressRow extends Record<string, unknown> {
  readonly compute_state: string;
  readonly computed_at: Date | null;
  readonly actual_percent: string;
}

const progressRow = async (): Promise<ProgressRow | undefined> => (await rows<ProgressRow>('select * from project_progress where project_id = $1', [pid()]))[0];
const computedAt = async (): Promise<number> => (await progressRow())?.computed_at?.getTime() ?? 0;
const settle = async (since: number) =>
  waitFor(async () => {
    const row = await progressRow();
    return row?.compute_state === 'fresh' && (row.computed_at?.getTime() ?? 0) > since;
  });

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  const team = { pm: 'project_manager', planner: 'planner', finance: 'finance', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان محاسبات',
    users: { pm: { mobile: '09167000001' }, planner: { mobile: '09167000002' }, finance: { mobile: '09167000003' }, reviewer: { mobile: '09167000004' } },
    projects: {
      ref: { code: 'PRJ-1405-961', manager: 'pm', members: team },
      draft: { code: 'PRJ-1405-962', status: 'draft', manager: 'pm', members: team },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    // دوره‌ها از ماه شروع برنامه (تصمیم 1405/08/23): فروردین ۱۴۰۵
    await client.query(`update project set planned_start = '2026-03-25', activated_at = '2026-03-25T05:30:00Z' where id = $1`, [pid()]);
  } finally {
    client.release();
  }
  // 00 ۶.۱: 1.1.1 = ۵۰۰ از ۵۰۰، 1.1.2 = ۱۸۰ از ۲۰۰، 1.2.1 قالب و آرماتور تمام، 1.2.2 هیچ
  await approved('l111', '2026-04-05', 'quantity', 300);
  await approved('l111', '2026-04-15', 'quantity', 200);
  await approved('l112', '2026-05-10', 'quantity', 120);
  await approved('l112', '2026-05-20', 'quantity', 60);
  await approved('l121', '2026-06-15', 'steps', { formwork: 100 });
  await approved('l121', '2026-06-19', 'steps', { rebar: 100 });
  for (const key of ['pm', 'planner', 'finance', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
}, 60_000);

afterAll(async () => {
  await test?.close();
});

describe('مثال مرجع سرتاسری', () => {
  it('AC-PC-10 — چهار ردیف هزینهٔ پیاپی یک اجرا (یا دو) با همهٔ رویدادها؛ ProjectProgress تازه', async () => {
    const before = await computedAt();
    // cbs.md ۹.۲: C1 ۱۰۵، C2 ۲۱۵، C3 ۱۴۰، C4 ۶۰ = AC ۵۲۰ میلیون
    const costRows: [string, number, number | null][] = [
      ['C1', 105, 500],
      ['C2', 215, 215],
      ['C3', 140, 2.8],
      ['C4', 60, null],
    ];
    for (const [key, amount, quantity] of costRows) {
      const created = await as('finance').post(`/v1/projects/${pid()}/cost-entries`, {
        cbsItemId: id(key),
        costDate: '2026-06-01',
        amount: M(amount),
        ...(quantity === null ? {} : { quantity: String(quantity) }),
        documentNo: `F-${key}`,
        post: true,
      });
      if (created.status !== 201) throw new Error(JSON.stringify(created.body));
    }
    await settle(before);
    const runs = await rows<{ status: string; trigger_event_ids: string[] }>(
      `select status, trigger_event_ids from compute_run where project_id = $1 order by created_at`,
      [pid()],
    );
    expect(runs.length).toBeLessThan(4);
    expect(runs.every((run) => run.status === 'done')).toBe(true);
    expect(runs.flatMap((run) => run.trigger_event_ids)).toHaveLength(4);
  });

  it('AC-PC-01 و AC-EV-01 — جزئیات پروژه: ۴۹٫۲ و ۵۵، PV ۵۵۰، EV ۴۹۰، AC ۵۲۰، CPI ۰٫۹۴۲۳، SPI ۰٫۸۹۰۹، EAC ۱٬۰۶۱٬۲۲۴٬۴۹۰', async () => {
    const detail = data<{ progress: Record<string, unknown>; atRisk: boolean; budgetConsumedPercent: number }>(
      (await as('pm').get(`/v1/projects/${pid()}`).expect(200)).body,
    );
    expect(detail.progress).toMatchObject({
      dataDate: '2026-06-21',
      plannedPercent: 55,
      actualPercent: 49.2,
      deviation: -5.8,
      financialPercent: 49,
      bac: M(1000),
      pv: M(550),
      ev: M(490),
      ac: M(520),
      cv: `-${M(30)}`,
      sv: `-${M(60)}`,
      eac: '1061224490',
      costIndicesDate: '2026-06-21',
      computeState: 'fresh',
    });
    expect(detail.progress['cpi']).toBeCloseTo(0.9423, 4);
    expect(detail.progress['spi']).toBeCloseTo(0.8909, 4);
    expect(detail.progress['tcpi']).toBeCloseTo(1.0625, 4);
    expect(detail.budgetConsumedPercent).toBe(52);
    expect(detail.atRisk).toBe(false);
    const list = data<{ id: string; progress: { actualPercent: number } | null }[]>((await as('pm').get('/v1/projects').expect(200)).body);
    expect(list.find((row) => row.id === pid())?.progress?.actualPercent).toBe(49.2);
    expect(list.find((row) => row.id === org.projects.draft)?.progress).toBeNull();
  });

  it('درخت WBS — پیشرفت هر آیتم، وضعیت و پیش‌بینی؛ بی cbs.view_amounts مبلغ BAC تهی (AC-WBS-10)', async () => {
    const tree = data<{ dataDate: string; items: { id: string; progress: Record<string, unknown> | null }[] }>(
      (await as('planner').get(`/v1/projects/${pid()}/wbs`).expect(200)).body,
    );
    const of = (key: string) => tree.items.find((item) => item.id === id(key))?.progress;
    expect(tree.dataDate).toBe('2026-06-21');
    expect(of('g1')).toMatchObject({ plannedPercent: 100, actualPercent: 93, deviation: -7, status: 'warning', bac: M(400) });
    expect(of('g2')).toMatchObject({ plannedPercent: 25, actualPercent: 20, status: 'warning' });
    expect(of('l112')).toMatchObject({ actualPercent: 90, actualQuantity: 180, status: 'warning' });
    expect(of('l111')).toMatchObject({ status: 'completed', forecastFinish: '2026-04-15' });
    expect(of('l122')).toMatchObject({ actualPercent: 0, status: 'not_started', forecastFinish: '2026-09-22' });
    const hidden = data<{ items: { id: string; progress: { bac: string | null; actualPercent: number } | null }[] }>(
      (await as('reviewer').get(`/v1/projects/${pid()}/wbs`).expect(200)).body,
    );
    const g1 = hidden.items.find((item) => item.id === id('g1'))?.progress;
    expect(g1).toMatchObject({ bac: null, actualPercent: 93 });
    const detail = data<{ progress: Record<string, unknown> }>((await as('reviewer').get(`/v1/projects/${pid()}`).expect(200)).body);
    expect(detail.progress).not.toHaveProperty('ev');
    expect(detail.progress['cpi']).toBeCloseTo(0.9423, 4);
  });

  it('AC-CBS-02 — درخت CBS: EV قلم‌ها ۱۰۰، ۲۰۰، ۱۳۰، ۶۰؛ پیش‌بینی ۱۰۵، ۴۳۰، ۳۲۳٫۰۷۷، ۲۰۰؛ EAC پروژه جدا', async () => {
    const tree = data<{
      costIndicesDate: string;
      items: { id: string; progress: Record<string, unknown> | null }[];
      summary: { projectEac: string; projectCpi: number; counts: { consumptionOver90: number; forecastOverBudget: number } };
    }>((await as('finance').get(`/v1/projects/${pid()}/cbs`).expect(200)).body);
    const of = (key: string) => tree.items.find((item) => item.id === id(key))?.progress;
    expect(tree.costIndicesDate).toBe('2026-06-21');
    expect(of('C1')).toMatchObject({
      ac: M(105),
      ev: M(100),
      eac: M(105),
      consumedPercent: 105,
      consumedQuantity: 500,
      earnedQuantity: 500,
      excessQuantity: 0,
    });
    expect(of('C2')).toMatchObject({ ev: M(200), eac: M(430), consumedQuantity: 215, earnedQuantity: 200, excessQuantity: 15 });
    expect(of('C3')).toMatchObject({ ev: M(130), eac: '323076923' });
    expect(of('C4')).toMatchObject({ ev: M(60), eac: M(200), consumedQuantity: null });
    expect(tree.summary.projectEac).toBe('1061224490');
    expect(tree.summary.projectCpi).toBeCloseTo(0.9423, 4);
    expect(tree.summary.counts).toMatchObject({ consumptionOver90: 1, forecastOverBudget: 3 });
  });

  it('AC-CH-02 — «این عدد از کجا آمد؟» CPI: فرمول با ۴۹۰ و ۵۲۰، تاریخ شاخص‌های هزینه و قلم‌های CBS؛ بی مجوز مبلغ بی عدد ریالی', async () => {
    type Explain = {
      valueText: string;
      formula: string;
      sources: { code: string; sharePercent: number | null }[];
      costIndicesNote: string | null;
      referenceVersion: { number: number } | null;
    };
    const cpi = data<Explain>((await as('pm').get(`/v1/projects/${pid()}/progress/explain?metric=cpi`).expect(200)).body);
    expect(cpi.formula).toBe('CPI = EV ÷ AC = ۴۹۰ ÷ ۵۲۰ = 0.9423');
    expect(cpi.valueText).toBe('0.94');
    expect(cpi.costIndicesNote).toContain('۱۴۰۵/۰۳/۳۱');
    expect(cpi.sources.map((source) => source.code)).toEqual(['C2', 'C3', 'C1', 'C4']);
    expect(cpi.referenceVersion).toMatchObject({ number: 0 });
    const actual = data<Explain>((await as('pm').get(`/v1/projects/${pid()}/progress/explain?metric=actual_percent`).expect(200)).body);
    expect(actual.formula).toBe('۰٫۴ × ۹۳ + ۰٫۶ × ۲۰ = ۴۹٫۲٪');
    const ev = data<Explain>((await as('pm').get(`/v1/projects/${pid()}/progress/explain?metric=ev`).expect(200)).body);
    expect(ev.formula).toBe('۱۰۰ × ۱ + ۳۰۰ × ۰٫۹ + ۳۰۰ × ۰٫۴ + ۳۰۰ × ۰ = ۴۹۰');
    const group = data<Explain>(
      (
        await as('pm')
          .get(`/v1/projects/${pid()}/progress/explain?metric=actual_percent&itemId=${id('g1')}`)
          .expect(200)
      ).body,
    );
    expect(group.formula).toBe('۰٫۳ × ۱۰۰ + ۰٫۷ × ۹۰ = ۹۳٪');
    const consumed = data<Explain>(
      (
        await as('finance')
          .get(`/v1/projects/${pid()}/progress/explain?metric=cbs_consumption&itemId=${id('C2')}`)
          .expect(200)
      ).body,
    );
    expect(consumed.formula).toBe('AC ÷ بودجه = ۲۱۵ ÷ ۴۰۰ = ۵۳٫۷۵٪');
    const hidden = data<Explain>((await as('reviewer').get(`/v1/projects/${pid()}/progress/explain?metric=cpi`).expect(200)).body);
    expect(hidden.formula).toBe('CPI = EV ÷ AC = 0.9423');
    const pv = data<Explain>((await as('reviewer').get(`/v1/projects/${pid()}/progress/explain?metric=pv`).expect(200)).body);
    expect(pv).toMatchObject({ valueText: '—', sources: [] });
    // تاریخ گذشته از snapshot؛ عدد هزینه فقط در تاریخ داده
    const past = data<Explain>(
      (
        await as('pm')
          .get(`/v1/projects/${pid()}/progress/explain?metric=actual_percent&itemId=${id('l112')}&date=2026-05-15`)
          .expect(200)
      ).body,
    );
    expect(past.valueText).toBe('۶۰٪');
    await as('pm').get(`/v1/projects/${pid()}/progress/explain?metric=cpi&date=2026-05-15`).expect(422);
    await as('pm').get(`/v1/projects/${org.projects.draft}/progress/explain?metric=cpi`).expect(422);
  });

  it('خلاصهٔ پرتفوی W07 (GET /projects/summary): شمار وضعیت‌ها، میانگین ۴۹٫۲، BAC و AC؛ بی مجوز مبلغ بی مبلغ', async () => {
    const summary = data<Record<string, unknown>>((await as('pm').get('/v1/projects/summary').expect(200)).body);
    expect(summary).toMatchObject({
      totalCount: 2,
      countByStatus: { active: 1, draft: 1, paused: 0, completed: 0, archived: 0 },
      avgActualPercent: 49.2,
      totalBac: M(1000),
      totalAc: M(520),
      totalAcPercent: 52,
      atRiskCount: 0,
    });
    const hidden = data<Record<string, unknown>>((await as('reviewer').get('/v1/projects/summary').expect(200)).body);
    expect(hidden).not.toHaveProperty('totalBac');
    expect(hidden['avgActualPercent']).toBe(49.2);
  });

  it('تنظیمات W29: پیش‌نمایش سه روش EAC و دوره‌ها؛ سربرگ پروژه شمار در انتظار', async () => {
    const settings = data<{ progress: { eacPreview: { method: string; value: string | null }[] }; periods: { label: string }[] }>(
      (await as('pm').get(`/v1/projects/${pid()}/settings`).expect(200)).body,
    );
    expect(Object.fromEntries(settings.progress.eacPreview.map((entry) => [entry.method, entry.value]))).toEqual({
      cpi: '1061224490',
      remaining: M(1030),
      composite: '1127496876',
    });
    expect(settings.periods.map((period) => period.label)).toEqual(['خرداد ۱۴۰۵', 'اردیبهشت ۱۴۰۵', 'فروردین ۱۴۰۵']);
    const hidden = data<{ progress: { eacPreview: { value: string | null }[] } }>(
      (await as('reviewer').get(`/v1/projects/${pid()}/settings`).expect(200)).body,
    );
    expect(hidden.progress.eacPreview.every((entry) => entry.value === null)).toBe(true);
    // آیتم در انتظار مرحلهٔ ۱ در شمارندهٔ سربرگ می‌آید و در هیچ عددی نه
    await approved('l122', '2026-06-20', 'percent', 15, 'stage1');
    const detail = data<{ counts: { pendingReports: number }; progress: { actualPercent: number } }>(
      (await as('pm').get(`/v1/projects/${pid()}`).expect(200)).body,
    );
    expect(detail.counts.pendingReports).toBe(1);
    expect(detail.progress.actualPercent).toBe(49.2);
  });

  it('snapshot روزانه از شروع برنامه تا تاریخ داده؛ روز 2026-05-15 برگ 1.1.2 در ۶۰٪', async () => {
    const [days] = await rows<{ n: number; first: string; last: string }>(
      'select count(*)::int as n, min(date)::text as first, max(date)::text as last from project_daily_snapshot where project_id = $1',
      [pid()],
    );
    expect(days).toEqual({ n: 89, first: '2026-03-25', last: '2026-06-21' });
    const [mid] = await rows<{ actual_percent: string }>(`select actual_percent from wbs_item_daily_snapshot where wbs_item_id = $1 and date = '2026-05-15'`, [
      id('l112'),
    ]);
    expect(Number(mid?.actual_percent)).toBe(60);
    const [last] = await rows<{ actual_percent: string; pv: string; ev: string; ac: string }>(
      `select actual_percent, pv, ev, ac from project_daily_snapshot where project_id = $1 and date = '2026-06-21'`,
      [pid()],
    );
    expect(last).toMatchObject({ pv: M(550), ev: M(490), ac: M(520) });
    expect(Number(last?.actual_percent)).toBe(49.2);
  });

  it('AC-PC-04 و AC-PC-09 — تأیید دیرهنگام فقط ردیف‌های از workDate را عوض می‌کند؛ اجرای دوباره همان ردیف‌ها', async () => {
    // نشانه روی روز پیش از workDate: اگر بازنویسی شود از بین می‌رود
    await test.owner.query(`update wbs_item_daily_snapshot set actual_percent = 1.2345 where wbs_item_id = $1 and date = '2026-06-17'`, [id('l122')]);
    await approved('l122', '2026-06-18', 'percent', 10);
    await inScope(() => test.app.get(RecomputeProject).recompute(pid(), '2026-06-18'));
    const snapshot = () =>
      rows<{ date: string; actual_percent: string }>(
        `select date::text, actual_percent::text from wbs_item_daily_snapshot where wbs_item_id = $1 and date >= '2026-06-16' order by date`,
        [id('l122')],
      );
    const after = await snapshot();
    expect(after).toEqual([
      { date: '2026-06-16', actual_percent: '0.0000' },
      { date: '2026-06-17', actual_percent: '1.2345' },
      { date: '2026-06-18', actual_percent: '10.0000' },
      { date: '2026-06-19', actual_percent: '10.0000' },
      { date: '2026-06-20', actual_percent: '10.0000' },
      { date: '2026-06-21', actual_percent: '10.0000' },
    ]);
    await inScope(() => test.app.get(RecomputeProject).recompute(pid(), '2026-06-18'));
    expect(await snapshot()).toEqual(after);
    // پروژه: 0.6 × (0.5×40 + 0.5×10) = 15 ← 0.4×93 + 15 = 52.2
    expect(Number((await progressRow())?.actual_percent)).toBeCloseTo(52.2, 4);
  });

  it('AC-EV-06 — تاریخ کامل بودن هزینه‌ها عقب‌تر: CPI در t_c و SPI در تاریخ داده', async () => {
    const before = await computedAt();
    // ساعت تست ثابت است؛ یک دقیقه جلو تا computedAt تازه از قبلی جدا شود
    test.clock.advance(60_000);
    await as('finance').put(`/v1/projects/${pid()}/costs-complete-through`, { date: '2026-06-01' }).expect(200);
    await settle(before);
    const progress = data<{ progress: Record<string, number | string> }>((await as('pm').get(`/v1/projects/${pid()}`).expect(200)).body).progress;
    // EV در 06-01: 100 + 270 + 0 = 370؛ AC تا 06-01 = 520
    expect(progress).toMatchObject({ costIndicesDate: '2026-06-01', ac: M(520) });
    expect(progress['cpi']).toBeCloseTo(370 / 520, 4);
    // EV در تاریخ داده پس از تأیید دیرهنگام 1.2.2: 490 + 30 = 520
    expect(progress['spi']).toBeCloseTo(520 / 550, 4);
  });
});

describe('دوره‌های گزارش (F10 ۵.۸؛ OD-06)', () => {
  type Period = { id: string; label: string; startDate: string; endDate: string; status: string; closable: boolean; closedBy: string | null };
  const periods = async () => data<Period[]>((await as('planner').get(`/v1/projects/${pid()}/periods`).expect(200)).body);

  it('ماه‌های شمسی از فروردین؛ فقط اولین دورهٔ باز گذشته بستنی؛ ترتیب و دورهٔ جاری ۴۰۹', async () => {
    const list = await periods();
    expect(list.map((period) => [period.label, period.startDate, period.endDate, period.closable])).toEqual([
      ['خرداد ۱۴۰۵', '2026-05-22', '2026-06-21', false],
      ['اردیبهشت ۱۴۰۵', '2026-04-21', '2026-05-21', false],
      ['فروردین ۱۴۰۵', '2026-03-21', '2026-04-20', true],
    ]);
    const ordibehesht = list[1] as Period;
    const khordad = list[0] as Period;
    expect(code((await as('planner').post(`/v1/projects/${pid()}/periods/${ordibehesht.id}/close`).expect(409)).body)).toBe('PERIOD_NOT_CLOSABLE');
    expect(code((await as('planner').post(`/v1/projects/${pid()}/periods/${khordad.id}/close`).expect(409)).body)).toBe('PERIOD_NOT_CLOSABLE');
    await as('reviewer')
      .post(`/v1/projects/${pid()}/periods/${(list[2] as Period).id}/close`)
      .expect(403);
    // ۱۲ ماه جلوتر هم ساخته شده (نمایش داده نمی‌شوند)
    const [count] = await rows<{ n: number }>('select count(*)::int as n from reporting_period where project_id = $1', [pid()]);
    expect(count?.n).toBeGreaterThanOrEqual(15);
  });

  it('AC-PC-11 و AC-PC-05 — بستن فروردین: PeriodSnapshot اعداد پایان دوره؛ تأیید و هزینهٔ دیرهنگام فروردین آن را عوض نمی‌کند', async () => {
    const farvardin = (await periods()).find((period) => period.label === 'فروردین ۱۴۰۵') as Period;
    const preview = data<Record<string, unknown>>((await as('planner').get(`/v1/projects/${pid()}/periods/${farvardin.id}/close-preview`).expect(200)).body);
    expect(preview).toMatchObject({ pendingItems: 0, draftCostEntries: 0, costsComplete: true });
    const after = data<Period[]>((await as('planner').post(`/v1/projects/${pid()}/periods/${farvardin.id}/close`).expect(200)).body);
    expect(after.find((period) => period.id === farvardin.id)).toMatchObject({ status: 'closed', closable: false, closedBy: 'کاربر planner' });
    expect(after.find((period) => period.label === 'اردیبهشت ۱۴۰۵')?.closable).toBe(true);
    await as('planner').post(`/v1/projects/${pid()}/periods/${farvardin.id}/close`).expect(409);

    const [snapshot] = await rows<{ date: string; project: { actualPercent: string }; items: { wbsItemId: string; actualPercent: string }[] }>(
      `select date::text, project, items from period_snapshot where period_id = $1`,
      [farvardin.id],
    );
    expect(snapshot?.date).toBe('2026-04-20');
    // پایان فروردین: 1.1.1 = ۵۰۰ از ۵۰۰
    expect(Number(snapshot?.items.find((item) => item.wbsItemId === id('l111'))?.actualPercent)).toBe(100);
    const frozen = snapshot?.project.actualPercent;
    await expect(test.owner.query(`update period_snapshot set date = '2026-04-19' where period_id = $1`, [farvardin.id])).rejects.toThrow();
    await expect(test.owner.query(`update reporting_period set status = 'open' where id = $1`, [farvardin.id])).rejects.toThrow();

    // تأیید دیرهنگام با workDate فروردین ← snapshot روزهای فروردین دست نمی‌خورد، اثر از اردیبهشت
    const before = await rows<{ date: string; actual_percent: string }>(
      `select date::text, actual_percent::text from project_daily_snapshot where project_id = $1 and date <= '2026-04-20' order by date`,
      [pid()],
    );
    await approved('l122', '2026-04-10', 'percent', 5);
    await inScope(() => test.app.get(RecomputeProject).recompute(pid(), '2026-04-10'));
    expect(
      await rows(`select date::text, actual_percent::text from project_daily_snapshot where project_id = $1 and date <= '2026-04-20' order by date`, [pid()]),
    ).toEqual(before);
    const [first] = await rows<{ actual_percent: string }>(
      `select actual_percent from wbs_item_daily_snapshot where wbs_item_id = $1 and date = '2026-04-21'`,
      [id('l122')],
    );
    expect(Number(first?.actual_percent)).toBe(5);
    const [again] = await rows<{ project: { actualPercent: string } }>(`select project from period_snapshot where period_id = $1`, [farvardin.id]);
    expect(again?.project.actualPercent).toBe(frozen);

    // هزینهٔ قطعی با تاریخ فروردین: اثر منتقل‌شده
    const posted = data<{ entry: { periodShifted: boolean } }>(
      (
        await as('finance')
          .post(`/v1/projects/${pid()}/cost-entries`, { cbsItemId: id('C4'), costDate: '2026-04-15', amount: M(1), documentNo: 'F-late', post: true })
          .expect(201)
      ).body,
    );
    expect(posted.entry.periodShifted).toBe(true);
  });
});
