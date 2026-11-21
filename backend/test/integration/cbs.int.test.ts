import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۴ — CBS و اتصال WBS ↔ CBS (F05؛ AC-CBS-01، ۰۴، ۰۵، ۰۶، ۰۸، ۰۹). مثال مرجع cbs.md ۹ به ریال.
// AC-CBS-07 (هزینهٔ posted) با دفتر هزینه (برش ۸)؛ AC-CBS-02، ۰۳، ۱۰ با محاسبات (برش ۶).

type UserKey = 'admin' | 'pm' | 'planner' | 'reviewer';
type ProjectKey = 'ref' | 'live' | 'imp';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.81.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const details = (body: unknown): Record<string, unknown> => (body as { details?: Record<string, unknown> }).details ?? {};
const M = (millions: number): string => String(BigInt(Math.round(millions * 1_000_000)));

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user]}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
    upload: (path: string, csv: string, fields: Record<string, string>, name = 'cbs.csv') => {
      let call = auth(agent.post(path)).attach('file', Buffer.from(csv, 'utf8'), name);
      for (const [key, value] of Object.entries(fields)) call = call.field(key, value);
      return call;
    },
  };
}

interface CbsItem {
  id: string;
  parentId: string | null;
  code: string;
  isLeaf: boolean;
  budget: string | null;
  unitRate: string | null;
  allocated: string | null;
  unallocated: string | null;
  linkCount: number;
}
interface Issue {
  code: string;
  rule: string;
  message: string;
  cbsItemId?: string | null;
}
interface Validation {
  canApply: boolean;
  errors: Issue[];
  warnings: Issue[];
}
interface CbsDraft {
  draftRevision: number;
  items: (CbsItem & { change: string | null; budgetChanged: boolean; locks: Record<string, string> })[];
  summary: { cbsBudget: string | null; currentCbsBudget: string | null; bac: string | null; unallocated: string | null };
  validation: Validation;
  idMap?: Record<string, string>;
}
interface LinksView {
  draftRevision: number;
  leaves: { id: string; code: string; title: string; isLeaf: boolean; bac: string | null; weightInProject: number; balanced: boolean; linkCount: number }[];
  links: { wbsItemId: string; cbsItemId: string; quantity: number | null; amount: string | null; subBudget: string | null }[];
  summary: { leafCount: number; linkedCount: number; imbalancedCount: number; projectBac: string | null };
  validation: Validation | null;
  opErrors?: { index: number; code: string }[];
}

const pid = (project: ProjectKey) => org.projects[project];
const leaf = (title: string, weight: number, extra: object = {}) => ({
  title,
  weightInParent: weight,
  plannedStart: '2026-12-01',
  plannedFinish: '2027-02-01',
  measurementMethod: 'percent',
  ...extra,
});

async function revisionOf(project: ProjectKey): Promise<number> {
  return data<{ draftRevision: number }>(
    (
      await as('pm')
        .get(`/v1/projects/${pid(project)}/plan-draft/wbs`)
        .expect(200)
    ).body,
  ).draftRevision;
}

const cbsOps = (project: ProjectKey, draftRevision: number, ops: object[], user: UserKey = 'pm') =>
  as(user).post(`/v1/projects/${pid(project)}/plan-draft/cbs/ops`, { draftRevision, ops });
const linkOps = (project: ProjectKey, draftRevision: number, ops: object[], user: UserKey = 'pm') =>
  as(user).post(`/v1/projects/${pid(project)}/plan-draft/links/ops`, { draftRevision, ops });

/** مثال مرجع cbs.md ۹.۱: چهار برگ WBS (وزن در پروژه ۱۰، ۳۰، ۳۰، ۳۰) و چهار قلم CBS. */
async function buildReference(project: ProjectKey): Promise<{ wbs: Record<string, string>; cbs: Record<string, string> }> {
  const wbsSaved = await as('pm')
    .post(`/v1/projects/${pid(project)}/plan-draft/wbs/ops`, {
      draftRevision: await revisionOf(project),
      ops: [
        { type: 'add', tempId: 'g1', parentId: null, afterId: null, fields: { title: 'گود و پی', weightInParent: 40 } },
        {
          type: 'add',
          tempId: 'l111',
          parentId: 'g1',
          afterId: null,
          fields: leaf('خاکبرداری', 25, { measurementMethod: 'quantity', unit: 'm3', totalQuantity: 500 }),
        },
        { type: 'add', tempId: 'l112', parentId: 'g1', afterId: 'l111', fields: leaf('فونداسیون', 75) },
        { type: 'add', tempId: 'g2', parentId: null, afterId: 'g1', fields: { title: 'اسکلت', weightInParent: 60 } },
        { type: 'add', tempId: 'l121', parentId: 'g2', afterId: null, fields: leaf('ستون‌ها', 50) },
        { type: 'add', tempId: 'l122', parentId: 'g2', afterId: 'l121', fields: leaf('سقف', 50) },
      ],
    })
    .expect(200);
  const wbs = data<{ idMap: Record<string, string>; draftRevision: number }>(wbsSaved.body);
  const cbsSaved = await cbsOps(project, wbs.draftRevision, [
    {
      type: 'add',
      tempId: 'C1',
      parentId: null,
      item: { title: 'خاکبرداری (پیمانکار جزء)', code: 'C1', costType: 'subcontract', pricing: 'unit_rate', unit: 'm3', qty: 500, rate: M(0.2) },
    },
    {
      type: 'add',
      tempId: 'C2',
      parentId: null,
      afterId: 'C1',
      item: { title: 'بتن آماده', code: 'C2', costType: 'materials', pricing: 'unit_rate', unit: 'm3', qty: 400, rate: M(1) },
    },
    {
      type: 'add',
      tempId: 'C3',
      parentId: null,
      afterId: 'C2',
      item: { title: 'آرماتور', code: 'C3', costType: 'materials', pricing: 'unit_rate', unit: 't', qty: 6, rate: M(50) },
    },
    {
      type: 'add',
      tempId: 'C4',
      parentId: null,
      afterId: 'C3',
      item: { title: 'نیروی انسانی اسکلت', code: 'C4', costType: 'labor', pricing: 'lump_sum', lump: M(200) },
    },
  ]).expect(200);
  const cbsResult = data<CbsDraft>(cbsSaved.body);
  const cbs = cbsResult.idMap as Record<string, string>;
  const w = wbs.idMap;
  await linkOps(project, cbsResult.draftRevision, [
    { type: 'link', wbsItemId: w['l111'], cbsItemId: cbs['C1'], quantity: 500 },
    { type: 'link', wbsItemId: w['l112'], cbsItemId: cbs['C2'], quantity: 200 },
    { type: 'link', wbsItemId: w['l112'], cbsItemId: cbs['C3'], quantity: 2 },
    { type: 'link', wbsItemId: w['l121'], cbsItemId: cbs['C2'], quantity: 50 },
    { type: 'link', wbsItemId: w['l121'], cbsItemId: cbs['C3'], quantity: 2 },
    { type: 'link', wbsItemId: w['l121'], cbsItemId: cbs['C4'], amount: M(150) },
    { type: 'link', wbsItemId: w['l122'], cbsItemId: cbs['C2'], quantity: 150 },
    { type: 'link', wbsItemId: w['l122'], cbsItemId: cbs['C3'], quantity: 2 },
    { type: 'link', wbsItemId: w['l122'], cbsItemId: cbs['C4'], amount: M(50) },
  ]).expect(200);
  return { wbs: w, cbs };
}

let ref: { wbs: Record<string, string>; cbs: Record<string, string> };
let live: { wbs: Record<string, string>; cbs: Record<string, string> };

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان بودجه',
    users: {
      admin: { mobile: '09162000001', orgAdmin: true },
      pm: { mobile: '09162000002' },
      planner: { mobile: '09162000003' },
      reviewer: { mobile: '09162000004' },
    },
    projects: {
      ref: { code: 'PRJ-1405-601', status: 'draft', manager: 'pm', members: team },
      live: { code: 'PRJ-1405-602', name: 'برج بودجه', manager: 'pm', members: team },
      imp: { code: 'PRJ-1405-603', status: 'draft', manager: 'pm', members: team },
    },
  });
  await test.owner.query(`update project set planned_start = '2026-12-01', planned_finish = '2027-06-30' where id = any($1)`, [Object.values(org.projects)]);
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F05 — مثال مرجع و تخصیص (پروژهٔ پیش‌نویس)', () => {
  it('AC-CBS-01 — BAC برگ‌ها ۱۰۰، ۳۰۰، ۳۰۰، ۳۰۰ و BAC پروژه ۱۰۰۰ میلیون؛ تخصیص‌نیافته صفر', async () => {
    ref = await buildReference('ref');
    const view = data<LinksView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('ref')}/plan-draft/links`)
          .expect(200)
      ).body,
    );
    const bac = Object.fromEntries(view.leaves.filter((item) => item.isLeaf).map((item) => [item.title, item.bac]));
    expect(bac).toEqual({ خاکبرداری: M(100), فونداسیون: M(300), ستون‌ها: M(300), سقف: M(300) });
    expect(view.summary).toMatchObject({ leafCount: 4, linkedCount: 4, imbalancedCount: 0, projectBac: M(1000) });
    // وزن در پروژه ۱۰/۳۰/۳۰/۳۰ با سهم بودجه می‌خواند (cbs.md ۵.۳)
    expect(view.leaves.filter((item) => item.isLeaf).every((item) => item.balanced)).toBe(true);

    // پروژهٔ پیش‌نویس: جاری همان لحظه همگام است (AC-PV-03)
    const tree = data<{ items: CbsItem[]; summary: Record<string, unknown> }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('ref')}/cbs`)
          .expect(200)
      ).body,
    );
    expect(tree.summary).toMatchObject({ cbsBudget: M(1000), bac: M(1000), unallocated: '0', totalBudget: M(1000) });
    expect(tree.items.find((item) => item.code === 'C3')).toMatchObject({ budget: M(300), allocated: M(300), unallocated: '0', linkCount: 3 });
    expect(tree.summary['byType']).toEqual([
      { costType: 'materials', budget: M(700), percent: 70 },
      { costType: 'labor', budget: M(200), percent: 20 },
      { costType: 'subcontract', budget: M(100), percent: 10 },
    ]);
  });

  it('AC-CBS-05 — برآورد آرماتور ۷ تن: تخصیص‌نیافته ۵۰، بودجهٔ CBS ۱۰۵۰، BAC همان ۱۰۰۰؛ هشدار W-06', async () => {
    const draft = data<CbsDraft>(
      (await cbsOps('ref', await revisionOf('ref'), [{ type: 'setPricing', id: ref.cbs['C3'], pricing: 'unit_rate', qty: 7 }]).expect(200)).body,
    );
    expect(draft.summary).toMatchObject({ cbsBudget: M(1050), bac: M(1000), unallocated: M(50) });
    expect(draft.items.find((item) => item.code === 'C3')).toMatchObject({ budget: M(350), allocated: M(300), unallocated: M(50) });
    expect(draft.validation.warnings).toContainEqual(expect.objectContaining({ code: 'cbs_unallocated', rule: 'W-06', cbsItemId: ref.cbs['C3'] }));
  });

  it('AC-CBS-04 — اتصال ۷ تن به قلم ۶ تنی: V-08 با دو پیشنهاد اصلاح', async () => {
    let revision = data<CbsDraft>(
      (await cbsOps('ref', await revisionOf('ref'), [{ type: 'setPricing', id: ref.cbs['C3'], pricing: 'unit_rate', qty: 6 }]).expect(200)).body,
    ).draftRevision;
    const linked = data<LinksView>(
      (await linkOps('ref', revision, [{ type: 'setQuantity', wbsItemId: ref.wbs['l122'], cbsItemId: ref.cbs['C3'], quantity: 3 }]).expect(200)).body,
    );
    const error = linked.validation?.errors.find((issue) => issue.code === 'cbs_over_allocated');
    expect(error).toMatchObject({ rule: 'V-08', cbsItemId: ref.cbs['C3'] });
    expect(error?.message).toContain('مقدار برآورد را به ۷ t برسانید');
    expect(error?.message).toContain('«اتصالات» کم کنید');
    revision = linked.draftRevision;
    await linkOps('ref', revision, [{ type: 'setQuantity', wbsItemId: ref.wbs['l122'], cbsItemId: ref.cbs['C3'], quantity: 2 }]).expect(200);
  });

  it('cbs.md ۵.۱ — اتصال به نقطهٔ عطف و قلم گروه رد؛ عمل ردشده کل ذخیره را نگه می‌دارد', async () => {
    const wbs = data<{ items: { id: string; isMilestone: boolean }[]; draftRevision: number }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('ref')}/plan-draft/wbs`)
          .expect(200)
      ).body,
    );
    const milestone = wbs.items.find((item) => item.isMilestone);
    const preview = data<LinksView>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('ref')}/plan-draft/links/ops/preview`, {
            draftRevision: wbs.draftRevision,
            ops: [
              { type: 'unlink', wbsItemId: ref.wbs['l111'], cbsItemId: ref.cbs['C1'] },
              ...(milestone ? [{ type: 'link', wbsItemId: milestone.id, cbsItemId: ref.cbs['C1'], quantity: 1 }] : []),
              { type: 'link', wbsItemId: ref.wbs['l111'], cbsItemId: ref.cbs['C4'], amount: '0' },
            ],
          })
          .expect(200)
      ).body,
    );
    expect(preview.opErrors?.map((error) => error.code)).toEqual([...(milestone ? ['MILESTONE'] : []), 'AMOUNT_REQUIRED']);
    expect(preview.leaves.find((item) => item.title === 'خاکبرداری')?.bac).toBe('0');
    const rejected = await linkOps('ref', wbs.draftRevision, [{ type: 'link', wbsItemId: ref.wbs['g1'], cbsItemId: ref.cbs['C1'], quantity: 1 }]).expect(422);
    expect(code(rejected.body)).toBe('CBS_OP_REJECTED');
    expect(details(rejected.body)).toMatchObject({ opIndex: 0, code: 'NOT_LEAF' });
  });

  it('AC-CBS-06 — بی cbs.view_amounts هیچ مبلغی نمی‌آید؛ شمارنده‌ها و نسبت‌ها می‌آیند', async () => {
    const tree = data<{ items: CbsItem[]; summary: Record<string, unknown> }>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('ref')}/cbs`)
          .expect(200)
      ).body,
    );
    const c3 = tree.items.find((item) => item.code === 'C3') as CbsItem;
    expect(c3).toMatchObject({ budget: null, unitRate: null, allocated: null, unallocated: null, linkCount: 3 });
    expect(tree.summary).toMatchObject({ totalBudget: null, cbsBudget: null, bac: null, contingencyReserve: null, ac: null });
    expect((tree.summary['byType'] as { budget: unknown; percent: number }[])[0]).toMatchObject({ budget: null, percent: 70 });

    const detail = data<{ links: { subBudget: unknown; quantity: number }[] }>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('ref')}/cbs/${ref.cbs['C3']}`)
          .expect(200)
      ).body,
    );
    expect(detail.links.every((link) => link.subBudget === null && link.quantity === 2)).toBe(true);
    const links = data<LinksView>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('ref')}/links`)
          .expect(200)
      ).body,
    );
    expect(links.summary.projectBac).toBeNull();
    expect(links.leaves.every((item) => item.bac === null)).toBe(true);
    // ناظر نسخهٔ کاری را نمی‌بیند (plan.edit_draft)
    await as('reviewer')
      .get(`/v1/projects/${pid('ref')}/plan-draft/cbs`)
      .expect(403);
    // مدیر پروژه می‌بیند
    const pm = data<{ summary: Record<string, unknown> }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('ref')}/cbs`)
          .expect(200)
      ).body,
    );
    expect(pm.summary['bac']).toBe(M(1000));
  });
});

describe('F05 ۷ — پروژهٔ فعال: بازنگری بودجه', () => {
  let requestId: string;

  it('cbs.md ۷.۲ — تغییر بودجه در پروژهٔ فعال cbs.revise_budget می‌خواهد؛ اعمال منبع budget_revision دارد', async () => {
    live = await buildReference('live');
    const revision = await revisionOf('live');
    const denied = await cbsOps('live', revision, [{ type: 'setPricing', id: live.cbs['C2'], pricing: 'unit_rate', rate: M(1.1) }], 'planner').expect(422);
    expect(details(denied.body)).toMatchObject({ code: 'BUDGET_REVISION_REQUIRED' });
    // عنوان بودجه نیست و برای برنامه‌ریز آزاد است
    await cbsOps('live', revision, [{ type: 'update', id: live.cbs['C2'], patch: { title: 'بتن آماده C25' } }], 'planner').expect(200);

    const impact = data<{ cbs?: { isBudgetRevision: boolean; budgetChange: string } }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/plan-draft/impact`)
          .expect(200)
      ).body,
    );
    expect(impact.cbs).toMatchObject({ isBudgetRevision: true, budgetChange: M(1000) });
    const applied = await as('pm')
      .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: await revisionOf('live'), note: 'ساختار و بودجهٔ اولیه' })
      .expect(200);
    const { rows } = await test.owner.query<{ source: string; number: number }>('select source, number from plan_version where id = $1', [
      data<{ versionId: string }>(applied.body).versionId,
    ]);
    expect(rows[0]).toEqual({ source: 'budget_revision', number: 1 });
    const tree = data<{ summary: Record<string, unknown> }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/cbs`)
          .expect(200)
      ).body,
    );
    expect(tree.summary).toMatchObject({ cbsBudget: M(1000), bac: M(1000) });
  });

  it('AC-CBS-04 — اعمال بازنگری با تخصیص بیش از برآورد رد می‌شود', async () => {
    await linkOps('live', 0, [{ type: 'setQuantity', wbsItemId: live.wbs['l122'], cbsItemId: live.cbs['C3'], quantity: 3 }]).expect(200);
    const rejected = await as('pm')
      .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: 1, note: 'آزمون تخصیص' })
      .expect(422);
    expect(code(rejected.body)).toBe('PLAN_DRAFT_INVALID');
    await as('pm')
      .delete(`/v1/projects/${pid('live')}/plan-draft`)
      .expect(200);
  });

  it('cbs.md ۷.۳ — درخواست بازنگری: اثر از سرور، NT-BUD-01 به مدیر پروژه، مبلغ برای ناظر پنهان', async () => {
    const draftProject = await as('planner')
      .post(`/v1/projects/${pid('ref')}/budget-revisions`, {
        reason: 'افزایش نرخ آهن‌آلات',
        changes: [{ cbsItemId: ref.cbs['C3'], field: 'unitRate', to: M(55) }],
      })
      .expect(409);
    expect(code(draftProject.body)).toBe('BUDGET_REVISION_NOT_ALLOWED');
    const short = await as('planner')
      .post(`/v1/projects/${pid('live')}/budget-revisions`, { reason: 'نرخ', changes: [{ cbsItemId: live.cbs['C3'], field: 'unitRate', to: M(55) }] })
      .expect(422);
    expect(code(short.body)).toBe('BUDGET_REVISION_INVALID');
    const wrongField = await as('planner')
      .post(`/v1/projects/${pid('live')}/budget-revisions`, {
        reason: 'افزایش نرخ آهن‌آلات',
        changes: [{ cbsItemId: live.cbs['C4'], field: 'unitRate', to: M(55) }],
      })
      .expect(422);
    expect(code(wrongField.body)).toBe('BUDGET_REVISION_INVALID');

    const created = data<{
      id: string;
      status: string;
      impact: { budgetChange: string; bacChange: string };
      changes: { from: string; to: string; cbsCode: string }[];
    }>(
      (
        await as('planner')
          .post(`/v1/projects/${pid('live')}/budget-revisions`, {
            reason: 'افزایش نرخ آهن‌آلات',
            changes: [{ cbsItemId: live.cbs['C3'], field: 'unitRate', from: '1', to: '۵۵٬۰۰۰٬۰۰۰' }],
          })
          .expect(201)
      ).body,
    );
    requestId = created.id;
    expect(created).toMatchObject({ status: 'pending', impact: { budgetChange: M(30), bacChange: M(30) } });
    expect(created.changes[0]).toMatchObject({ from: M(50), to: M(55), cbsCode: 'C3' });
    const { rows } = await test.owner.query("select 1 from notification where user_id = $1 and code = 'NT-BUD-01'", [org.users.pm.id]);
    expect(rows).toHaveLength(1);

    const hidden = data<{ changes: { from: unknown; to: unknown }[]; impact: { budgetChange: unknown } }[]>(
      (
        await as('reviewer')
          .get(`/v1/projects/${pid('live')}/budget-revisions?status=pending`)
          .expect(200)
      ).body,
    );
    expect(hidden[0]).toMatchObject({ changes: [{ from: null, to: null }], impact: { budgetChange: null } });
    const detail = data<{ pendingRevisionCount: number }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/cbs/${live.cbs['C3']}`)
          .expect(200)
      ).body,
    );
    expect(detail.pendingRevisionCount).toBe(1);
  });

  it('AC-CBS-08 — تأیید در حضور بازنگری کاری باز با پیام مشخص مسدود است', async () => {
    await cbsOps('live', 0, [{ type: 'update', id: live.cbs['C1'], patch: { supplier: 'شرکت خاک' } }]).expect(200);
    const blocked = await as('pm')
      .post(`/v1/projects/${pid('live')}/budget-revisions/${requestId}/approve`, { note: '' })
      .expect(409);
    expect(code(blocked.body)).toBe('PLAN_DRAFT_OPEN');
    expect(details(blocked.body)).toMatchObject({ number: 2 });
    await as('planner')
      .post(`/v1/projects/${pid('live')}/budget-revisions/${requestId}/approve`, {})
      .expect(403);
    await as('pm')
      .delete(`/v1/projects/${pid('live')}/plan-draft`)
      .expect(200);
  });

  it('AC-CBS-09 — تأیید: نسخهٔ «بازنگری بودجه» اعمال، زیربودجهٔ اتصال‌ها با نرخ تازه، تاریخچهٔ نرخ و NT-BUD-02', async () => {
    const approved = data<{ status: string; resultVersionId: string; decidedBy: { id: string } }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('live')}/budget-revisions/${requestId}/approve`, { note: 'تأیید با قرارداد تازه' })
          .expect(200)
      ).body,
    );
    expect(approved).toMatchObject({ status: 'applied', decidedBy: { id: org.users.pm.id } });
    const { rows } = await test.owner.query<{ source: string; number: number; note: string }>('select source, number, note from plan_version where id = $1', [
      approved.resultVersionId,
    ]);
    expect(rows[0]).toEqual({ source: 'budget_revision', number: 2, note: 'افزایش نرخ آهن‌آلات — تأیید با قرارداد تازه' });

    const links = data<LinksView>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/links`)
          .expect(200)
      ).body,
    );
    expect(links.links.find((link) => link.wbsItemId === live.wbs['l112'] && link.cbsItemId === live.cbs['C3'])).toMatchObject({
      quantity: 2,
      subBudget: M(110),
    });
    expect(links.summary.projectBac).toBe(M(1030));

    const detail = data<{
      rateHistory: {
        versionId: string;
        versionLabel: string;
        unitRate: string;
        previousRate: string | null;
        changePercent: number | null;
        note: string | null;
      }[];
    }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/cbs/${live.cbs['C3']}`)
          .expect(200)
      ).body,
    );
    expect(detail.rateHistory).toEqual([
      expect.objectContaining({
        versionId: approved.resultVersionId,
        versionLabel: 'بازنگری بودجه R2',
        unitRate: M(55),
        previousRate: M(50),
        changePercent: 10,
        note: rows[0]?.note,
      }),
      expect.objectContaining({ versionLabel: 'افزوده در بازنگری بودجه R1', unitRate: M(50), previousRate: null }),
    ]);
    const { rows: notified } = await test.owner.query("select 1 from notification where user_id = $1 and code = 'NT-BUD-02'", [org.users.planner.id]);
    expect(notified).toHaveLength(1);
    const again = await as('pm')
      .post(`/v1/projects/${pid('live')}/budget-revisions/${requestId}/approve`, {})
      .expect(409);
    expect(code(again.body)).toBe('BUDGET_REVISION_DECIDED');
  });

  it('cbs.md ۷.۳ — رد درخواست یادداشت می‌خواهد', async () => {
    const created = data<{ id: string }>(
      (
        await as('planner')
          .post(`/v1/projects/${pid('live')}/budget-revisions`, {
            reason: 'کاهش مقدار بتن',
            changes: [{ cbsItemId: live.cbs['C2'], field: 'estimatedQuantity', to: '420' }],
          })
          .expect(201)
      ).body,
    );
    const short = await as('pm')
      .post(`/v1/projects/${pid('live')}/budget-revisions/${created.id}/reject`, { note: 'نه' })
      .expect(422);
    expect(code(short.body)).toBe('BUDGET_REVISION_INVALID');
    const rejected = data<{ status: string; decisionNote: string }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('live')}/budget-revisions/${created.id}/reject`, { note: 'مقدار با متره نمی‌خواند' })
          .expect(200)
      ).body,
    );
    expect(rejected).toMatchObject({ status: 'rejected', decisionNote: 'مقدار با متره نمی‌خواند' });
    const pending = data<unknown[]>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/budget-revisions?status=pending`)
          .expect(200)
      ).body,
    );
    expect(pending).toHaveLength(0);
  });
});

describe('F05 ۱۰ — ورود از فایل', () => {
  const header = 'کد,عنوان,نوع هزینه,شیوهٔ قیمت,واحد,مقدار برآورد,نرخ واحد,مبلغ مقطوع,تأمین‌کننده';
  const good = [
    header,
    'C.1,مصالح,مصالح,,,,,,',
    'C.1.1,بتن,مصالح,نرخ واحد,m3,۴۰۰,1000000,,',
    'C.1.2,آرماتور,materials,نرخ واحد,t,6,50000000,,',
    'C.2,نیروی اسکلت,نیروی انسانی,مقطوع,,,,200000000,',
  ].join('\n');

  it('cbs.md ۱۰ — CBS: Excel رد، پیش‌نمایش با خطای ردیف، همه یا هیچ، سپس ورود با سلسله‌مراتب', async () => {
    const path = `/v1/projects/${pid('imp')}/plan-draft/cbs/import`;
    const revision = await revisionOf('imp');
    const excel = await as('pm')
      .upload(`${path}/preview`, good, { mode: 'replace', draftRevision: String(revision) }, 'cbs.xlsx')
      .expect(422);
    expect(code(excel.body)).toBe('CBS_IMPORT_INVALID');

    const bad = `${good}\nC.3,نامعلوم,ابزار,مقطوع,,,,1000,`;
    const preview = data<{
      rows: { code: string; errors: string[]; budget: string | null; isGroup: boolean }[];
      errorCount: number;
      itemCount: number;
      budgetTotal: string;
    }>(
      (
        await as('pm')
          .upload(`${path}/preview`, bad, { mode: 'replace', draftRevision: String(revision) })
          .expect(200)
      ).body,
    );
    expect(preview).toMatchObject({ errorCount: 1, itemCount: 5 });
    expect(preview.rows.find((row) => row.code === 'C.1')).toMatchObject({ isGroup: true, budget: null });
    expect(preview.rows.find((row) => row.code === 'C.1.1')?.budget).toBe(M(400));
    expect(preview.rows.find((row) => row.code === 'C.3')?.errors[0]).toContain('نوع هزینهٔ «ابزار»');
    await as('pm')
      .upload(`${path}/confirm`, bad, { mode: 'replace', draftRevision: String(revision) })
      .expect(422);

    const saved = data<CbsDraft>(
      (
        await as('pm')
          .upload(`${path}/confirm`, good, { mode: 'replace', draftRevision: String(revision) })
          .expect(200)
      ).body,
    );
    const byCode = new Map(saved.items.map((item) => [item.code, item]));
    expect(byCode.get('C.1')).toMatchObject({ isLeaf: false, budget: M(700) });
    expect(byCode.get('C.1.2')).toMatchObject({ parentId: byCode.get('C.1')?.id, budget: M(300) });
    expect(saved.summary.cbsBudget).toBe(M(900));
  });

  it('cbs.md ۱۰ — اتصال‌ها: اتصال‌های هر برگ فایل جایگزین می‌شوند', async () => {
    const wbs = data<{ idMap: Record<string, string>; items: { id: string; code: string }[]; draftRevision: number }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('imp')}/plan-draft/wbs/ops`, {
            draftRevision: await revisionOf('imp'),
            ops: [{ type: 'add', tempId: 'w', parentId: null, afterId: null, fields: leaf('اسکلت بتنی', 100) }],
          })
          .expect(200)
      ).body,
    );
    const leafCode = wbs.items.find((item) => item.id === wbs.idMap['w'])?.code as string;
    const csv = ['کد WBS,کد CBS,مقدار,مبلغ', `${leafCode},C.1.1,100,`, `${leafCode},C.2,,50000000`].join('\n');
    const path = `/v1/projects/${pid('imp')}/plan-draft/links/import`;
    const preview = data<{ errorCount: number; leafCount: number; budgetTotal: string }>(
      (
        await as('pm')
          .upload(`${path}/preview`, csv, { draftRevision: String(wbs.draftRevision) }, 'links.csv')
          .expect(200)
      ).body,
    );
    expect(preview).toMatchObject({ errorCount: 0, leafCount: 1, budgetTotal: M(150) });
    await as('pm')
      .upload(`${path}/confirm`, csv, { draftRevision: String(wbs.draftRevision) }, 'links.csv')
      .expect(200);
    // بار دوم همان فایل جایگزین می‌کند، نه اضافه
    const again = data<LinksView>(
      (
        await as('pm')
          .upload(`${path}/confirm`, csv, { draftRevision: String(wbs.draftRevision + 1) }, 'links.csv')
          .expect(200)
      ).body,
    );
    expect(again.leaves.find((item) => item.id === wbs.idMap['w'])).toMatchObject({ linkCount: 2, bac: M(150) });
  });
});
