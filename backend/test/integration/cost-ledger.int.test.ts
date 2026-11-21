import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tehranClock } from '../../src/platform/scheduler/ticks.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۸ — دفتر هزینه (F06؛ AC-CST-01، ۰۲، ۰۵، ۰۶، ۰۷، ۰۸؛ AC-CBS-07). AC-CST-03 (دورهٔ بسته) و AC-CST-04 (CPI در تاریخ
// کامل بودن) با محاسبات و دوره‌ها (برش ۹). مبالغ مثال مرجع cbs.md ۹.۲ به ریال.

type UserKey = 'pm' | 'finance' | 'planner' | 'reviewer';
type ProjectKey = 'live' | 'draft' | 'archived' | 'completed';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.85.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = (project: ProjectKey) => org.projects[project];
const M = (millions: number) => String(BigInt(millions) * 1_000_000n);
const cbs: Record<string, string> = {};
let today: string;
let past: string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
    upload: (path: string, csv: string, name = 'costs.csv') => auth(agent.post(path)).attach('file', Buffer.from(csv, 'utf8'), name),
  };
}

interface Entry {
  id: string;
  amount: string;
  status: string;
  reversed: boolean;
  reversesEntryId: string | null;
}
interface Listing {
  entries: Entry[];
  totals: { postedAc: string; draftCount: number; draftAmount: string };
  costsCompleteThrough: string | null;
}

const entry = (project: ProjectKey, body: object, user: UserKey = 'finance') => as(user).post(`/v1/projects/${pid(project)}/cost-entries`, body);
const listing = async (query = '') =>
  data<Listing>(
    (
      await as('finance')
        .get(`/v1/projects/${pid('live')}/cost-entries${query}`)
        .expect(200)
    ).body,
  );

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', finance: 'finance', planner: 'planner', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان هزینه',
    users: { pm: { mobile: '09166000001' }, finance: { mobile: '09166000002' }, planner: { mobile: '09166000003' }, reviewer: { mobile: '09166000004' } },
    projects: {
      live: { code: 'PRJ-1405-951', manager: 'pm', members: team },
      draft: { code: 'PRJ-1405-952', status: 'draft', manager: 'pm', members: team },
      archived: { code: 'PRJ-1405-953', status: 'archived', manager: 'pm', members: team },
      completed: { code: 'PRJ-1405-954', status: 'completed', manager: 'pm', members: team },
    },
  });
  today = tehranClock(test.clock.now()).date;
  past = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  const finish = new Date(Date.parse(`${today}T00:00:00Z`) + 60 * 86_400_000).toISOString().slice(0, 10);
  await test.owner.query(`update project set planned_start = $1, planned_finish = $2 where id = any($3)`, [past, finish, Object.values(org.projects)]);
  for (const key of ['pm', 'finance', 'planner', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;

  // CBS مثال مرجع در پروژهٔ فعال با یک بازنگری (نرخ‌ها: C1 ۰٫۲، C2 ۱، C3 ۵۰ میلیون؛ C4 مقطوع ۲۰۰)
  const ops = await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/wbs/ops`, {
      draftRevision: 0,
      ops: [
        {
          type: 'add',
          tempId: 'w',
          parentId: null,
          afterId: null,
          fields: { title: 'اسکلت', weightInParent: 100, plannedStart: past, plannedFinish: finish, measurementMethod: 'percent' },
        },
      ],
    })
    .expect(200);
  const saved = await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/cbs/ops`, {
      draftRevision: data<{ draftRevision: number }>(ops.body).draftRevision,
      ops: [
        { type: 'add', tempId: 'G', parentId: null, item: { title: 'مصالح', code: 'G', costType: 'materials' } },
        {
          type: 'add',
          tempId: 'C1',
          parentId: null,
          afterId: 'G',
          item: { title: 'خاکبرداری', code: 'C1', costType: 'subcontract', pricing: 'unit_rate', unit: 'm3', qty: 500, rate: String(200_000) },
        },
        {
          type: 'add',
          tempId: 'C2',
          parentId: 'G',
          item: { title: 'بتن', code: 'C2', costType: 'materials', pricing: 'unit_rate', unit: 'm3', qty: 400, rate: M(1) },
        },
        {
          type: 'add',
          tempId: 'C3',
          parentId: 'G',
          afterId: 'C2',
          item: { title: 'آرماتور', code: 'C3', costType: 'materials', pricing: 'unit_rate', unit: 't', qty: 6, rate: M(50) },
        },
        {
          type: 'add',
          tempId: 'C4',
          parentId: null,
          afterId: 'C1',
          item: { title: 'نیروی انسانی', code: 'C4', costType: 'labor', pricing: 'lump_sum', lump: M(200) },
        },
      ],
    })
    .expect(200);
  Object.assign(cbs, data<{ idMap: Record<string, string> }>(saved.body).idMap);
  await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: 2, note: 'ساختار و بودجه' })
    .expect(200);
});

afterAll(async () => {
  await test?.close();
});

describe('F06 ۵ — ثبت، قطعی، برگشت', () => {
  it('AC-CST-01 — ردیف‌هایی با جمع C1=۱۰۵، C2=۲۱۵، C3=۱۴۰، C4=۶۰ ← AC پروژه ۵۲۰ میلیون؛ W14 همان را نشان می‌دهد', async () => {
    const rows: [string, number, string | null][] = [
      ['C1', 105, null],
      ['C2', 200, '200'],
      ['C2', 15, '15'],
      ['C3', 140, '2.8'],
      ['C4', 60, null],
    ];
    for (const [key, amount, quantity] of rows) {
      await entry('live', { cbsItemId: cbs[key], costDate: past, amount: M(amount), quantity, documentNo: `F-${key}-${amount}`, post: true }).expect(201);
    }
    expect((await listing()).totals).toMatchObject({ postedAc: M(520), draftCount: 0 });
    const tree = data<{ summary: { ac: string } }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/cbs`)
          .expect(200)
      ).body,
    );
    expect(tree.summary.ac).toBe(M(520));
    // واحد مالی تکراری را با همان externalRef نادیده می‌گیرد (۵.۵)
    const first = data<{ duplicate: boolean }>(
      (await entry('live', { cbsItemId: cbs['C4'], costDate: past, amount: M(1), externalRef: 'INV-1', post: true }).expect(201)).body,
    );
    const again = data<{ duplicate: boolean; entry: { amount: string } }>(
      (await entry('live', { cbsItemId: cbs['C4'], costDate: past, amount: M(9), externalRef: 'INV-1', post: true }).expect(201)).body,
    );
    expect([first.duplicate, again.duplicate, again.entry.amount]).toEqual([false, true, M(1)]);
  });

  it('AC-CST-06 — قلم گروه، مقدار روی مقطوع، مبلغ منفی و تاریخ آینده رد', async () => {
    const group = await entry('live', { cbsItemId: cbs['G'], costDate: past, amount: M(1) }).expect(422);
    expect(code(group.body)).toBe('COST_ENTRY_INVALID');
    await entry('live', { cbsItemId: cbs['C4'], costDate: past, amount: M(1), quantity: '2' }).expect(422);
    await entry('live', { cbsItemId: cbs['C3'], costDate: past, amount: '-5' }).expect(422);
    const future = new Date(Date.parse(`${today}T00:00:00Z`) + 3 * 86_400_000).toISOString().slice(0, 10);
    await entry('live', { cbsItemId: cbs['C3'], costDate: future, amount: M(1) }).expect(422);
  });

  it('AC-CST-02 — اصلاح ۵۰ به ۵ میلیون: برگشتی −۵۰ و تازهٔ +۵؛ اصلی دست‌نخورده؛ AC دقیقاً ۴۵ کم می‌شود', async () => {
    const original = data<{ entry: Entry }>((await entry('live', { cbsItemId: cbs['C2'], costDate: past, amount: M(50), post: true }).expect(201)).body).entry;
    const before = BigInt((await listing()).totals.postedAc);
    const corrected = data<{ reversal: Entry; replacement: Entry }>(
      (
        await as('finance')
          .post(`/v1/projects/${pid('live')}/cost-entries/${original.id}/correct`, {
            reason: 'خطای تایپ مبلغ',
            replacement: { cbsItemId: cbs['C2'], costDate: past, amount: M(5) },
          })
          .expect(200)
      ).body,
    );
    expect(corrected.reversal).toMatchObject({ amount: `-${M(50)}`, reversesEntryId: original.id, status: 'posted' });
    expect(corrected.replacement).toMatchObject({ amount: M(5), status: 'posted' });
    expect(before - BigInt((await listing()).totals.postedAc)).toBe(45_000_000n);
    const { rows } = await test.owner.query<{ amount: string; status: string }>('select amount, status from cost_entry where id = $1', [original.id]);
    expect(rows[0]).toEqual({ amount: M(50), status: 'posted' });
    expect((await listing()).entries.find((row) => row.id === original.id)?.reversed).toBe(true);
    // هر ردیف یک بار؛ برگشتی برگشت‌پذیر نیست
    await as('finance')
      .post(`/v1/projects/${pid('live')}/cost-entries/${original.id}/correct`, { reason: 'دوباره' })
      .expect(409);
    await as('finance')
      .post(`/v1/projects/${pid('live')}/cost-entries/${corrected.reversal.id}/correct`, { reason: 'برگشتِ برگشت' })
      .expect(409);
    const { rows: audit } = await test.owner.query("select 1 from audit_log where action = 'cost.entry_reversed' and entity_id = $1", [original.id]);
    expect(audit).toHaveLength(1);
  });

  it('AC-CST-07 — ردیف قطعی نه ویرایش نه حذف (API و پایگاه داده)؛ پیش‌نویس حذف‌شدنی', async () => {
    const posted = (await listing('?status=posted')).entries[0] as Entry;
    const removed = await as('finance')
      .delete(`/v1/projects/${pid('live')}/cost-entries/${posted.id}`)
      .expect(409);
    expect(code(removed.body)).toBe('COST_NOT_ALLOWED');
    await expect(test.owner.query('update cost_entry set amount = 1 where id = $1', [posted.id])).rejects.toThrow(/تغییر نمی‌کند/);
    await expect(test.owner.query('delete from cost_entry where id = $1', [posted.id])).rejects.toThrow(/تغییر نمی‌کند/);
    const draft = data<{ entry: Entry }>((await entry('live', { cbsItemId: cbs['C3'], costDate: past, amount: M(3) }).expect(201)).body).entry;
    expect(draft.status).toBe('draft');
    await as('finance')
      .delete(`/v1/projects/${pid('live')}/cost-entries/${draft.id}`)
      .expect(200);
  });

  it('۱۱.۵–۱۱.۶ و ۹ — پیش‌نویس و بایگانی ممنوع؛ تمام‌شده مجاز؛ برنامه‌ریز فقط می‌بیند؛ ناظر نه', async () => {
    expect(code((await entry('draft', { cbsItemId: cbs['C3'], costDate: past, amount: M(1) }).expect(409)).body)).toBe('COST_NOT_ALLOWED');
    await entry('archived', { cbsItemId: cbs['C3'], costDate: past, amount: M(1) }).expect(409);
    // تمام‌شده: قلم این پروژه نیست ← ۴۲۲، نه ۴۰۹
    await entry('completed', { cbsItemId: cbs['C3'], costDate: past, amount: M(1) }).expect(422);
    await as('planner')
      .get(`/v1/projects/${pid('live')}/cost-entries`)
      .expect(200);
    await entry('live', { cbsItemId: cbs['C3'], costDate: past, amount: M(1) }, 'planner').expect(403);
    await as('reviewer')
      .get(`/v1/projects/${pid('live')}/cost-entries`)
      .expect(403);
  });

  it('AC-CBS-07 — حذف قلم دارای هزینهٔ posted با پیشنهاد «بستن قلم» رد می‌شود؛ قفل در درخت نسخهٔ کاری', async () => {
    const tree = data<{ draftRevision: number; items: { id: string; locks: Record<string, string>; postedAc: string | null }[] }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}/plan-draft/cbs`)
          .expect(200)
      ).body,
    );
    const c3 = tree.items.find((item) => item.id === cbs['C3']);
    expect(c3?.postedAc).toBe(M(140));
    expect(c3?.locks['remove']).toContain('بستن قلم');
    const rejected = await as('pm')
      .post(`/v1/projects/${pid('live')}/plan-draft/cbs/ops`, { draftRevision: tree.draftRevision, ops: [{ type: 'remove', id: cbs['C3'] }] })
      .expect(422);
    expect((rejected.body as { details: { code: string } }).details.code).toBe('HAS_COST');
  });
});

describe('F06 ۶ — ورود از فایل', () => {
  const csv = () =>
    [
      'کد قلم CBS,تاریخ تحقق,مبلغ (ریال),مقدار,شمارهٔ سند,طرف حساب,شرح,شناسهٔ ردیف,منبع',
      `C2,${past},10000000,10,B-1,بتن آریا,,,خرید`,
      `C3,${past},5000000,0.1,B-2,,,,`,
      `G,${past},1000,,B-3,,,,`,
    ].join('\n');

  it('AC-CST-05 و AC-CST-08 — پیش‌نمایش، ورود پیش‌نویس، قطعی گروهی با یک رویداد؛ بارگذاری دوباره همه تکراری', async () => {
    await as('finance')
      .upload(`/v1/projects/${pid('live')}/cost-imports`, csv(), 'costs.xlsx')
      .expect(422);
    const preview = data<{ batchId: string; rowCount: number; errorCount: number; skippedDuplicateCount: number; totalAmount: string }>(
      (
        await as('finance')
          .upload(`/v1/projects/${pid('live')}/cost-imports`, csv())
          .expect(200)
      ).body,
    );
    expect(preview).toMatchObject({ rowCount: 3, errorCount: 1, skippedDuplicateCount: 0, totalAmount: '15000000' });
    const imported = data<{ imported: number }>(
      (
        await as('finance')
          .post(`/v1/projects/${pid('live')}/cost-imports/${preview.batchId}/import`)
          .expect(200)
      ).body,
    );
    expect(imported.imported).toBe(2);
    expect((await listing()).totals).toMatchObject({ draftCount: 2, draftAmount: '15000000' });
    const before = BigInt((await listing()).totals.postedAc);
    const posted = data<{ posted: number }>(
      (
        await as('finance')
          .post(`/v1/projects/${pid('live')}/cost-imports/${preview.batchId}/post`)
          .expect(200)
      ).body,
    );
    expect(posted.posted).toBe(2);
    expect(BigInt((await listing()).totals.postedAc) - before).toBe(15_000_000n);
    const { rows: events } = await test.owner.query("select 1 from domain_event where type = 'CostEntryPosted' and payload->>'batchId' = $1", [
      preview.batchId,
    ]);
    expect(events).toHaveLength(1);

    const second = data<{ batchId: string; skippedDuplicateCount: number }>(
      (
        await as('finance')
          .upload(`/v1/projects/${pid('live')}/cost-imports`, csv())
          .expect(200)
      ).body,
    );
    expect(second.skippedDuplicateCount).toBe(2);
    expect(
      data<{ imported: number }>(
        (
          await as('finance')
            .post(`/v1/projects/${pid('live')}/cost-imports/${second.batchId}/import`)
            .expect(200)
        ).body,
      ).imported,
    ).toBe(0);
  });
});

describe('F06 ۵.۶ — تاریخ کامل بودن هزینه‌ها (OD-19)', () => {
  it('۱۱.۳–۱۱.۴ — آینده رد؛ ثبت با رویداد؛ عقب بردن بی دلیل رد، با دلیل پذیرفته؛ سربرگ پروژه همان را دارد', async () => {
    const path = `/v1/projects/${pid('live')}/costs-complete-through`;
    const future = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    expect(code((await as('finance').put(path, { date: future }).expect(422)).body)).toBe('COST_ENTRY_INVALID');
    await as('pm').put(path, { date: today }).expect(403);
    await as('finance').put(path, { date: today }).expect(200);
    await as('finance').put(path, { date: past }).expect(422);
    await as('finance').put(path, { date: past, reason: 'صورت‌حساب ماه قبل نرسیده' }).expect(200);
    expect((await listing()).costsCompleteThrough).toBe(past);
    const detail = data<{ costsCompleteThrough: string | null }>(
      (
        await as('pm')
          .get(`/v1/projects/${pid('live')}`)
          .expect(200)
      ).body,
    );
    expect(detail.costsCompleteThrough).toBe(past);
    const { rows } = await test.owner.query("select 1 from domain_event where type = 'CostsCompleteThroughChanged' and project_id = $1", [pid('live')]);
    expect(rows).toHaveLength(2);
  });
});
