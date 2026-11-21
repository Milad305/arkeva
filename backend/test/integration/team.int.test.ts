import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۵ — تیم، تخصیص و حوزه‌های تأیید (F07؛ AC-TM-01، ۰۵، ۰۸؛ AC-TM-02..04 در routing.test.ts).
// AC-TM-06 و AC-TM-07 (آیتم‌های در گردش) با گزارش کارگاه و گردش کار تأیید (برش‌های ۹ و ۱۰).

type UserKey = 'admin' | 'pm' | 'planner' | 'reviewer' | 'sup1' | 'sup2' | 'outsider';
type ProjectKey = 'main' | 'live' | 'closed';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.82.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = (project: ProjectKey) => org.projects[project];

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
    patch: (path: string, body: object = {}) => auth(agent.patch(path)).send(body),
    delete: (path: string, body: object = {}) => auth(agent.delete(path)).send(body),
  };
}

const leaf = (title: string, weight: number, measurementMethod = 'percent') => ({
  title,
  weightInParent: weight,
  plannedStart: '2026-12-01',
  plannedFinish: '2027-02-01',
  measurementMethod,
});

interface AssignmentsView {
  supervisors: { userId: string; workload: number; note: string }[];
  items: { id: string; title: string; isLeaf: boolean; assignable: boolean; notAssignableReason: string | null; supervisorUserId: string | null }[];
  unassignedCount: number;
  averageWorkload: number;
}
interface MembersView {
  members: {
    userId: string;
    mobile: string | null;
    roles: string[];
    isManager: boolean;
    responsibility: string | null;
    assignedCount: number;
    app: { kind: string };
  }[];
  invitations: { id: string; target: string; status: string }[];
  summary: { total: number; supervisors: number; unassignedSupervisors: number; reviewers: number; managerName: string | null };
  seats: { used: number; limit: number };
}
interface AreasView {
  areas: { id: string; areaName: string; rootIds: string[]; rootCodes: string[]; reviewerUserId: string | null; reviewerName: string | null }[];
  fallbackApproverId: string;
  unroutedLeafCount: number;
  wbsRoots: { id: string; depth: number }[];
  reviewers: { userId: string; isManager: boolean }[];
}

const ids: Record<string, string> = {};

async function buildWbs(project: ProjectKey, user: UserKey, ops: object[]): Promise<Record<string, string>> {
  const tree = data<{ draftRevision: number }>(
    (
      await as(user)
        .get(`/v1/projects/${pid(project)}/plan-draft/wbs`)
        .expect(200)
    ).body,
  );
  const saved = await as(user)
    .post(`/v1/projects/${pid(project)}/plan-draft/wbs/ops`, { draftRevision: tree.draftRevision, ops })
    .expect(200);
  return data<{ idMap: Record<string, string> }>(saved.body).idMap;
}

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer', sup1: 'supervisor', sup2: 'supervisor' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان تیم',
    users: {
      admin: { mobile: '09163000001', orgAdmin: true },
      pm: { mobile: '09163000002' },
      planner: { mobile: '09163000003' },
      reviewer: { mobile: '09163000004' },
      sup1: { mobile: '09163000005' },
      sup2: { mobile: '09163000006' },
      outsider: { mobile: '09163000007' },
    },
    projects: {
      main: { code: 'PRJ-1405-701', status: 'draft', manager: 'pm', members: team },
      live: { code: 'PRJ-1405-702', manager: 'pm', members: team },
      closed: { code: 'PRJ-1405-703', status: 'archived', manager: 'pm', members: team },
    },
  });
  await test.owner.query(`update project set planned_start = '2026-12-01', planned_finish = '2027-06-30' where id = any($1)`, [Object.values(org.projects)]);
  // تأییدکنندهٔ جایگزین پیش‌فرض = مدیر پروژه (F02 ۶)
  for (const project of Object.values(org.projects)) {
    await test.owner.query(
      `insert into project_settings (project_id, org_id, alternate_reviewer_user_id, created_at, updated_at) values ($1, $2, $3, now(), now()) on conflict (project_id) do update set alternate_reviewer_user_id = excluded.alternate_reviewer_user_id`,
      [project, org.orgId, org.users.pm.id],
    );
  }
  for (const key of ['admin', 'pm', 'planner', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  Object.assign(
    ids,
    await buildWbs('main', 'planner', [
      { type: 'add', tempId: 'g1', parentId: null, afterId: null, fields: { title: 'اسکلت', weightInParent: 100 } },
      { type: 'add', tempId: 'a', parentId: 'g1', afterId: null, fields: leaf('ستون‌ها', 40) },
      { type: 'add', tempId: 'b', parentId: 'g1', afterId: 'a', fields: leaf('تیرها', 30) },
      { type: 'add', tempId: 't', parentId: 'g1', afterId: 'b', fields: leaf('نظارت دوره‌ای', 30, 'time_based') },
    ]),
  );
});

afterAll(async () => {
  await test?.close();
});

const assign = (project: ProjectKey, wbsItemIds: string[], supervisorUserId: string | null, user: UserKey = 'planner') =>
  as(user).post(`/v1/projects/${pid(project)}/assignments`, { wbsItemIds, supervisorUserId });

describe('F07 ۵ — تخصیص (W17)', () => {
  it('AC-TM-01 — برگ زمانی، والد یا عضو بی نقش سرپرست با خطای مشخص رد می‌شود', async () => {
    const timeBased = await assign('main', [ids['t'] as string], org.users.sup1.id).expect(422);
    expect(code(timeBased.body)).toBe('ASSIGNMENT_INVALID');
    expect((timeBased.body as { message: string }).message).toContain('برگ زمانی');
    const parent = await assign('main', [ids['g1'] as string], org.users.sup1.id).expect(422);
    expect((parent.body as { message: string }).message).toContain('والد');
    const noRole = await assign('main', [ids['a'] as string], org.users.planner.id).expect(422);
    expect((noRole.body as { message: string }).message).toContain('نقش سرپرست کارگاه ندارد');
    await assign('closed', [ids['a'] as string], org.users.sup1.id).expect(409);
    await as('reviewer')
      .get(`/v1/projects/${pid('main')}/assignments`)
      .expect(403);
  });

  it('AC-TM-02 — درخت تخصیص: والد و برگ زمانی تخصیص‌ناپذیر با دلیل؛ بار کاری صفر', async () => {
    const view = data<AssignmentsView>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('main')}/assignments`)
          .expect(200)
      ).body,
    );
    const byId = new Map(view.items.map((item) => [item.id, item]));
    expect(byId.get(ids['g1'] as string)).toMatchObject({ assignable: false, isLeaf: false });
    expect(byId.get(ids['t'] as string)?.assignable).toBe(false);
    expect(byId.get(ids['a'] as string)).toMatchObject({ assignable: true, supervisorUserId: null });
    expect(view.supervisors.map((entry) => entry.workload)).toEqual([0, 0]);
  });

  it('AC-TM-08 — هر تخصیص: یک ردیف تاریخچه، یک AssignmentChanged و NT-ASG-01 برای سرپرست قبلی و تازه', async () => {
    const first = data<{ changed: number; notified: string[] }>(
      (await assign('main', [ids['a'] as string, ids['b'] as string], org.users.sup1.id).expect(200)).body,
    );
    expect(first.changed).toBe(2);
    expect(first.notified).toHaveLength(1);

    const preview = data<{ workloadAfter: number; transfers: { fromName: string }[]; assignCount: number; rejected: unknown[] }>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('main')}/assignments/preview?supervisorUserId=${org.users.sup2.id}&wbsItemIds=${ids['a']},${ids['t']}`)
          .expect(200)
      ).body,
    );
    expect(preview).toMatchObject({ workloadAfter: 1, assignCount: 1 });
    expect(preview.transfers).toHaveLength(1);
    expect(preview.rejected).toHaveLength(1);

    const moved = data<{ changed: number; notified: string[] }>((await assign('main', [ids['a'] as string], org.users.sup2.id).expect(200)).body);
    expect(moved).toMatchObject({ changed: 1 });
    expect(moved.notified).toHaveLength(2);
    // دوباره همان: تغییری نیست
    expect(data<{ changed: number }>((await assign('main', [ids['a'] as string], org.users.sup2.id).expect(200)).body).changed).toBe(0);

    const { rows: history } = await test.owner.query<{ supervisor_user_id: string; closed: boolean }>(
      'select supervisor_user_id, to_at is not null as closed from wbs_assignment_history where wbs_item_id = $1 order by from_at, created_at',
      [ids['a']],
    );
    expect(history).toEqual([
      { supervisor_user_id: org.users.sup1.id, closed: true },
      { supervisor_user_id: org.users.sup2.id, closed: false },
    ]);
    const { rows: events } = await test.owner.query("select 1 from domain_event where project_id = $1 and type = 'AssignmentChanged'", [pid('main')]);
    expect(events).toHaveLength(3);
    const { rows: notes } = await test.owner.query<{ user_id: string; title: string }>(
      "select user_id, title from notification where code = 'NT-ASG-01' and channel = 'in_app' order by created_at, id",
    );
    expect(notes.filter((row) => row.user_id === org.users.sup1.id).map((row) => row.title)).toEqual([
      expect.stringContaining('به شما سپرده شد'),
      expect.stringContaining('از شما گرفته شد'),
    ]);
    expect(notes.filter((row) => row.user_id === org.users.sup2.id)).toHaveLength(1);

    const view = data<AssignmentsView>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('main')}/assignments`)
          .expect(200)
      ).body,
    );
    expect(view).toMatchObject({ unassignedCount: 0, averageWorkload: 1 });
  });
});

describe('F07 ۴ — اعضا (W16، W42)', () => {
  it('W16 — فهرست اعضا: موبایل فقط برای team.manage؛ خلاصه و مسئولیت از سرور', async () => {
    const pm = data<MembersView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/members`)
          .expect(200)
      ).body,
    );
    expect(pm.summary).toMatchObject({ total: 5, supervisors: 2, unassignedSupervisors: 0, reviewers: 1 });
    const sup1 = pm.members.find((member) => member.userId === org.users.sup1.id);
    expect(sup1).toMatchObject({ mobile: '09163000005', assignedCount: 1, responsibility: 'اسکلت', app: { kind: 'not_installed' } });
    expect(pm.members.find((member) => member.isManager)?.userId).toBe(org.users.pm.id);
    const reviewer = data<MembersView>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('main')}/members`)
          .expect(200)
      ).body,
    );
    expect(reviewer.members.every((member) => member.mobile === null)).toBe(true);
  });

  it('تصمیم 1405/08/23 — برداشتن نقش سرپرست از کسی که برگ دارد ۴۰۹', async () => {
    const blocked = await as('pm')
      .patch(`/v1/projects/${pid('main')}/members/${org.users.sup1.id}`, { roles: ['reviewer'] })
      .expect(409);
    expect(code(blocked.body)).toBe('MEMBER_ROLE_BLOCKED');
    await as('planner')
      .patch(`/v1/projects/${pid('main')}/members/${org.users.sup1.id}`, { roles: ['reviewer'] })
      .expect(403);
  });

  it('AC-TM-05 — حذف مدیر پروژه بی جانشین رد می‌شود', async () => {
    const impact = data<{ blockedReason: string | null }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/members/${org.users.pm.id}/removal-impact`)
          .expect(200)
      ).body,
    );
    expect(impact.blockedReason).toContain('انتقال مدیریت');
    const blocked = await as('pm')
      .delete(`/v1/projects/${pid('main')}/members/${org.users.pm.id}`, { transferTo: null })
      .expect(409);
    expect(code(blocked.body)).toBe('MEMBER_REMOVAL_BLOCKED');
  });

  it('W42 — افزودن کاربر موجود به‌عنوان ناظر با حوزهٔ مسئولیت؛ دعوت ایمیلی رد، دعوت با شماره ساخته', async () => {
    await as('pm')
      .post(`/v1/projects/${pid('main')}/members`, { userId: org.users.outsider.id, roles: ['reviewer'], area: { name: 'اسکلت', rootIds: [ids['g1']] } })
      .expect(201);
    const areas = data<AreasView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/approval-routes`)
          .expect(200)
      ).body,
    );
    expect(areas.areas).toEqual([expect.objectContaining({ areaName: 'اسکلت', rootIds: [ids['g1']], reviewerUserId: org.users.outsider.id })]);
    const again = await as('pm')
      .post(`/v1/projects/${pid('main')}/members`, { userId: org.users.outsider.id, roles: ['finance'] })
      .expect(409);
    expect(code(again.body)).toBe('MEMBER_ALREADY_ACTIVE');

    const email = await as('pm')
      .post(`/v1/projects/${pid('main')}/members`, { userId: null, invite: { channel: 'email', target: 'a@b.ir' }, roles: ['planner'] })
      .expect(422);
    expect(code(email.body)).toBe('MEMBER_INVALID');
    const invited = data<{ invitationId: string }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('main')}/members`, {
            userId: null,
            invite: { channel: 'sms', target: '09163000099', fullName: 'نیما تازه' },
            roles: ['supervisor'],
          })
          .expect(201)
      ).body,
    );
    expect(invited.invitationId).toBeTruthy();
    const pm = data<MembersView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/members`)
          .expect(200)
      ).body,
    );
    expect(pm.invitations).toEqual([expect.objectContaining({ id: invited.invitationId, target: '09163000099', status: 'pending' })]);
    const reviewer = data<MembersView>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('main')}/members`)
          .expect(200)
      ).body,
    );
    expect(reviewer.invitations[0]?.target).toBe('•••');
  });

  it('۴.۳ — حذف سرپرست با «انتقال به»: برگ‌ها منتقل، عضویت removed، تاریخچه و اعلان', async () => {
    const impact = data<{ assignedLeaves: number; transferCandidates: { userId: string; assignedCount: number }[] }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/members/${org.users.sup2.id}/removal-impact`)
          .expect(200)
      ).body,
    );
    expect(impact).toMatchObject({ assignedLeaves: 1, transferCandidates: [{ userId: org.users.sup1.id, assignedCount: 1 }] });
    const wrong = await as('pm')
      .delete(`/v1/projects/${pid('main')}/members/${org.users.sup2.id}`, { transferTo: org.users.planner.id })
      .expect(422);
    expect(code(wrong.body)).toBe('MEMBER_INVALID');
    await as('pm')
      .delete(`/v1/projects/${pid('main')}/members/${org.users.sup2.id}`, { transferTo: org.users.sup1.id })
      .expect(200);
    const view = data<AssignmentsView>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('main')}/assignments`)
          .expect(200)
      ).body,
    );
    expect(view.items.find((item) => item.id === ids['a'])?.supervisorUserId).toBe(org.users.sup1.id);
    expect(view.supervisors.map((entry) => entry.userId)).toEqual([org.users.sup1.id]);
    const { rows } = await test.owner.query<{ status: string }>('select status from project_member where project_id = $1 and user_id = $2', [
      pid('main'),
      org.users.sup2.id,
    ]);
    expect(rows[0]?.status).toBe('removed');
  });
});

describe('F07 ۶ — حوزه‌های تأیید (W29)', () => {
  it('۶.۱ — جایگزینی کامل: هر بخش یک حوزه، تأییدکننده ناظر یا مدیر، جایگزین عضو فعال؛ ApprovalRouteChanged', async () => {
    const path = `/v1/projects/${pid('main')}/approval-routes`;
    const twice = await as('pm')
      .put(path, {
        areas: [
          { id: null, areaName: 'الف', rootIds: [ids['g1']], reviewerUserId: org.users.reviewer.id },
          { id: null, areaName: 'ب', rootIds: [ids['g1']], reviewerUserId: org.users.reviewer.id },
        ],
        fallbackApproverId: org.users.pm.id,
      })
      .expect(422);
    expect(code(twice.body)).toBe('APPROVAL_ROUTES_INVALID');
    const notReviewer = await as('pm')
      .put(path, { areas: [{ id: null, areaName: 'الف', rootIds: [ids['g1']], reviewerUserId: org.users.sup1.id }], fallbackApproverId: org.users.pm.id })
      .expect(422);
    expect((notReviewer.body as { message: string }).message).toContain('ناظر یا مدیر پروژه');
    await as('planner').put(path, { areas: [], fallbackApproverId: org.users.pm.id }).expect(403);

    const saved = data<AreasView>(
      (
        await as('pm')
          .put(path, {
            areas: [{ id: null, areaName: 'سازه', rootIds: [ids['g1']], reviewerUserId: org.users.reviewer.id }],
            fallbackApproverId: org.users.planner.id,
          })
          .expect(200)
      ).body,
    );
    expect(saved.areas).toEqual([expect.objectContaining({ areaName: 'سازه', reviewerUserId: org.users.reviewer.id, rootCodes: [expect.any(String)] })]);
    expect(saved).toMatchObject({ fallbackApproverId: org.users.planner.id, unroutedLeafCount: 0 });
    expect(saved.reviewers.map((entry) => entry.userId).sort()).toEqual([org.users.pm.id, org.users.reviewer.id, org.users.outsider.id].sort());
    const { rows } = await test.owner.query<{ alternate_reviewer_user_id: string }>(
      'select alternate_reviewer_user_id from project_settings where project_id = $1',
      [pid('main')],
    );
    expect(rows[0]?.alternate_reviewer_user_id).toBe(org.users.planner.id);
    const { rows: events } = await test.owner.query("select 1 from domain_event where project_id = $1 and type = 'ApprovalRouteChanged'", [pid('main')]);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it('۴.۲–۴.۳ — برداشتن نقش ناظر حوزه را بی‌تأییدکننده و حذف جایگزین آن را به مدیر پروژه برمی‌گرداند', async () => {
    await as('pm')
      .patch(`/v1/projects/${pid('main')}/members/${org.users.reviewer.id}`, { roles: ['finance'] })
      .expect(200);
    let areas = data<AreasView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/approval-routes`)
          .expect(200)
      ).body,
    );
    expect(areas.areas[0]).toMatchObject({ reviewerUserId: null, reviewerName: null });
    await as('pm')
      .delete(`/v1/projects/${pid('main')}/members/${org.users.planner.id}`, { transferTo: null })
      .expect(200);
    areas = data<AreasView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('main')}/approval-routes`)
          .expect(200)
      ).body,
    );
    expect(areas.fallbackApproverId).toBe(org.users.pm.id);
  });
});

describe('F07 ۷ — پس از اعمال نسخه', () => {
  it('F04 ← — برگ حذف‌شده در بازنگری تخصیصش بسته می‌شود', async () => {
    const live = await buildWbs('live', 'pm', [
      { type: 'add', tempId: 'x', parentId: null, afterId: null, fields: leaf('پی', 50) },
      { type: 'add', tempId: 'y', parentId: null, afterId: 'x', fields: leaf('دیوار', 50) },
    ]);
    const revision = data<{ draftRevision: number }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/plan-draft/wbs`)
          .expect(200)
      ).body,
    ).draftRevision;
    await as('pm')
      .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: revision, note: 'ساختار اولیه' })
      .expect(200);
    await assign('live', [live['x'] as string], org.users.sup1.id, 'pm').expect(200);

    const tree = data<{ draftRevision: number }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('live')}/plan-draft/wbs/ops`, {
            draftRevision: 0,
            ops: [
              { type: 'remove', id: live['x'] },
              { type: 'update', id: live['y'], fields: { weightInParent: 100 } },
            ],
          })
          .expect(200)
      ).body,
    );
    await as('pm')
      .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'حذف پی' })
      .expect(200);
    await waitFor(async () => {
      const { rows } = await test.owner.query('select 1 from wbs_assignment_history where wbs_item_id = $1 and to_at is null', [live['x']]);
      return rows.length === 0;
    });
    const view = data<AssignmentsView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/assignments`)
          .expect(200)
      ).body,
    );
    expect(view.supervisors.find((entry) => entry.userId === org.users.sup1.id)?.workload).toBe(0);
  });
});
