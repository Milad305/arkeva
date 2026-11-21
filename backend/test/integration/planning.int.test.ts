import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۳ — نسخه‌های برنامه و WBS (F04 + F03؛ AC-PV-01..06، ۱۰؛ AC-WBS-01، ۰۲، ۰۴، ۰۶، ۰۹، ۱۱).

type UserKey = 'admin' | 'pm' | 'planner' | 'reviewer';
type ProjectKey = 'draft' | 'active' | 'msp' | 'closed' | 'race';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.80.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user]}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    patch: (path: string, body: object = {}) => auth(agent.patch(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
    upload: (path: string, csv: string, fields: Record<string, string>, name = 'wbs.csv') => {
      let call = auth(agent.post(path)).attach('file', Buffer.from(csv, 'utf8'), name);
      for (const [key, value] of Object.entries(fields)) call = call.field(key, value);
      return call;
    },
  };
}

interface DraftItem {
  id: string;
  parentId: string | null;
  code: string;
  title: string;
  weightInParent: number;
  isLeaf: boolean;
  isMilestone: boolean;
  plannedStart: string;
  locks: Record<string, string>;
  change: string | null;
}
interface DraftTree {
  draft: { versionId: string; kind: string; number: number; draftRevision: number; changeCount: number } | null;
  draftRevision: number;
  syncsToCurrent: boolean;
  items: DraftItem[];
  validation: { canApply: boolean; errors: { code: string; rule: string; parentId?: string | null; currentSum?: number }[]; warnings: { code: string }[] };
  rootWeightSum: number;
}

const leafFields = (title: string, weight: number, extra: object = {}) => ({
  title,
  weightInParent: weight,
  plannedStart: '2026-12-01',
  plannedFinish: '2027-02-01',
  measurementMethod: 'percent',
  ...extra,
});

async function draftOf(project: ProjectKey, user: UserKey = 'planner'): Promise<DraftTree> {
  return data<DraftTree>((await as(user).get(`/v1/projects/${org.projects[project]}/plan-draft/wbs`).expect(200)).body);
}

function save(project: ProjectKey, draftRevision: number, ops: object[], user: UserKey = 'planner') {
  return as(user).post(`/v1/projects/${org.projects[project]}/plan-draft/wbs/ops`, { draftRevision, ops });
}

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان برنامه',
    users: {
      admin: { mobile: '09161000001', orgAdmin: true },
      pm: { mobile: '09161000002' },
      planner: { mobile: '09161000003' },
      reviewer: { mobile: '09161000004' },
    },
    projects: {
      draft: { code: 'PRJ-1405-501', status: 'draft', manager: 'pm', members: team },
      active: { code: 'PRJ-1405-502', name: 'برج فعال', manager: 'pm', members: team },
      msp: { code: 'PRJ-1405-503', manager: 'pm', members: team },
      closed: { code: 'PRJ-1405-504', status: 'archived', manager: 'pm', members: team },
      race: { code: 'PRJ-1405-505', manager: 'pm', members: team },
    },
  });
  await test.owner.query(`update project set key_milestones = $1, planned_start = '2026-12-01', planned_finish = '2027-06-30' where id = $2`, [
    JSON.stringify([{ title: 'اتمام اسکلت', date: '2027-03-01' }, { title: 'تحویل', date: '2027-06-30' }]),
    org.projects.draft,
  ]);
  await test.owner.query('update project set msp_linked = true where id = $1', [org.projects.msp]);
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F04 ۳ — پروژهٔ پیش‌نویس: مبنای کاری', () => {
  it('project-setup.md ۵.۲ — مبنای کاری با گروه «نقاط عطف کلیدی» وزن ۰ ساخته می‌شود', async () => {
    const tree = await draftOf('draft');
    expect(tree.draft).toMatchObject({ kind: 'baseline', number: 0, draftRevision: 0 });
    expect(tree.syncsToCurrent).toBe(true);
    const group = tree.items.find((item) => !item.isLeaf);
    expect(group).toMatchObject({ title: 'نقاط عطف کلیدی', weightInParent: 0, code: '1.1' });
    expect(tree.items.filter((item) => item.isMilestone).map((item) => item.title)).toEqual(['اتمام اسکلت', 'تحویل']);
  });

  it('AC-PV-03 — ذخیره در پروژهٔ پیش‌نویس بلافاصله در درخت جاری دیده می‌شود؛ نسخهٔ کهنه ۴۰۹', async () => {
    const before = await draftOf('draft');
    const saved = await save('draft', before.draftRevision, [
      { type: 'add', tempId: 't-frame', parentId: null, afterId: null, fields: { title: 'اسکلت', weightInParent: 100 } },
      { type: 'add', tempId: 't-col', parentId: 't-frame', afterId: null, fields: leafFields('ستون‌ها', 35) },
      { type: 'add', tempId: 't-beam', parentId: 't-frame', afterId: 't-col', fields: leafFields('تیرها', 30) },
      { type: 'add', tempId: 't-slab', parentId: 't-frame', afterId: 't-beam', fields: leafFields('سقف', 30, { measurementMethod: 'quantity', unit: 'm3', totalQuantity: 320 }) },
    ]).expect(200);
    const result = data<DraftTree & { idMap: Record<string, string> }>(saved.body);
    expect(Object.keys(result.idMap).sort()).toEqual(['t-beam', 't-col', 't-frame', 't-slab']);
    expect(result.draftRevision).toBe(before.draftRevision + 1);
    // AC-WBS-01: گروه «اسکلت» ۹۵٪
    expect(result.validation.errors).toContainEqual(expect.objectContaining({ code: 'weight_sum', parentId: result.idMap['t-frame'], currentSum: 95 }));

    const current = data<{ items: { id: string; title: string }[] }>((await as('reviewer').get(`/v1/projects/${org.projects.draft}/wbs`).expect(200)).body);
    expect(current.items.map((item) => item.title)).toEqual(expect.arrayContaining(['اسکلت', 'ستون‌ها', 'تیرها', 'سقف']));

    const stale = await save('draft', before.draftRevision, [{ type: 'remove', id: result.idMap['t-col'] }]).expect(409);
    expect(code(stale.body)).toBe('PLAN_DRAFT_STALE');
  });

  it('AC-WBS-02 و AC-WBS-04 — پیش‌نمایش پخش خودکار و تقسیم بی‌نوشتن', async () => {
    const tree = await draftOf('draft');
    const frame = tree.items.find((item) => item.title === 'اسکلت') as DraftItem;
    const slab = tree.items.find((item) => item.title === 'سقف') as DraftItem;
    const preview = await as('planner')
      .post(`/v1/projects/${org.projects.draft}/plan-draft/wbs/ops/preview`, {
        draftRevision: tree.draftRevision,
        ops: [
          { type: 'autoDistribute', parentId: frame.id },
          { type: 'split', id: slab.id, keepTitle: '', keepQuantity: 200, parts: [{ tempId: 'p-b', title: 'بلوک B', totalQuantity: 120 }] },
        ],
      })
      .expect(200);
    const result = data<DraftTree & { opErrors: unknown[] }>(preview.body);
    expect(result.opErrors).toEqual([]);
    const weight = (title: string) => result.items.find((item) => item.title === title)?.weightInParent;
    expect([weight('ستون‌ها'), weight('تیرها')]).toEqual([36.8421, 31.5789]);
    expect(weight('سقف — بخش ۱')).toBe(62.5);
    expect(weight('بلوک B')).toBe(37.5);
    expect(result.items.find((item) => item.title === 'سقف — بخش ۱')?.id).toBe(slab.id);
    // بی‌نوشتن
    expect((await draftOf('draft')).draftRevision).toBe(tree.draftRevision);
  });

  it('F04 ۵.۴ — مبنای کاری کنار گذاشته نمی‌شود و «اعمال» مال فعال‌سازی است', async () => {
    expect(code((await as('pm').delete(`/v1/projects/${org.projects.draft}/plan-draft`).expect(409)).body)).toBe('PLAN_BASELINE_NOT_DISCARDABLE');
    const tree = await draftOf('draft');
    const apply = await as('pm').post(`/v1/projects/${org.projects.draft}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'آزمون' }).expect(409);
    expect(code(apply.body)).toBe('PLAN_APPLY_NOT_ALLOWED');
  });
});

describe('F04 ۵ — پروژهٔ فعال: بازنگری کاری و اعمال', () => {
  let ids: Record<string, string>;

  it('AC-PV-02 — ذخیره در پروژهٔ فعال جدول جاری را عوض نمی‌کند', async () => {
    const tree = await draftOf('active');
    expect(tree.draft).toBeNull();
    const saved = await save('active', 0, [
      { type: 'add', tempId: 'a', parentId: null, afterId: null, fields: leafFields('پی‌کنی', 40) },
      { type: 'add', tempId: 'b', parentId: null, afterId: 'a', fields: leafFields('فونداسیون', 60) },
    ]).expect(200);
    const result = data<DraftTree & { idMap: Record<string, string> }>(saved.body);
    ids = result.idMap;
    expect(result.draft).toMatchObject({ kind: 'revision', number: 1, draftRevision: 1, changeCount: 2 });
    expect(result.validation.canApply).toBe(true);
    const current = data<{ items: unknown[] }>((await as('pm').get(`/v1/projects/${org.projects.active}/wbs`).expect(200)).body);
    expect(current.items).toEqual([]);
  });

  it('AC-PV-10 — بی یادداشت رد؛ AC-PV-06 — اعمال: جاری، شمارهٔ ۱، یک رویداد، ممیزی و NT-PLN-01', async () => {
    const tree = await draftOf('active');
    expect(code((await as('planner').post(`/v1/projects/${org.projects.active}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: ' ' }).expect(422)).body)).toBe('PLAN_NOTE_REQUIRED');
    const applied = data<{ versionId: string; number: number }>(
      (await as('planner').post(`/v1/projects/${org.projects.active}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'ساختار اولیه' }).expect(200)).body,
    );
    expect(applied.number).toBe(1);
    const current = data<{ versionId: string; items: { title: string }[] }>((await as('pm').get(`/v1/projects/${org.projects.active}/wbs`).expect(200)).body);
    expect(current.versionId).toBe(applied.versionId);
    expect(current.items.map((item) => item.title)).toEqual(['پی‌کنی', 'فونداسیون']);
    const { rows: events } = await test.owner.query<{ payload: { number: number; added: number } }>(
      "select payload from domain_event where project_id = $1 and type = 'PlanVersionApplied'",
      [org.projects.active],
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({ number: 1, added: 2 });
    const { rows: project } = await test.owner.query<{ current_version_id: string; planned_start: string }>('select current_version_id, planned_start::text from project where id = $1', [
      org.projects.active,
    ]);
    expect(project[0]).toMatchObject({ current_version_id: applied.versionId, planned_start: '2026-12-01' });
    await waitFor(async () => {
      const { rows } = await test.owner.query("select 1 from notification where user_id = $1 and code = 'NT-PLN-01'", [org.users.pm.id]);
      return rows.length === 1;
    });
    const { rows: self } = await test.owner.query("select 1 from notification where user_id = $1 and code = 'NT-PLN-01'", [org.users.planner.id]);
    expect(self).toHaveLength(0);
  });

  it('AC-PV-01 — عکس نسخهٔ اعمال‌شده تغییرناپذیر است', async () => {
    await expect(test.owner.query("update wbs_item_plan set title = 'دست‌کاری' where project_id = $1", [org.projects.active])).rejects.toThrow(/تغییر نمی‌کند/);
    await expect(test.owner.query("update plan_version set note = 'دست‌کاری' where project_id = $1 and status = 'applied'", [org.projects.active])).rejects.toThrow(/تغییر نمی‌کند/);
  });

  it('AC-WBS-06 — حذف در پروژهٔ فعال پس از اعمال حذف نرم است؛ خطای V-01 اعمال را مسدود می‌کند', async () => {
    await save('active', 0, [{ type: 'remove', id: ids['a'] }]).expect(200);
    let tree = await draftOf('active');
    expect(tree.validation.canApply).toBe(false);
    const blocked = await as('pm').post(`/v1/projects/${org.projects.active}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'حذف پی‌کنی' }).expect(422);
    expect(code(blocked.body)).toBe('PLAN_DRAFT_INVALID');
    await save('active', tree.draftRevision, [{ type: 'update', id: ids['b'], fields: { weightInParent: 100 } }]).expect(200);
    tree = await draftOf('active');
    const impact = data<{ removed: number; changed: number }>((await as('pm').get(`/v1/projects/${org.projects.active}/plan-draft/impact`).expect(200)).body);
    expect(impact).toMatchObject({ removed: 1, changed: 1 });
    const applied = data<{ number: number; versionId: string }>(
      (await as('pm').post(`/v1/projects/${org.projects.active}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'حذف پی‌کنی' }).expect(200)).body,
    );
    expect(applied.number).toBe(2);
    const { rows } = await test.owner.query<{ removed_at: Date | null; removed_in_version_id: string | null }>('select removed_at, removed_in_version_id from wbs_item where id = $1', [ids['a']]);
    expect(rows[0]?.removed_at).not.toBeNull();
    expect(rows[0]?.removed_in_version_id).toBe(applied.versionId);
  });

  it('F04 ۵.۴ — کنار گذاشتن بازنگری کاری جدول جاری را دست نمی‌زند', async () => {
    await save('active', 0, [{ type: 'update', id: ids['b'], fields: { title: 'فونداسیون نواری' } }]).expect(200);
    await as('pm').delete(`/v1/projects/${org.projects.active}/plan-draft`).expect(200);
    expect((await draftOf('active')).draft).toBeNull();
    const current = data<{ items: { title: string }[] }>((await as('pm').get(`/v1/projects/${org.projects.active}/wbs`).expect(200)).body);
    expect(current.items.map((item) => item.title)).toEqual(['فونداسیون']);
    expect(code((await as('pm').get(`/v1/projects/${org.projects.active}/plan-draft/validation`).expect(404)).body)).toBe('PLAN_DRAFT_NOT_FOUND');
  });

  it('AC-PV-05 — دو اعمال هم‌زمان: یکی موفق، شماره‌ها پیوسته و بی تکرار', async () => {
    await save('race', 0, [{ type: 'add', tempId: 'x', parentId: null, afterId: null, fields: leafFields('کار', 100) }]).expect(200);
    const tree = await draftOf('race');
    const results = await Promise.all(
      [0, 1].map(() => as('pm').post(`/v1/projects/${org.projects.race}/plan-draft/apply`, { draftRevision: tree.draftRevision, note: 'هم‌زمان' })),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 404]);
    const { rows } = await test.owner.query<{ number: number }>("select number from plan_version where project_id = $1 and status = 'applied'", [org.projects.race]);
    expect(rows).toEqual([{ number: 1 }]);
  });
});

describe('F03 — قفل‌ها، دسترسی، ورود فایل و یادداشت وضعیت', () => {
  it('AC-WBS-11 — پروژهٔ متصل به MSP: افزودن رد، تغییر عنوان پذیرفته', async () => {
    const preview = data<DraftTree & { opErrors: { index: number; code: string }[] }>(
      (
        await as('planner')
          .post(`/v1/projects/${org.projects.msp}/plan-draft/wbs/ops/preview`, { draftRevision: 0, ops: [{ type: 'add', tempId: 't', parentId: null, afterId: null, fields: { title: 'تازه' } }] })
          .expect(200)
      ).body,
    );
    expect(preview.opErrors).toEqual([expect.objectContaining({ index: 0, code: 'MSP_OWNED' })]);
    const rejected = await save('msp', 0, [{ type: 'add', tempId: 't', parentId: null, afterId: null, fields: { title: 'تازه' } }]).expect(422);
    expect(code(rejected.body)).toBe('WBS_OP_REJECTED');
  });

  it('wbs.md ۱۱ — ناظر نسخهٔ کاری را ویرایش نمی‌کند؛ پروژهٔ بایگانی فقط‌خواندنی است', async () => {
    await save('draft', 1, [], 'reviewer').expect(403);
    expect(code((await as('admin').get(`/v1/projects/${org.projects.closed}/plan-draft/wbs`).expect(409)).body)).toBe('PROJECT_READ_ONLY');
  });

  it('AC-WBS-09 — ورود CSV: پیش‌نمایش با پیام‌ها، Excel مستقیم رد، تأیید به نسخهٔ کاری', async () => {
    const csv = ['کد,عنوان,وزن در والد,شروع برنامه‌ای,پایان برنامه‌ای', '1.1,نازک‌کاری,,1405/10/01,1405/12/01', '1.2,تأسیسات,,1405/10/01,1405/12/20', '1.2,تکراری,10,,'].join('\n');
    const tree = await draftOf('draft');
    const path = `/v1/projects/${org.projects.draft}/plan-draft/wbs/import`;
    const fields = { mode: 'append', draftRevision: String(tree.draftRevision) };
    const preview = data<{ importCount: number; issues: { message: string }[] }>((await as('planner').upload(`${path}/preview`, csv, fields).expect(200)).body);
    expect(preview.importCount).toBe(2);
    expect(preview.issues.map((issue) => issue.message)).toContain('کد تکراری 1.2؛ ردیف دوم نادیده گرفته می‌شود');
    expect(code((await as('planner').upload(`${path}/preview`, csv, fields, 'wbs.xlsx').expect(422)).body)).toBe('WBS_IMPORT_INVALID');
    const confirmed = data<{ importCount: number; firstId: string }>((await as('planner').upload(`${path}/confirm`, csv, fields).expect(200)).body);
    expect(confirmed.importCount).toBe(2);
    const after = await draftOf('draft');
    expect(after.items.find((item) => item.id === confirmed.firstId)).toMatchObject({ title: 'نازک‌کاری', plannedStart: '2026-12-22' });
  });

  it('wbs.md ۴.۱ — یادداشت وضعیت عملیاتی است و جزئیات آیتم مسیر را دارد', async () => {
    const current = data<{ items: { id: string; title: string; parentId: string | null }[] }>((await as('pm').get(`/v1/projects/${org.projects.draft}/wbs`).expect(200)).body);
    const column = current.items.find((item) => item.title === 'ستون‌ها') as { id: string };
    await as('reviewer').patch(`/v1/projects/${org.projects.draft}/wbs/${column.id}/status-note`, { statusNote: 'ورق فولادی دیر رسید' }).expect(200);
    const detail = data<{ item: { statusNote: string }; path: { title: string }[]; childCount: number }>(
      (await as('reviewer').get(`/v1/projects/${org.projects.draft}/wbs/${column.id}`).expect(200)).body,
    );
    expect(detail.item.statusNote).toBe('ورق فولادی دیر رسید');
    expect(detail.path.map((entry) => entry.title)).toEqual(['اسکلت']);
    expect(code((await as('reviewer').get(`/v1/projects/${org.projects.draft}/wbs/${org.projects.active}`).expect(404)).body)).toBe('WBS_ITEM_NOT_FOUND');
  });

  it('F02 ۱۲ — سربرگ پروژه وضعیت نسخه‌ها را دارد', async () => {
    const detail = data<{ plan: { current: { number: number } | null; draft: unknown } }>((await as('pm').get(`/v1/projects/${org.projects.active}`).expect(200)).body);
    expect(detail.plan.current).toMatchObject({ number: 2, kind: 'revision' });
    expect(detail.plan.draft).toBeNull();
  });
});
