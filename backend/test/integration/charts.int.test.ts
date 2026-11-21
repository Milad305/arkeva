import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۱۴الف — نمای کلی W10، داشبورد W05 و فعالیت‌های اخیر (charts.md ۶.۱، ۶.۲، ۸، ۹؛ platform.md ۱۰).
// مثال مرجع (00 ۶): BAC ۱۰۰۰، PV ۵۵۰، EV ۴۹۰، AC ۵۲۰ میلیون؛ تاریخ داده ۱۴۰۵/۰۳/۳۱ (2026-06-21).

type UserKey = 'pm' | 'finance' | 'client' | 'outsider' | 'sup1' | 'sup2' | 'reviewer';

let test: TestApp;
let org: SeededOrg<UserKey, 'ref' | 'draft'>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.74.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const M = (millions: number) => (BigInt(millions) * 1_000_000n).toString();
const pid = () => org.projects.ref;
const id = (key: string) => plan.ids.get(key) as string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (name: string, value: string) => T }>(req: T) => req.set('Authorization', `Bearer ${tokens[user]}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
  };
}

async function approved(leaf: string, author: string, workDate: string, method: 'quantity' | 'steps', value: number | Record<string, number>) {
  const reportId = uuidv7();
  const at = `${workDate}T10:00:00Z`;
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, $5, $6, $7, $7, $7)`,
    [reportId, org.orgId, pid(), author, workDate, `FR-C-${reportId.slice(-8)}`, at],
  );
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, steps_progress, status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9, $9, $9)`,
    [uuidv7(), org.orgId, pid(), reportId, id(leaf), method, method === 'quantity' ? value : null, method === 'steps' ? JSON.stringify(value) : null, at],
  );
}

interface Overview {
  dataDate: string;
  costIndicesDate: string | null;
  computeState: string;
  progress: { plannedPercent: number; actualPercent: number; deviation: number; status: string };
  budget: { consumedPercent: number; ac?: string; bac?: string };
  time: { elapsedWorkingDays: number; totalWorkingDays: number; delayWorkingDays: number | null; forecastFinish: string | null };
  evm: {
    cpi: number;
    spi: number;
    costTrend: string;
    scheduleTrend: string;
    scheduleGapPercent: number;
    costAlert: string | null;
    scheduleAlert: string | null;
  };
  sCurve: { date: string; planned: number | null; actual: number | null; forecast: number | null }[];
  criticalItems: { code: string; deviation: number }[];
  topCbsItems: { code: string; consumedPercent: number; budget?: string; alertSeverity: string | null }[];
  openRisks: { total: number };
  fieldTeam: { reportedCount: number; expectedCount: number; supervisors: { state: string; workingDaysWithoutReport: number }[] };
  hasApprovedReports: boolean;
  pvReference: { id: string } | null;
}

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  const team = { pm: 'project_manager', finance: 'finance', client: 'client_reviewer', sup1: 'supervisor', sup2: 'supervisor', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان نمودار',
    users: {
      pm: { mobile: '09200100001', fullName: 'مریم احمدی' },
      finance: { mobile: '09200100002' },
      client: { mobile: '09200100003' },
      outsider: { mobile: '09200100004' },
      reviewer: { mobile: '09200100007', fullName: 'ناظر' },
      sup1: { mobile: '09200100005', fullName: 'سرپرست یک' },
      sup2: { mobile: '09200100006', fullName: 'سرپرست دو' },
    },
    projects: {
      ref: { code: 'PRJ-1405-801', name: 'ساختمان مثال مرجع', manager: 'pm', members: team },
      draft: { code: 'PRJ-1405-802', name: 'پیش‌نویس', manager: 'pm', status: 'draft', members: { pm: 'project_manager' } },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = any($2)`, [org.users.sup1.id, [id('l111'), id('l112')]]);
    await client.query(`update wbs_item set supervisor_user_id = $1 where id = any($2)`, [org.users.sup2.id, [id('l121'), id('l122')]]);
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
  await approved('l121', org.users.sup2.id, '2026-06-21', 'steps', { rebar: 100 });
  for (const key of ['pm', 'finance', 'client', 'outsider', 'reviewer'] as const)
    tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
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
  await waitFor(async () => {
    const { rows } = await test.owner.query<{ ac: string; compute_state: string }>(
      'select ac::text, compute_state from project_progress where project_id = $1',
      [pid()],
    );
    return rows[0]?.ac === M(520) && rows[0]?.compute_state === 'fresh';
  }, 40_000);
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('نمای کلی، داشبورد و فعالیت‌ها (برش ۱۴الف)', () => {
  it('AC-CH-01 — W10 مثال مرجع: ۴۹٫۲ و ۵۵ و −۵٫۸، CPI ۰٫۹۴ و SPI ۰٫۸۹، از مقادیر ذخیره‌شده', async () => {
    const overview = data<Overview>((await as('pm').get(`/v1/projects/${pid()}/overview`).expect(200)).body);
    expect(overview).toMatchObject({ dataDate: '2026-06-21', computeState: 'ready', hasApprovedReports: true });
    expect(overview.progress.actualPercent).toBeCloseTo(49.2, 4);
    expect(overview.progress.plannedPercent).toBeCloseTo(55, 4);
    expect(overview.progress.deviation).toBeCloseTo(-5.8, 4);
    expect(overview.progress.status).toBe('warning');
    expect(overview.evm.cpi).toBeCloseTo(0.9423, 4);
    expect(overview.evm.spi).toBeCloseTo(0.8909, 4);
    expect(overview.evm).toMatchObject({ costTrend: 'over', scheduleTrend: 'behind' });
    expect(overview.evm.scheduleGapPercent).toBeCloseTo(10.91, 2);
    expect(overview.budget).toEqual({ consumedPercent: 52, ac: M(520), bac: M(1000) });
    // کارت زمان: روز کاری تقویم همین پروژه؛ تأخیر و پیش‌بینی همان مقدار ذخیره‌شدهٔ F11 (تقویم آزمون با مثال evm.md ۶.۱ فرق دارد)
    const { rows: stored } = await test.owner.query<{ delay_days: number; forecast_finish: string }>(
      `select delay_days, to_char(forecast_finish, 'YYYY-MM-DD') as forecast_finish from project_progress where project_id = $1`,
      [pid()],
    );
    expect(overview.time).toMatchObject({ totalWorkingDays: 156, delayWorkingDays: stored[0]?.delay_days, forecastFinish: stored[0]?.forecast_finish });
    expect(overview.time.elapsedWorkingDays + (overview.time as unknown as { remainingWorkingDays: number }).remainingWorkingDays).toBe(156);
    expect(overview.pvReference?.id).toBeTruthy();
    // منحنی S: برنامه‌ای از ۰ تا ۱۰۰، واقعی تا تاریخ داده، پیش‌بینی از ۴۹٫۲ تا ۱۰۰
    const today = overview.sCurve.find((point) => point.date === '2026-06-21');
    expect(today?.planned).toBeCloseTo(55, 1);
    expect(today?.actual).toBeCloseTo(49.2, 1);
    // نقطهٔ اول پایان نخستین روز برنامه است (منحنی پایان روز)
    expect(overview.sCurve[0]?.planned).toBeLessThan(1);
    expect(overview.sCurve.filter((point) => point.planned !== null).at(-1)?.planned).toBe(100);
    expect(overview.sCurve.at(-1)?.forecast).toBe(100);
    expect(overview.sCurve.at(-1)?.date).toBe(overview.time.forecastFinish);
    expect(overview.sCurve.every((point) => point.actual === null || point.date <= '2026-06-21')).toBe(true);
    expect(overview.sCurve.length).toBeLessThanOrEqual(70);
    // ۵ فعالیت بحرانی و اقلام پرمصرف
    expect(overview.criticalItems.map((item) => item.code)).toContain('1.2.1');
    expect(overview.topCbsItems[0]).toMatchObject({ code: 'C1', consumedPercent: 105 });
    expect(overview.topCbsItems[0]?.budget).toBe(M(100));
    // تیم کارگاه امروز: سرپرست دو امروز گزارش داده، سرپرست یک نه
    expect(overview.fieldTeam).toMatchObject({ reportedCount: 1, expectedCount: 2 });
  });

  it('AC-CH-03 — خط برنامهٔ مرجع از PlanVersionCurve ذخیره‌شده است و با تغییر تقویم عوض نمی‌شود', async () => {
    const before = data<Overview>((await as('pm').get(`/v1/projects/${pid()}/overview`).expect(200)).body);
    const { rows } = await test.owner.query<{ n: number }>('select count(*)::int as n from plan_version_curve where project_id = $1', [pid()]);
    expect(rows[0]?.n).toBeGreaterThan(150);
    // تعطیلی تازه در گذشته: منحنی ذخیره‌شده ثابت می‌ماند
    await test.owner.query(`update project_calendar set holidays = '[{"date":"2026-04-01","title":"تست","enabled":true}]'::jsonb where project_id = $1`, [
      pid(),
    ]);
    const after = data<Overview>((await as('pm').get(`/v1/projects/${pid()}/overview`).expect(200)).body);
    expect(after.sCurve.map((point) => point.planned)).toEqual(before.sCurve.map((point) => point.planned));
  });

  it('AC-CH-04 و AC-CH-05 — بی cbs.view_amounts مبلغ نیست؛ ناظر کارفرما فقط حالت خلاصه', async () => {
    const summary = data<Overview>((await as('client').get(`/v1/projects/${pid()}/overview`).expect(200)).body);
    expect(summary.budget).toEqual({ consumedPercent: 52 });
    expect(JSON.stringify(summary)).not.toContain(M(520));
    expect(summary.progress.actualPercent).toBeCloseTo(49.2, 4);
    expect(summary.sCurve.length).toBeGreaterThan(0);
    expect(summary.criticalItems).toEqual([]);
    expect(summary.topCbsItems).toEqual([]);
    expect(summary.fieldTeam.supervisors).toEqual([]);
    await as('outsider').get(`/v1/projects/${pid()}/overview`).expect(404);
    expect(code((await as('pm').get(`/v1/projects/${org.projects.draft}/overview`).expect(409)).body)).toBe('CHARTS_NOT_AVAILABLE');
  });

  it('W05 — داشبورد: کارت‌ها، جدول، روند، صف تأیید و ریسک؛ نقطهٔ امروز روند همان میانگین است', async () => {
    await as('pm')
      .post(`/v1/projects/${pid()}/risks`, {
        title: 'تأخیر تحویل میلگرد',
        category: 'تأمین',
        probability: 4,
        impact: 5,
        responseStrategy: 'mitigate',
        ownerUserId: org.users.pm.id,
        links: [],
        firstAction: null,
        notifyBelowThreshold: false,
      })
      .expect(201);
    const dashboard = data<{
      dataDate: string;
      kpis: { activeCount: number; totalCount: number; avgActualPercent: number; avgPlannedPercent: number; avgStatus: string; atRiskCount: number };
      projects: { id: string; status: string; atRisk: boolean }[];
      trend: { date: string; actual: number | null; planned: number | null }[];
      pendingApprovals: { total: number } | null;
      risks: {
        totalOpen: number;
        items: { code: string; level: string }[];
        matrix: { probability: number; impact: number; count: number; level: string }[];
      } | null;
    }>((await as('pm').get('/v1/dashboard').expect(200)).body);
    expect(dashboard.kpis).toMatchObject({ activeCount: 1, totalCount: 2, avgStatus: 'warning', atRiskCount: 0 });
    expect(dashboard.kpis.avgActualPercent).toBeCloseTo(49.2, 4);
    expect(dashboard.projects).toEqual([expect.objectContaining({ id: pid(), status: 'warning', atRisk: false })]);
    const today = dashboard.trend.find((point) => point.date === dashboard.dataDate);
    expect(today?.actual).toBeCloseTo(49.2, 1);
    expect(today?.planned).toBeCloseTo(55, 1);
    expect(dashboard.pendingApprovals).toMatchObject({ total: 0 });
    expect(dashboard.risks?.items).toEqual([expect.objectContaining({ code: 'RSK-001', level: 'critical' })]);
    expect(dashboard.risks?.matrix).toHaveLength(25);
    expect(dashboard.risks?.matrix.find((cell) => cell.probability === 4 && cell.impact === 5)).toMatchObject({ count: 1, level: 'critical' });
    // ناظر کارفرما dashboard.view دارد؛ کاربر بی هیچ پروژه نه
    await as('client').get('/v1/dashboard').expect(200);
    await as('outsider').get('/v1/dashboard').expect(403);
  });

  it('فعالیت‌های اخیر از outbox با فهرست سفید؛ فید سازمان نام پروژه دارد', async () => {
    const feed = data<{ kind: string; subject: { type: string; label: string } | null; details: string | null; project?: { name: string } }[]>(
      (await as('pm').get(`/v1/projects/${pid()}/activity?limit=20`).expect(200)).body,
    );
    const kinds = new Set(feed.map((event) => event.kind));
    expect(kinds.has('cost_posted')).toBe(true);
    expect(kinds.has('risk_changed')).toBe(true);
    expect(feed.find((event) => event.kind === 'risk_changed')?.subject).toMatchObject({ type: 'risk', label: 'تأخیر تحویل میلگرد' });
    expect(feed.every((event) => event.project === undefined)).toBe(true);
    expect(JSON.stringify(feed)).not.toMatch(/ریال/);
    const mine = data<{ project?: { name: string } }[]>((await as('pm').get('/v1/activity?limit=5').expect(200)).body);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0]?.project?.name).toBe('ساختمان مثال مرجع');
    await as('outsider').get(`/v1/projects/${pid()}/activity`).expect(404);
  });
});

describe('زبانه‌های تحلیلی W21 تا W24 (برش ۱۴ب)', () => {
  it('W21 — منحنی چهارخطی، EVM ماهانه تا t_c، گانت دو سطح؛ بازهٔ دورهٔ بسته', async () => {
    const all = data<{
      range: { from: string; to: string; preset: string };
      hasRevision: boolean;
      curve: { date: string; baseline: number | null; revised: number | null; actual: number | null; forecast: number | null }[];
      kpis: { actualPercent: number; deviation: number };
      evm: { months: { date: string; pv: string | null; ev: string | null; ac: string | null }[]; cpi: number; ac: string | null; eac: string | null };
      gantt: { rows: { code: string; depth: number; actualStart: string | null; actualPercent: number }[] };
    }>((await as('pm').get(`/v1/projects/${pid()}/charts/progress?range=all`).expect(200)).body);
    expect(all.range.preset).toBe('all');
    expect(all.hasRevision).toBe(false);
    expect(all.curve.every((point) => point.revised === null)).toBe(true);
    expect(all.curve.find((point) => point.date === '2026-06-21')).toMatchObject({ actual: 49.2 });
    expect(all.curve.at(-1)?.forecast).toBe(100);
    expect(all.curve.every((point) => point.actual === null || point.date <= '2026-06-21')).toBe(true);
    expect(all.kpis.actualPercent).toBeCloseTo(49.2, 4);
    expect(all.evm.cpi).toBeCloseTo(0.9423, 4);
    expect(all.evm.ac).toBe(M(520));
    expect(all.evm.months.find((month) => month.date === '2026-06-21')).toMatchObject({ ac: M(520) });
    // پس از t_c (= تاریخ داده) EV و AC نیست
    expect(all.evm.months.filter((month) => month.date > '2026-06-21').every((month) => month.ac === null && month.ev === null)).toBe(true);
    expect(all.gantt.rows.map((row) => `${row.code}:${row.depth}`).sort()).toEqual(['1.1:0', '1.2:0']);
    expect(all.gantt.rows.find((row) => row.code === '1.1')?.actualStart).toBe('2026-04-05');

    const closed = data<{ range: { from: string; to: string; closedPeriod: boolean } }>(
      (await as('pm').get(`/v1/projects/${pid()}/charts/progress?range=closed_period`).expect(200)).body,
    );
    expect(closed.range).toMatchObject({ from: '2026-04-21', to: '2026-05-21', closedPeriod: true });
    // بی cbs.view_amounts نسبت‌ها می‌آیند، مبلغ نه؛ ناظر کارفرما (فقط خلاصه) زبانه‌ها را ندارد (AC-CH-05)
    const blind = data<{ evm: { cpi: number; ac: string | null; months: { pv: string | null }[] } }>(
      (await as('reviewer').get(`/v1/projects/${pid()}/charts/progress`).expect(200)).body,
    );
    expect(blind.evm.cpi).toBeCloseTo(0.9423, 4);
    expect(blind.evm.ac).toBeNull();
    expect(blind.evm.months.every((month) => month.pv === null)).toBe(true);
    await as('client').get(`/v1/projects/${pid()}/charts/progress`).expect(403);
  });

  it('AC-CH-04 — W22 فقط با cbs.view_amounts؛ کارت‌ها، گروه‌ها، نرخ مصرف و اقلام پرهزینه', async () => {
    expect(code((await as('reviewer').get(`/v1/projects/${pid()}/charts/cost`).expect(403)).body)).toBe('PERMISSION_DENIED');
    const cost = data<{
      kpis: { bac: string; ac: string; acPercent: number; eacVariancePercent: number; cpi: number; tcpi: number | null };
      byType: { budget: string; percent: number }[];
      byGroup: { code: string }[];
      burn: { date: string; actual: string | null; planned: string | null }[];
      top: { code: string; consumedPercent: number; alertSeverity: string | null }[];
    }>((await as('finance').get(`/v1/projects/${pid()}/charts/cost?range=all`).expect(200)).body);
    expect(cost.kpis).toMatchObject({ bac: M(1000), ac: M(520), acPercent: 52 });
    expect(cost.kpis.eacVariancePercent).toBeCloseTo(6.1, 1);
    expect(cost.byType.reduce((sum, row) => sum + row.percent, 0)).toBeCloseTo(100, 0);
    expect(cost.byGroup.length).toBeGreaterThan(0);
    // همهٔ هزینه‌ها با تاریخ 2026-06-01 در خرداد (از 2026-05-22)
    expect(cost.burn.find((row) => row.date === '2026-05-22')?.actual).toBe(M(520));
    expect(
      cost.burn
        .filter((row) => row.actual !== null)
        .reduce((sum, row) => sum + BigInt(row.actual as string), 0n)
        .toString(),
    ).toBe(M(520));
    expect(cost.top).toHaveLength(4);
    expect(cost.top.find((row) => row.code === 'C1')?.consumedPercent).toBe(105);
  });

  it('AC-CH-06 — W23: نفرات = جمع crewCount؛ heatmap سرپرستان؛ بی بخش کمبود نیرو به تفکیک تخصص', async () => {
    await test.owner.query(
      `update field_report_item set crew_count = 7 where project_id = $1 and report_id in (select id from field_report where project_id = $1 and work_date = '2026-06-21')`,
      [pid()],
    );
    const resources = data<
      Record<string, unknown> & {
        kpis: { avgCrew: number };
        crew: { date: string; total: number }[];
        heatmap: { rows: { user: { id: string }; cells: { date: string; count: number; holiday: boolean }[] }[] };
        approvers: { user: { id: string } }[];
      }
    >((await as('pm').get(`/v1/projects/${pid()}/charts/resources?range=month`).expect(200)).body);
    expect(resources.crew.find((entry) => entry.date === '2026-06-21')?.total).toBe(7);
    expect(resources.kpis.avgCrew).toBe(7);
    expect(Object.keys(resources)).not.toContain('shortageBySkill');
    expect(resources.heatmap.rows.map((row) => row.user.id).sort()).toEqual([org.users.sup1.id, org.users.sup2.id].sort());
    const sup2 = resources.heatmap.rows.find((row) => row.user.id === org.users.sup2.id);
    expect(sup2?.cells.find((cell) => cell.date === '2026-06-21')?.count).toBe(1);
    expect(sup2?.cells.find((cell) => cell.date === '2026-06-19')?.holiday).toBe(true); // جمعه
    expect(resources.approvers.map((entry) => entry.user.id)).toContain(org.users.reviewer.id);
    await as('client').get(`/v1/projects/${pid()}/charts/resources`).expect(403);
  });

  it('W24 و AC-CH-10 و AC-CH-08 — treemap، خارج از مبنا با برچسب، و «در حال به‌روزرسانی» با مقدار قبلی', async () => {
    const risk = data<{
      kpis: { leafCount: number; spi: number; pv: string | null };
      leaves: { code: string; weight: number; outOfBaseline: boolean }[];
      distribution: { count: number }[];
      groups: { code: string }[];
    }>((await as('pm').get(`/v1/projects/${pid()}/charts/risk`).expect(200)).body);
    expect(risk.kpis.leafCount).toBe(4);
    expect(risk.leaves.reduce((sum, leaf) => sum + leaf.weight, 0)).toBeCloseTo(100, 4);
    expect(risk.distribution.reduce((sum, row) => sum + row.count, 0)).toBe(4);
    expect(risk.groups.map((group) => group.code).sort()).toEqual(['1.1', '1.2']);
    expect(risk.kpis.spi).toBeCloseTo(0.8909, 4);
    expect(risk.kpis.pv).toBe(M(550));
    expect(risk.leaves.every((leaf) => !leaf.outOfBaseline)).toBe(true);

    // OD-18: برگ بیرون از مرجع با پرچم ذخیره‌شدهٔ F10؛ AC-CH-08: «در حال به‌روزرسانی»، مقدار قبلی می‌ماند
    await test.owner.query(`update wbs_item_progress set in_reference = false where wbs_item_id = $1`, [id('l122')]);
    await test.owner.query(`update project_progress set compute_state = 'updating' where project_id = $1`, [pid()]);
    try {
      const marked = data<{ computeState: string; leaves: { code: string; outOfBaseline: boolean }[] }>(
        (await as('pm').get(`/v1/projects/${pid()}/charts/risk`).expect(200)).body,
      );
      expect(marked.computeState).toBe('updating');
      expect(marked.leaves.find((leaf) => leaf.code === '1.2.2')?.outOfBaseline).toBe(true);
      const overview = data<Overview>((await as('pm').get(`/v1/projects/${pid()}/overview`).expect(200)).body);
      expect(overview.computeState).toBe('updating');
      expect(overview.progress.actualPercent).toBeCloseTo(49.2, 4);
    } finally {
      await test.owner.query(`update wbs_item_progress set in_reference = true where wbs_item_id = $1`, [id('l122')]);
      await test.owner.query(`update project_progress set compute_state = 'fresh' where project_id = $1`, [pid()]);
    }
  });
});
