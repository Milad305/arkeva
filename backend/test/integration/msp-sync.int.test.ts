import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ObjectStorage } from '../../src/platform/storage/object-storage.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { sampleMspdi, type SampleTask, sampleTasks } from '../fixtures/msp.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// F15 — همگام‌سازی W36 و خروجی به MSP (msp-integration.md ۷.۳، ۷.۴؛ برش ۱۷ب): AC-MS-06 تا AC-MS-12 و AL-INT-02.
// فایل اول: فاز ۱ (UID 1)، گروه 1.1 (UID 2) با برگ‌های 3، 4، 5 و گروه 1.2 (UID 6) با برگ‌های 7، 8، 9.

type UserKey = 'pm' | 'planner' | 'sup' | 'reviewer';
let test: TestApp;
let org: SeededOrg<UserKey, 'linked'>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.72.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

function api(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    patch: (path: string, body: object) => agent.patch(path).set(auth).send(body),
    del: (path: string) => agent.delete(path).set(auth),
    upload: (path: string, content: string) => agent.post(path).set(auth).attach('file', Buffer.from(content, 'utf8'), 'plan.xml'),
  };
}

const data = <T>(body: unknown): T => (body as { data: T }).data;
const pid = () => org.projects.linked;
const original = (): SampleTask[] => sampleTasks({ phases: 1, groups: 2, leaves: 3 }).map((task) => (task.uid === 4 ? { ...task, percent: 40 } : task));
const originalXml = sampleMspdi(original(), { statusDate: '2026-10-01' });

interface Change {
  id: string;
  kind: string;
  code: string;
  field: string;
  selected: boolean;
  resolution: string | null;
  hasApprovedReports: boolean;
}
interface Sync {
  id: string;
  status: string;
  blockedReason: string | null;
  changes: Change[];
  nextRevisionNumber: number;
}

async function itemIds(): Promise<Map<string, string>> {
  const { rows } = await test.owner.query<{ code: string; id: string }>('select code, id from wbs_item where project_id = $1 and removed_at is null', [pid()]);
  return new Map(rows.map((row) => [row.code, row.id]));
}

async function draftRevision(): Promise<number> {
  return data<{ draftRevision: number }>((await api('planner').get(`/v1/projects/${pid()}/plan-draft/wbs`).expect(200)).body).draftRevision;
}

beforeAll(async () => {
  test = await startTestApp();
  const members = { pm: 'project_manager', planner: 'planner', sup: 'supervisor', reviewer: 'reviewer' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان همگام‌سازی',
    users: {
      pm: { mobile: '09172000001' },
      planner: { mobile: '09172000002' },
      sup: { mobile: '09172000003', fullName: 'Ali Mohammadi' },
      reviewer: { mobile: '09172000004' },
    },
    projects: { linked: { code: 'PRJ-1405-801', status: 'draft', manager: 'pm', members } },
  });
  await test.owner.query(`update project set planned_start = '2026-03-01', planned_finish = '2026-12-31' where id = $1`, [pid()]);
  for (const key of ['pm', 'planner', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  // ورود ساختار با پیشرفت اولیهٔ ۴۰٪ برگ 1.1.2 و فعال‌سازی
  const session = data<{ id: string }>((await api('planner').upload(`/v1/projects/${pid()}/msp/imports`, originalXml).expect(201)).body);
  await api('planner')
    .post(`/v1/msp/imports/${session.id}/build`, { openingProgress: [{ id: '1.1.2', percent: 40, selected: true }] })
    .expect(200);
  const activated = await api('pm').post(`/v1/projects/${pid()}/activate`);
  if (activated.status !== 200) throw new Error(`activation: ${JSON.stringify(activated.body)}`);
});

afterAll(async () => {
  await test?.close();
});

describe('F15 ۷.۳ — همگام‌سازی', () => {
  it('AC-MS-10 — تغییر تاریخ برگ در پروژهٔ متصل پیشنهاد می‌سازد، نسخهٔ کاری نه؛ در W12 «در انتظار MSP»', async () => {
    const ids = await itemIds();
    const saved = data<{ proposed: number; draft: unknown; items: { id: string; mspPending: Record<string, string> | null; locks: Record<string, string> }[] }>(
      (
        await api('planner')
          .post(`/v1/projects/${pid()}/plan-draft/wbs/ops`, {
            draftRevision: await draftRevision(),
            ops: [{ type: 'update', id: ids.get('1.1.1'), fields: { plannedFinish: '2026-03-20' } }],
          })
          .expect(200)
      ).body,
    );
    expect(saved.proposed).toBe(1);
    expect(saved.draft).toBeNull();
    const leaf = saved.items.find((item) => item.id === ids.get('1.1.1'));
    expect(leaf?.mspPending).toEqual({ plannedFinish: '2026-03-20' });
    expect(leaf?.locks['plannedFinish']).toBeUndefined();
    const { rows } = await test.owner.query<{ status: string; proposed_value: string; base_value: string }>(
      'select status, proposed_value, base_value from schedule_change_proposal where project_id = $1',
      [pid()],
    );
    expect(rows).toEqual([{ status: 'pending', proposed_value: '2026-03-20', base_value: '2026-03-05' }]);
    const structure = await api('planner').post(`/v1/projects/${pid()}/plan-draft/wbs/ops`, {
      draftRevision: await draftRevision(),
      ops: [{ type: 'add', tempId: 'x', parentId: null, afterId: null, fields: { title: 'تازه' } }],
    });
    expect(structure.status).toBe(422);
  });

  it('AC-MS-12 — با بازنگری کاری دستی باز، همگام‌سازی مسدود است', async () => {
    const ids = await itemIds();
    await api('planner')
      .post(`/v1/projects/${pid()}/plan-draft/wbs/ops`, {
        draftRevision: await draftRevision(),
        ops: [{ type: 'update', id: ids.get('1.1.3'), fields: { title: 'برگ سوم (پروژه‌یار)' } }],
      })
      .expect(200);
    const blocked = data<Sync>((await api('planner').upload(`/v1/projects/${pid()}/msp/syncs`, originalXml).expect(201)).body);
    expect(blocked.status).toBe('blocked');
    expect(blocked.blockedReason).toContain('نسخهٔ کاری دستی');
    const apply = await api('planner').post(`/v1/msp/syncs/${blocked.id}/apply`, { reweight: true });
    expect(apply.status).toBe(409);
    // اعمال همان بازنگری دستی (R1): عنوان 1.1.3 در پروژه‌یار عوض می‌شود
    await api('planner')
      .post(`/v1/projects/${pid()}/plan-draft/apply`, { draftRevision: await draftRevision(), note: 'اصلاح عنوان' })
      .expect(200);
  });

  let sync: Sync;
  it('AC-MS-06 — add، update، delete، move و conflict درست؛ حذف‌ها انتخاب‌نشده', async () => {
    const ids = await itemIds();
    // یک آیتم در صف برای برگ 1.2.3 که حذف می‌شود (AC-MS-11)
    await api('pm')
      .post(`/v1/projects/${pid()}/field-reports/manual`, { wbsItemId: ids.get('1.2.3'), workDate: '2026-10-05', note: 'بازدید میدانی', reportedPercent: 10 })
      .expect(201);
    const tasks = original()
      .filter((task) => task.uid !== 9)
      .map((task) => {
        if (task.uid === 3) return { ...task, finish: '2026-03-20' };
        if (task.uid === 4) return { ...task, name: 'برگ دوم (MSP)' };
        if (task.uid === 5) return { ...task, name: 'برگ سوم (MSP)' };
        if (task.uid === 7) return { ...task, wbs: '1.1.4' };
        return task;
      });
    const added: SampleTask = { ...(tasks.find((task) => task.uid === 8) as SampleTask), uid: 10, wbs: '1.2.4', name: 'فعالیت تازه' };
    sync = data<Sync>(
      (
        await api('planner')
          .upload(`/v1/projects/${pid()}/msp/syncs`, sampleMspdi([...tasks, added]))
          .expect(201)
      ).body,
    );
    expect(sync.status).toBe('review');
    expect(sync.nextRevisionNumber).toBe(2);
    const summary = sync.changes.map((change) => [change.kind, change.code, change.field, change.selected]);
    expect(summary).toEqual(
      expect.arrayContaining([
        ['update', '1.1.1', 'پایان برنامه‌ای', true],
        ['update', '1.1.2', 'عنوان', true],
        ['conflict', '1.1.3', 'عنوان', true],
        ['move', '1.2.1', 'والد', true],
        ['update', '1.2.1', 'کد', true],
        ['delete', '1.2.3', 'کل آیتم', false],
        ['add', '1.2.4', 'کل آیتم', true],
      ]),
    );
  });

  it('AC-MS-08 — تعارض تا تعیین تکلیف اعمال را می‌بندد', async () => {
    const blocked = await api('planner').post(`/v1/msp/syncs/${sync.id}/apply`, { reweight: true });
    expect(blocked.status).toBe(422);
    expect(blocked.body).toMatchObject({ code: 'MSP_IMPORT_INVALID' });
    const conflict = sync.changes.find((change) => change.kind === 'conflict') as Change;
    const remove = sync.changes.find((change) => change.kind === 'delete') as Change;
    await api('planner').patch(`/v1/msp/syncs/${sync.id}/changes/${conflict.id}`, { resolution: 'accept_msp' }).expect(200);
    await api('planner').patch(`/v1/msp/syncs/${sync.id}/changes/${remove.id}`, { selected: true }).expect(200);
  });

  it('AC-MS-07، AC-MS-11، AC-MS-10 — اعمال: بازنگری R2 با منبع msp_sync، مبنا دست‌نخورده، آیتم در صف بلاتکلیف، پیشنهاد تأییدشده', async () => {
    const {
      rows: [baselineBefore],
    } = await test.owner.query<{ n: number }>(
      `select count(*)::int as n from wbs_item_plan p join plan_version v on v.id = p.plan_version_id where v.project_id = $1 and v.kind = 'baseline'`,
      [pid()],
    );
    const result = data<{ number: number; appliedCount: number; needsResolution: number }>(
      (await api('planner').post(`/v1/msp/syncs/${sync.id}/apply`, { reweight: true }).expect(200)).body,
    );
    expect(result).toMatchObject({ number: 2, needsResolution: 1 });
    const { rows: versions } = await test.owner.query<{ number: number; source: string; kind: string }>(
      `select number, source, kind from plan_version where project_id = $1 and status = 'applied' order by number`,
      [pid()],
    );
    expect(versions.map((row) => [row.number, row.kind, row.source])).toEqual([
      [0, 'baseline', 'msp_import'],
      [1, 'revision', 'manual_edit'],
      [2, 'revision', 'msp_sync'],
    ]);
    const {
      rows: [baselineAfter],
    } = await test.owner.query<{ n: number }>(
      `select count(*)::int as n from wbs_item_plan p join plan_version v on v.id = p.plan_version_id where v.project_id = $1 and v.kind = 'baseline'`,
      [pid()],
    );
    expect(baselineAfter?.n).toBe(baselineBefore?.n);

    const { rows: items } = await test.owner.query<{
      code: string;
      title: string;
      parent_code: string | null;
      weight_in_parent: string;
      planned_finish: string;
    }>(
      `select w.code, w.title, p.code as parent_code, w.weight_in_parent::text, w.planned_finish::text from wbs_item w left join wbs_item p on p.id = w.parent_id
        where w.project_id = $1 and w.removed_at is null order by w.code`,
      [pid()],
    );
    const byCode = new Map(items.map((item) => [item.code, item]));
    expect(byCode.get('1.1.1')?.planned_finish).toBe('2026-03-20');
    expect(byCode.get('1.1.2')?.title).toBe('برگ دوم (MSP)');
    expect(byCode.get('1.1.3')?.title).toBe('برگ سوم (MSP)');
    expect(byCode.get('1.1.4')?.parent_code).toBe('1.1');
    expect(byCode.get('1.2.4')?.title).toBe('فعالیت تازه');
    expect(byCode.has('1.2.3')).toBe(false);
    const sums = new Map<string | null, number>();
    for (const item of items) sums.set(item.parent_code, (sums.get(item.parent_code) ?? 0) + Math.round(Number(item.weight_in_parent) * 10_000));
    expect([...sums.values()].every((sum) => sum === 1_000_000)).toBe(true);

    const {
      rows: [uid],
    } = await test.owner.query<{ external_id: string }>(
      `select m.external_id from external_id_map m join wbs_item w on w.id = m.entity_id where w.project_id = $1 and w.code = '1.2.4'`,
      [pid()],
    );
    expect(uid?.external_id).toBe('10');
    const { rows: proposals } = await test.owner.query<{ status: string }>('select status from schedule_change_proposal where project_id = $1', [pid()]);
    expect(proposals).toEqual([{ status: 'confirmed' }]);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string }>(
        `select i.status from field_report_item i join field_report r on r.id = i.report_id where r.project_id = $1 and r.source = 'web_manual'`,
        [pid()],
      );
      return rows[0]?.status === 'needs_resolution';
    });
    const again = await api('planner').post(`/v1/msp/syncs/${sync.id}/apply`, { reweight: true });
    expect(again.status).toBe(409);
  });
});

describe('F15 ۷.۴ — خروجی به MSP و AL-INT-02', () => {
  it('AL-INT-02 — پیشرفت تأییدشدهٔ منتظر ارسال هشدار اطلاعی می‌سازد', async () => {
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string }>("select status from alert where project_id = $1 and rule_code = 'AL-INT-02'", [pid()]);
      return rows.some((row) => row.status === 'open');
    });
  });

  it('AC-MS-09 — XML خروجی درصد و تاریخ واقعی UIDها را می‌نویسد، تقویم با تیک؛ فایل ورودی دست‌نخورده', async () => {
    await waitFor(async () => {
      const preview = data<{ rows: { uid: number | null; percent: number }[] }>(
        (await api('planner').get(`/v1/projects/${pid()}/msp/export-preview`).expect(200)).body,
      );
      return preview.rows.some((row) => row.uid === 4 && row.percent === 40);
    });
    const result = data<{ fileName: string; xml: string; exportedCount: number }>(
      (await api('planner').post(`/v1/projects/${pid()}/msp/export`, { projectId: pid(), replaceCalendar: true }).expect(200)).body,
    );
    expect(result.fileName).toBe('PRJ-1405-801_progress.xml');
    expect(result.exportedCount).toBe(1);
    const task4 = /<Task><UID>4<\/UID>[\s\S]*?<\/Task>/.exec(result.xml)?.[0] ?? '';
    expect(task4).toContain('<PercentComplete>40</PercentComplete>');
    expect(task4).toContain('<ActualStart>2026-10-01T08:00:00</ActualStart>');
    expect(task4).not.toContain('<ActualFinish>');
    expect(result.xml).toContain('<Name>تقویم پروژه‌یار</Name>');
    expect(result.xml).toContain('<WeekDays>');

    const storage = test.app.get(ObjectStorage);
    const {
      rows: [session],
    } = await test.owner.query<{ storage_key: string }>('select storage_key from msp_import_session where project_id = $1 order by created_at limit 1', [
      pid(),
    ]);
    expect((await storage.get(session?.storage_key as string))?.toString('utf8')).toBe(originalXml);
    const { rows: exported } = await test.owner.query<{ status: string; percent: string }>(
      'select status, percent::text from progress_export_item where project_id = $1',
      [pid()],
    );
    expect(exported).toEqual([{ status: 'exported', percent: '40.0000' }]);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string }>("select status from alert where project_id = $1 and rule_code = 'AL-INT-02'", [pid()]);
      return rows.every((row) => row.status === 'resolved');
    });
  });
});
