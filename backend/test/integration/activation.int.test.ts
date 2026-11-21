import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۶ — فعال‌سازی و ثبت برنامهٔ مبنا (F02 ۸.۱ + F04؛ AC-PS-05، AC-PS-06). «پس از آن اپ فعالیت می‌دهد» با F08 (برش ۹).

type UserKey = 'pm' | 'planner' | 'reviewer' | 'sup';
type ProjectKey = 'ready' | 'bad' | 'empty';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.83.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = (project: ProjectKey) => org.projects[project];

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
  };
}

interface Check {
  canActivate: boolean;
  blockers: { code: string; passed: boolean; detail: string | null; fixAt: string | null }[];
  warnings: { code: string; passed: boolean; detail: string | null }[];
}

const leaf = (title: string, weight: number) => ({
  title,
  weightInParent: weight,
  plannedStart: '2026-12-01',
  plannedFinish: '2027-02-01',
  measurementMethod: 'percent',
});

async function build(project: ProjectKey, groupWeights: [number, number]) {
  const tree = data<{ draftRevision: number }>(
    (
      await as('planner')
        .get(`/v1/projects/${pid(project)}/plan-draft/wbs`)
        .expect(200)
    ).body,
  );
  await as('planner')
    .post(`/v1/projects/${pid(project)}/plan-draft/wbs/ops`, {
      draftRevision: tree.draftRevision,
      ops: [
        { type: 'add', tempId: 'g', parentId: null, afterId: null, fields: { title: 'اسکلت', weightInParent: 100 } },
        { type: 'add', tempId: 'a', parentId: 'g', afterId: null, fields: leaf('ستون‌ها', groupWeights[0]) },
        { type: 'add', tempId: 'b', parentId: 'g', afterId: 'a', fields: leaf('تیرها', groupWeights[1]) },
      ],
    })
    .expect(200);
}

const checkOf = async (project: ProjectKey) =>
  data<Check>(
    (
      await as('pm')
        .get(`/v1/projects/${pid(project)}/activation-check`)
        .expect(200)
    ).body,
  );

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer', sup: 'supervisor' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان فعال‌سازی',
    users: { pm: { mobile: '09164000001' }, planner: { mobile: '09164000002' }, reviewer: { mobile: '09164000003' }, sup: { mobile: '09164000004' } },
    projects: {
      ready: { code: 'PRJ-1405-801', status: 'draft', manager: 'pm', members: team },
      bad: { code: 'PRJ-1405-802', status: 'draft', manager: 'pm', members: team },
      empty: { code: 'PRJ-1405-803', status: 'draft', manager: 'pm', members: team },
    },
  });
  await test.owner.query(`update project set planned_start = '2026-12-01', planned_finish = '2027-06-30' where id = any($1)`, [Object.values(org.projects)]);
  // پروژهٔ empty تقویم ذخیره‌شده ندارد (F02 ۸.۱ بند ۴)
  await test.owner.query('delete from project_calendar where project_id = $1', [pid('empty')]);
  for (const key of ['pm', 'planner', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  await build('ready', [60, 40]);
  await build('bad', [60, 35]);
});

afterAll(async () => {
  await test?.close();
});

describe('F02 ۸.۱ — پیش‌شرط‌ها', () => {
  it('AC-PS-05 — گروهی با جمع وزن ۹۵ مانع است؛ نبودن سرپرست مانع نیست و هشدار می‌دهد', async () => {
    const bad = await checkOf('bad');
    expect(bad.canActivate).toBe(false);
    expect(bad.blockers.find((entry) => entry.code === 'weights_100')).toMatchObject({ passed: false, fixAt: 'wbs' });
    expect(bad.blockers.find((entry) => entry.code === 'weights_100')?.detail).toContain('۹۵');
    const rejected = await as('pm')
      .post(`/v1/projects/${pid('bad')}/activate`)
      .expect(422);
    expect(code(rejected.body)).toBe('PROJECT_ACTIVATION_BLOCKED');

    const ready = await checkOf('ready');
    expect(ready.canActivate).toBe(true);
    expect(ready.blockers.every((entry) => entry.passed)).toBe(true);
    expect(ready.warnings.find((entry) => entry.code === 'AL-STR-04')).toMatchObject({ passed: false });
    expect(ready.warnings.find((entry) => entry.code === 'AL-STR-04')?.detail).toContain('۲ برگ');
    expect(ready.warnings.find((entry) => entry.code === 'AL-STR-01')?.passed).toBe(false);
    expect(ready.warnings.map((entry) => entry.code)).toEqual(['AL-STR-01', 'AL-STR-04', 'AL-STR-02', 'AL-STR-06', 'site_location', 'costs_complete']);
  });

  it('F02 ۸.۱ بند ۱ و ۴ — بی فعالیت و بی تقویم مانع است', async () => {
    const empty = await checkOf('empty');
    expect(empty.canActivate).toBe(false);
    expect(empty.blockers.filter((entry) => !entry.passed).map((entry) => entry.code)).toEqual(['has_leaf', 'manager_calendar']);
  });

  it('project.activate — ناظر فعال نمی‌کند', async () => {
    await as('reviewer')
      .get(`/v1/projects/${pid('ready')}/activation-check`)
      .expect(403);
    await as('reviewer')
      .post(`/v1/projects/${pid('ready')}/activate`)
      .expect(403);
  });
});

describe('F02 ۸.۱ — اثر فعال‌سازی', () => {
  it('AC-PS-06 — مبنا اعمال، وضعیت فعال، ProjectActivated و NT-PRJ-01 به اعضا', async () => {
    const activated = data<{ id: string; status: string }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('ready')}/activate`)
          .expect(200)
      ).body,
    );
    expect(activated).toEqual({ id: pid('ready'), status: 'active' });

    const { rows: versions } = await test.owner.query<{ id: string; kind: string; status: string; number: number }>(
      'select id, kind, status, number from plan_version where project_id = $1',
      [pid('ready')],
    );
    expect(versions).toEqual([expect.objectContaining({ kind: 'baseline', status: 'applied', number: 0 })]);
    const baseline = versions[0]?.id;
    const { rows: project } = await test.owner.query<{
      baseline_version_id: string;
      current_version_id: string;
      pv_reference_version_id: string;
      activated: boolean;
    }>('select baseline_version_id, current_version_id, pv_reference_version_id, activated_at is not null as activated from project where id = $1', [
      pid('ready'),
    ]);
    expect(project[0]).toEqual({ baseline_version_id: baseline, current_version_id: baseline, pv_reference_version_id: baseline, activated: true });
    const { rows: events } = await test.owner.query<{ type: string }>(
      "select type from domain_event where project_id = $1 and type in ('ProjectActivated', 'PlanVersionApplied')",
      [pid('ready')],
    );
    expect(events.map((row) => row.type)).toEqual(['ProjectActivated']);
    // AC-PV-01: عکس مبنا تغییرناپذیر
    await expect(test.owner.query("update wbs_item_plan set title = 'دست‌کاری' where plan_version_id = $1", [baseline])).rejects.toThrow(/تغییر نمی‌کند/);

    await waitFor(async () => {
      const { rows } = await test.owner.query("select user_id from notification where code = 'NT-PRJ-01' and project_id = $1", [pid('ready')]);
      return rows.length === 3;
    });
    const { rows: self } = await test.owner.query("select 1 from notification where code = 'NT-PRJ-01' and user_id = $1", [org.users.pm.id]);
    expect(self).toHaveLength(0);
  });

  it('F04 ۳ — پس از فعال‌سازی ویرایش بازنگری کاری تازه می‌سازد و جاری دست نمی‌خورد', async () => {
    const again = await as('pm')
      .post(`/v1/projects/${pid('ready')}/activate`)
      .expect(409);
    expect(code(again.body)).toBe('TRANSITION_NOT_ALLOWED');
    await as('pm')
      .get(`/v1/projects/${pid('ready')}/activation-check`)
      .expect(409);
    const tree = data<{ draft: unknown; draftRevision: number; items: { id: string; title: string }[] }>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('ready')}/plan-draft/wbs`)
          .expect(200)
      ).body,
    );
    expect(tree.draft).toBeNull();
    const target = tree.items.find((item) => item.title === 'ستون‌ها') as { id: string };
    const saved = data<{ draft: { kind: string; number: number } }>(
      (
        await as('planner')
          .post(`/v1/projects/${pid('ready')}/plan-draft/wbs/ops`, {
            draftRevision: 0,
            ops: [{ type: 'update', id: target.id, fields: { title: 'ستون‌های بتنی' } }],
          })
          .expect(200)
      ).body,
    );
    expect(saved.draft).toMatchObject({ kind: 'revision', number: 1 });
    const current = data<{ items: { title: string }[] }>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('ready')}/wbs`)
          .expect(200)
      ).body,
    );
    expect(current.items.map((item) => item.title)).toContain('ستون‌ها');
  });
});
