import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { sampleMspdi, type SampleTask, sampleTasks } from '../fixtures/msp.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// F15 — ورود از MSP (msp-integration.md ۷.۱، ۷.۲؛ برش ۱۷الف): AC-MS-01 تا AC-MS-05 روی HTTP.

type UserKey = 'pm' | 'planner' | 'sup' | 'reviewer';
type ProjectKey = 'draft' | 'second' | 'active';
let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.71.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

function api(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    put: (path: string, body: object) => agent.put(path).set(auth).send(body),
    upload: (path: string, name: string, content: string) => agent.post(path).set(auth).attach('file', Buffer.from(content, 'utf8'), name),
  };
}

const data = <T>(body: unknown): T => (body as { data: T }).data;
const pid = (key: ProjectKey) => org.projects[key];

interface Session {
  id: string;
  canContinue: boolean;
  blockingReason: string | null;
  checks: { id: string; severity: string; resolutions: { id: string }[] }[];
  resources: { id: string; name: string; userId: string | null; action: string }[];
  stats: { tasks: number; leaves: number; tasksWithProgress: number };
  builtAt: string | null;
  rollbackUntil: string | null;
}

/** ۱۸۶ فعالیت؛ برگ 2.2.1 (درصدی) ۴۰٪ و 1.1.1 (مقداری) ۲۵٪ در فایل. */
function fileTasks(): SampleTask[] {
  return sampleTasks().map((task) => (task.wbs === '2.2.1' ? { ...task, percent: 40 } : task.wbs === '1.1.1' ? { ...task, percent: 25 } : task));
}

function upload(project: ProjectKey, xml = sampleMspdi(fileTasks(), { statusDate: '2026-10-01' }), user: UserKey = 'planner') {
  return api(user).upload(`/v1/projects/${pid(project)}/msp/imports`, 'plan.xml', xml);
}

beforeAll(async () => {
  test = await startTestApp();
  const members = { pm: 'project_manager', planner: 'planner', sup: 'supervisor', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان MSP',
    users: {
      pm: { mobile: '09171000001' },
      planner: { mobile: '09171000002' },
      sup: { mobile: '09171000003', fullName: 'Ali Mohammadi' },
      reviewer: { mobile: '09171000004' },
    },
    projects: {
      draft: { code: 'PRJ-1405-701', status: 'draft', manager: 'pm', members },
      second: { code: 'PRJ-1405-702', status: 'draft', manager: 'pm', members },
      active: { code: 'PRJ-1405-703', status: 'active', manager: 'pm', members },
    },
  });
  for (const key of ['pm', 'planner', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F15 ۷.۱ — بارگذاری و اعتبارسنجی', () => {
  it('MPP و پروژهٔ فعال رد می‌شوند؛ بی msp.import ۴۰۳', async () => {
    const mpp = await api('planner').upload(`/v1/projects/${pid('draft')}/msp/imports`, 'plan.mpp', 'binary');
    expect(mpp.status).toBe(422);
    expect(mpp.body).toMatchObject({ code: 'MSP_FILE_INVALID' });
    expect((mpp.body as { message: string }).message).toContain('XML Format');
    const active = await upload('active');
    expect(active.status).toBe(409);
    expect(active.body).toMatchObject({ code: 'MSP_IMPORT_CONFLICT' });
    await upload('draft', undefined, 'reviewer').then((response) => expect(response.status).toBe(403));
  });

  it('AC-MS-03 — خطا (UID تکراری) ادامه و ساخت را می‌بندد؛ «بارگذاری دوباره» هم؛ هشدار نه', async () => {
    const tasks = sampleTasks({ phases: 1, groups: 1, leaves: 3 });
    const broken = sampleMspdi([...tasks, { ...(tasks[2] as SampleTask), wbs: '1.1.9', name: 'تکراری' }]);
    const session = data<Session>((await upload('second', broken).expect(201)).body);
    expect(session.canContinue).toBe(false);
    expect(session.checks.find((check) => check.id === 'duplicate_uid')).toMatchObject({ severity: 'error' });
    const blocked = await api('planner').post(`/v1/msp/imports/${session.id}/build`, { openingProgress: [] });
    expect(blocked.status).toBe(422);
    expect(blocked.body).toMatchObject({ code: 'MSP_IMPORT_INVALID' });
    const resolved = data<Session>(
      (
        await api('planner')
          .put(`/v1/msp/imports/${session.id}/mapping`, { sessionId: session.id, checkResolution: { checkId: 'duplicate_uid', resolution: 'reupload' } })
          .expect(200)
      ).body,
    );
    expect(resolved).toMatchObject({ canContinue: false, blockingReason: 'فایل را اصلاح و دوباره بارگذاری کنید.' });

    const warned = data<Session>(
      (
        await upload(
          'second',
          sampleMspdi([...tasks, { uid: 99, wbs: '2', name: 'تحویل', level: 1, start: '2026-04-01', finish: '2026-04-01', days: 0, milestone: true }]),
        ).expect(201)
      ).body,
    );
    expect(warned.checks.some((check) => check.severity === 'warning')).toBe(true);
    expect(warned.canContinue).toBe(true);
  });
});

describe('F15 ۷.۱ — ساخت، پیشرفت اولیه و بازگردانی', () => {
  let sessionId = '';

  it('W35 — منبع هم‌نام سرپرست پروژه خودکار نگاشت می‌شود؛ گزینه‌ها فقط سرپرستان همین پروژه', async () => {
    const session = data<Session>((await upload('draft').expect(201)).body);
    sessionId = session.id;
    expect(session.stats).toMatchObject({ tasks: 186, leaves: 150, tasksWithProgress: 2 });
    expect(session.resources).toEqual([
      expect.objectContaining({ name: 'Ali Mohammadi', userId: org.users.sup.id, action: 'match' }),
      expect.objectContaining({ name: 'Unknown Crew', userId: null, action: 'skip' }),
    ]);
    const options = data<{ users: { id: string }[]; targets: unknown[] }>(
      (
        await api('planner')
          .get(`/v1/org/msp-templates?projectId=${pid('draft')}`)
          .expect(200)
      ).body,
    );
    expect(options.users.map((user) => user.id)).toEqual([org.users.sup.id]);
    const notSupervisor = await api('planner').put(`/v1/msp/imports/${sessionId}/mapping`, {
      resource: { rowId: 'res-1', userId: org.users.reviewer.id, action: 'match' },
    });
    expect(notSupervisor.status).toBe(422);
    await api('planner').put(`/v1/msp/imports/${sessionId}/mapping`, { weightGenerator: 'equal' }).expect(200);
  });

  it('W49 — پیش‌نمایش: درخت، بودجه، بی‌سرپرست‌ها و پیشرفت اولیه', async () => {
    const preview = data<{
      tree: unknown[];
      withoutSupervisor: number;
      totalBudget: string;
      cbsItemCount: number;
      openingProgress: { id: string; percent: number; method: string }[];
    }>((await api('planner').get(`/v1/msp/imports/${sessionId}/preview`).expect(200)).body);
    expect(preview.tree).toHaveLength(6);
    expect(preview).toMatchObject({ withoutSupervisor: 75, totalBudget: String(6 * 5 * 15_000_000), cbsItemCount: 150 });
    expect(preview.openingProgress.map((row) => [row.id, row.percent, row.method])).toEqual([
      ['1.1.1', 25, 'مقداری'],
      ['2.2.1', 40, 'درصدی'],
    ]);
  });

  it('AC-MS-01، AC-MS-02، AC-MS-05 — ساخت: درخت و تاریخ، ExternalIdMap، سرپرست، CBS، وزن ۱۰۰ و پیشرفت اولیهٔ تأییدشده', async () => {
    const built = data<{ itemCount: number; leafCount: number; openingItems: number; rollbackUntil: string }>(
      (
        await api('planner')
          .post(`/v1/msp/imports/${sessionId}/build`, {
            sessionId,
            openingProgress: [
              { id: '2.2.1', percent: 40, selected: true },
              { id: '1.1.1', percent: 25, selected: false },
            ],
          })
          .expect(200)
      ).body,
    );
    expect(built).toMatchObject({ itemCount: 186, leafCount: 150, openingItems: 1 });
    const project = pid('draft');
    const { rows: items } = await test.owner.query<{
      code: string;
      code_mode: string;
      planned_start: string;
      planned_finish: string;
      supervisor_user_id: string | null;
      parent_id: string | null;
      weight_in_parent: string;
      total_quantity: string | null;
    }>(
      'select code, code_mode, planned_start::text, planned_finish::text, supervisor_user_id, parent_id, weight_in_parent::text, total_quantity::text from wbs_item where project_id = $1 and removed_at is null',
      [project],
    );
    expect(items).toHaveLength(186);
    expect(items.find((item) => item.code === '1.1.1')).toMatchObject({
      code_mode: 'custom',
      planned_start: '2026-03-01',
      planned_finish: '2026-03-05',
      supervisor_user_id: org.users.sup.id,
      total_quantity: '100.0000',
    });
    expect(items.find((item) => item.code === '2.1.1')?.supervisor_user_id).toBeNull();
    // AC-MS-02: جمع وزن هر گروه ۱۰۰٫۰۰۰۰
    const sums = new Map<string | null, number>();
    for (const item of items) sums.set(item.parent_id, (sums.get(item.parent_id) ?? 0) + Math.round(Number(item.weight_in_parent) * 10_000));
    expect([...sums.values()].every((sum) => sum === 1_000_000)).toBe(true);

    const {
      rows: [ids],
    } = await test.owner.query<{ n: number }>("select count(*)::int as n from external_id_map where project_id = $1 and system = 'msp'", [project]);
    expect(ids?.n).toBe(186);
    const {
      rows: [state],
    } = await test.owner.query<{ msp_linked: boolean; source: string; links: number; cbs: number }>(
      `select p.msp_linked, v.source, (select count(*)::int from wbs_cbs_link where project_id = p.id) as links, (select count(*)::int from cbs_item where project_id = p.id) as cbs
         from project p join plan_version v on v.project_id = p.id and v.kind = 'baseline' where p.id = $1`,
      [project],
    );
    expect(state).toEqual({ msp_linked: true, source: 'msp_import', links: 150, cbs: 156 });
    const {
      rows: [link],
    } = await test.owner.query<{ status: string; last_file_name: string }>('select status, last_file_name from msp_link where project_id = $1', [project]);
    expect(link).toEqual({ status: 'connected', last_file_name: 'plan.xml' });

    // AC-MS-05: آیتم import_opening تأییدشده با بررسی auto_approve و پیشرفت برگ عوض می‌شود
    const { rows: opening } = await test.owner.query<{
      source: string;
      work_date: string;
      status: string;
      reported_percent: string;
      decision: string;
      note: string;
    }>(
      `select r.source, r.work_date::text, i.status, i.reported_percent::text, v.decision, v.note
         from field_report r join field_report_item i on i.report_id = r.id join field_review v on v.item_id = i.id where r.project_id = $1`,
      [project],
    );
    expect(opening).toEqual([
      {
        source: 'import_opening',
        work_date: '2026-10-01',
        status: 'approved',
        reported_percent: '40.0000',
        decision: 'auto_approve',
        note: 'پیشرفت اولیه از فایل',
      },
    ]);
    // پروژهٔ پیش‌نویس نسخهٔ مرجع ندارد و پیشرفت از فعال‌سازی محاسبه می‌شود (F10)؛ فعال‌سازی ساده‌شده و یک تغییر تنظیم برای بازمحاسبه
    await test.owner.query(
      `update project set status = 'active', activated_at = now(), pv_reference_version_id = (select id from plan_version where project_id = $1 and kind = 'baseline') where id = $1`,
      [project],
    );
    await test
      .http(nextIp())
      .patch(`/v1/projects/${project}/settings`)
      .set({ Authorization: `Bearer ${tokens.pm}` })
      .send({ progress: { criticalThreshold: 14 } })
      .expect(200);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ actual_percent: string }>(
        "select p.actual_percent::text from wbs_item_progress p join wbs_item w on w.id = p.wbs_item_id where w.project_id = $1 and w.code = '2.2.1'",
        [project],
      );
      return rows[0]?.actual_percent === '40.0000';
    });
    await test.owner.query(`update project set status = 'draft', activated_at = null, pv_reference_version_id = null where id = $1`, [project]);
    const session = data<Session>((await api('planner').get(`/v1/msp/imports/${sessionId}`).expect(200)).body);
    expect(session.builtAt).not.toBeNull();
    expect(session.canContinue).toBe(false);
  });

  it('AC-MS-04 — بازگردانی در ۳۰ دقیقه: ساختار، CBS، پیشرفت اولیه، ExternalIdMap و اتصال پاک می‌شوند', async () => {
    await api('planner').post(`/v1/msp/imports/${sessionId}/rollback`).expect(200);
    const project = pid('draft');
    const {
      rows: [counts],
    } = await test.owner.query<Record<string, number>>(
      `select (select count(*)::int from wbs_item where project_id = $1 and removed_at is null) as wbs,
              (select count(*)::int from cbs_item where project_id = $1 and removed_at is null) as cbs,
              (select count(*)::int from field_report where project_id = $1) as reports,
              (select count(*)::int from external_id_map where project_id = $1) as ids,
              (select count(*)::int from msp_link where project_id = $1) as links,
              (select msp_linked::int from project where id = $1) as linked`,
      [project],
    );
    expect(counts).toEqual({ wbs: 0, cbs: 0, reports: 0, ids: 0, links: 0, linked: 0 });
    const again = await api('planner').post(`/v1/msp/imports/${sessionId}/rollback`);
    expect(again.status).toBe(409);
    const rebuild = await api('planner').post(`/v1/msp/imports/${sessionId}/build`, { openingProgress: [] });
    expect(rebuild.status).toBe(409);
  });

  it('AC-MS-04 — پس از ثبت گزارش یا گذشت ۳۰ دقیقه بازگردانی ممکن نیست', async () => {
    const first = data<Session>((await upload('draft').expect(201)).body);
    await api('planner').post(`/v1/msp/imports/${first.id}/build`, { openingProgress: [] }).expect(200);
    // یک گزارش کارگاه (ثبت مستقیم؛ مسیر ثبت دستی فقط پروژهٔ فعال است)
    await test.owner.query(
      `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, flags, created_at)
       values (gen_random_uuid(), $1, $2, 'app', $3, '2026-10-02', 'FR-1405-9999', now(), now(), '[]', now())`,
      [org.orgId, pid('draft'), org.users.sup.id],
    );
    const withReport = await api('planner').post(`/v1/msp/imports/${first.id}/rollback`);
    expect(withReport.status).toBe(409);
    expect((withReport.body as { message: string }).message).toContain('گزارش کارگاه');

    const second = data<Session>((await upload('second', sampleMspdi(sampleTasks({ phases: 1, groups: 1, leaves: 2 }))).expect(201)).body);
    await api('planner').post(`/v1/msp/imports/${second.id}/build`, { openingProgress: [] }).expect(200);
    test.clock.advance(31 * 60_000);
    const late = await api('planner').post(`/v1/msp/imports/${second.id}/rollback`);
    expect(late.status).toBe(409);
    expect((late.body as { message: string }).message).toContain('۳۰ دقیقه');
  });
});
