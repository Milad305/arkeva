import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fromJalali, jalaliYear } from '../../src/platform/time/jalali.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { referenceTemplate } from '../fixtures/templates.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// F16 — قالب‌ها (templates.md): AC-TP-01..09 روی HTTP — ورود از فایل، انتشار، ویزارد، ساخت پروژه، ذخیره از پروژه.

type UserKey = 'admin' | 'pm' | 'reviewer';
let test: TestApp;
let org: SeededOrg<UserKey, 'host'>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.61.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const M = 1_000_000n;

function api(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    put: (path: string, body: object) => agent.put(path).set(auth).send(body),
    patch: (path: string, body: object) => agent.patch(path).set(auth).send(body),
    del: (path: string) => agent.delete(path).set(auth),
    upload: (path: string, fields: Record<string, string>, files: Record<string, string>) => {
      let request = agent.post(path).set(auth);
      for (const [key, value] of Object.entries(fields)) request = request.field(key, value);
      for (const [key, value] of Object.entries(files)) request = request.attach(key, Buffer.from(value, 'utf8'), `${key}.csv`);
      return request;
    },
  };
}

const data = <T>(body: unknown): T => (body as { data: T }).data;
const iso = (year: number, month: number, day: number): string => fromJalali(year, month, day) ?? '';
const year = (): number => jalaliYear(test.clock.now().toISOString().slice(0, 10));

const WBS_CSV = [
  'کد,عنوان,وزن,واحد,روش,نقطهٔ عطف,شروع نسبی,مدت نسبی,اقلام CBS,ضریب تقسیم',
  '1,فونداسیون,40,,,,0,65,,',
  '1.1,خاکبرداری,30,مترمکعب,مقداری,,0,26,C1,1',
  '1.2,بتن‌ریزی فونداسیون,70,مترمکعب,مقداری,,26,39,"C2,C3","4,1"',
  '2,اسکلت,60,,,,52,104,,',
  '2.1,ستون‌ها,50,,درصدی,,52,52,"C2,C3,C4","1,1,3"',
  '2.2,سقف,50,,درصدی,,104,52,"C2,C3,C4","3,1,1"',
].join('\n');
const CBS_CSV = [
  'کد,عنوان,نوع هزینه,واحد,سهم بودجه',
  'C1,خاکبرداری (پیمانکار جزء),پیمانکار جزء,,10',
  'C2,بتن آماده,مصالح,مترمکعب,40',
  'C3,آرماتور,مصالح,تن,30',
  'C4,نیروی انسانی اسکلت,نیروی انسانی,,20',
].join('\n');

interface Detail {
  id: string;
  status: string;
  version: number | null;
  hasUnpublishedDraft: boolean;
  versions: { version: number; note: string }[];
  usedInProjectNames: string[];
  referenceDurationWd: number;
  areas: { name: string; rootTitles: string[] }[];
  originNote: string | null;
  isDefaultForType: boolean;
}
interface WizardCard {
  id: string;
  version: string;
  wbsCount: number;
  recommended: boolean;
}

let templateId = '';
let projectId = '';

const wizardCards = async () => data<WizardCard[]>((await api('admin').get('/v1/projects/drafts/templates?projectTypeId=residential').expect(200)).body);

async function createProject(code: string, chosen: string) {
  const body = {
    step: 4,
    basic: { name: `پروژهٔ قالبی ${code}`, code, clientName: 'کارفرما', projectTypeId: 'residential', location: 'تهران', imageName: null },
    schedule: {
      plannedStart: iso(1405, 1, 15),
      plannedFinish: iso(1405, 6, 30),
      calendarPresetId: 'cal-site6',
      currency: 'rial',
      plannedTotalBudget: (1250n * M).toString(),
      contingencyPct: 20,
      milestones: [],
    },
    team: { managerUserId: org.users.pm.id, managerDisplay: { fullName: 'pm', avatarTone: 'a1', contact: '09161000002' }, members: [] },
    structure: { mode: 'template', templateId: chosen },
    sendInvites: false,
  };
  const draft = data<{ id: string }>((await api('admin').post('/v1/projects/drafts', body).expect(201)).body);
  return api('admin').post(`/v1/projects/drafts/${draft.id}/create`);
}

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان قالب',
    users: { admin: { mobile: '09161000001', orgAdmin: true }, pm: { mobile: '09161000002' }, reviewer: { mobile: '09161000003' } },
    projects: { host: { code: 'PRJ-1405-901', manager: 'pm', members: { pm: 'project_manager', reviewer: 'reviewer' } } },
  });
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F16 — کتابخانهٔ قالب‌ها', () => {
  it('F16 ۵.۱ — ورود از دو CSV: پیش‌نمایش بی ساخت، commit قالب پیش‌نویس؛ نام تکراری ۴۰۹؛ بی templates.manage ۴۰۳', async () => {
    const fields = { name: 'مثال مرجع', projectTypeId: 'residential', referenceDurationWd: '156' };
    const preview = data<{
      templateId: string | null;
      wbsCount: number;
      cbsCount: number;
      linkCount: number;
      cbsShareSum: number;
      issues: { severity: string }[];
    }>((await api('admin').upload('/v1/templates/import?commit=false', fields, { wbs: WBS_CSV, cbs: CBS_CSV }).expect(200)).body);
    expect(preview).toMatchObject({ templateId: null, wbsCount: 6, cbsCount: 4, linkCount: 9, cbsShareSum: 100 });
    expect(preview.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(data<{ items: unknown[] }>((await api('admin').get('/v1/templates').expect(200)).body).items).toHaveLength(0);

    const committed = data<{ templateId: string }>(
      (await api('admin').upload('/v1/templates/import?commit=true', fields, { wbs: WBS_CSV, cbs: CBS_CSV }).expect(200)).body,
    );
    templateId = committed.templateId;
    const detail = data<Detail>((await api('admin').get(`/v1/templates/${templateId}`).expect(200)).body);
    expect(detail).toMatchObject({
      status: 'draft',
      version: null,
      hasUnpublishedDraft: true,
      referenceDurationWd: 156,
      originNote: 'وارد‌شده از فایل wbs.csv',
    });

    const taken = await api('admin').upload('/v1/templates/import?commit=true', fields, { wbs: WBS_CSV });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'TEMPLATE_NAME_TAKEN' });
    await api('pm')
      .upload('/v1/templates/import?commit=true', { ...fields, name: 'دیگر' }, { wbs: WBS_CSV })
      .expect(403);
    // پیش‌نویس در ویزارد دیده نمی‌شود (۵.۴)
    expect(await wizardCards()).toEqual([]);
  });

  it('AC-TP-03 — جمع وزن ۱۰۰ نباشد انتشار ۴۲۲ و قالب پیش‌نویس می‌ماند', async () => {
    const broken = referenceTemplate();
    (broken.wbs[1] as { weightInParent: number }).weightInParent = 25;
    await api('admin').put(`/v1/templates/${templateId}/draft`, { content: broken }).expect(200);
    const report = data<{ canPublish: boolean; weightsOk: boolean; errors: { rule: string }[] }>(
      (await api('admin').post(`/v1/templates/${templateId}/validate`).expect(200)).body,
    );
    expect(report).toMatchObject({ canPublish: false, weightsOk: false });
    expect(report.errors.map((issue) => issue.rule)).toEqual(['WEIGHT_SUM']);
    const rejected = await api('admin').post(`/v1/templates/${templateId}/publish`, { note: 'نسخهٔ اول' });
    expect(rejected.status).toBe(422);
    expect(rejected.body).toMatchObject({ code: 'TEMPLATE_INVALID' });
    expect(data<Detail>((await api('admin').get(`/v1/templates/${templateId}`).expect(200)).body).status).toBe('draft');
  });

  it('AC-TP-01، AC-TP-04 — پیش‌نمایش: BAC برگ‌ها ۱۰۰/۳۰۰/۳۰۰/۳۰۰؛ ضریب ۰٫۵؛ همه درون بازه', async () => {
    const content = referenceTemplate();
    content.settings = { ...content.settings, approvalMode: 'single_stage', warningThreshold: 7 };
    await api('admin').put(`/v1/templates/${templateId}/draft`, { content }).expect(200);
    await api('pm').put(`/v1/templates/${templateId}/draft`, { content }).expect(403);
    interface Node {
      title: string;
      previewBac: string;
      previewStartWd: number;
      previewFinishWd: number;
      children?: Node[];
    }
    const preview = data<{ wbs: Node[]; cbsTotal: string; wbsTotal: string; scaleFactor: number; projectWorkdays: number }>(
      (
        await api('pm')
          .get(`/v1/templates/${templateId}/preview?cbsBudget=${1000n * M}&workdays=78`)
          .expect(200)
      ).body,
    );
    expect(preview).toMatchObject({ cbsTotal: (1000n * M).toString(), wbsTotal: (1000n * M).toString(), scaleFactor: 0.5, projectWorkdays: 78 });
    const leaves = preview.wbs.flatMap((group) => group.children ?? []);
    expect(leaves.map((leaf) => BigInt(leaf.previewBac) / M)).toEqual([100n, 300n, 300n, 300n]);
    for (const leaf of leaves) {
      expect(leaf.previewStartWd).toBeGreaterThanOrEqual(1);
      expect(leaf.previewFinishWd).toBeLessThanOrEqual(78);
    }
  });

  it('F16 ۵.۴ — انتشار نسخهٔ ۱؛ پیش‌فرض نوع؛ ویزارد آن را پیشنهادی نشان می‌دهد', async () => {
    const published = data<Detail>((await api('admin').post(`/v1/templates/${templateId}/publish`, { note: 'نسخهٔ اول' }).expect(200)).body);
    expect(published).toMatchObject({ status: 'published', version: 1, hasUnpublishedDraft: false, versions: [{ version: 1, note: 'نسخهٔ اول' }] });
    expect(published.areas).toEqual([{ key: 'a1', name: 'همه', rootTitles: ['فونداسیون', 'اسکلت'] }]);
    await api('admin').patch(`/v1/templates/${templateId}`, { isDefaultForType: true }).expect(200);
    const list = data<{ items: { id: string; isDefaultForType: boolean; version: number }[]; typeCounts: { projectTypeId: string; count: number }[] }>(
      (await api('pm').get('/v1/templates?type=residential').expect(200)).body,
    );
    expect(list.items).toEqual([expect.objectContaining({ id: templateId, isDefaultForType: true, version: 1 })]);
    expect(list.typeCounts).toEqual([expect.objectContaining({ projectTypeId: 'residential', count: 1 })]);
    expect(await wizardCards()).toEqual([expect.objectContaining({ id: templateId, version: 'نسخهٔ ۱', wbsCount: 6, recommended: true })]);
  });

  it('AC-TP-01، AC-TP-04، AC-TP-09 — ساخت پروژه از قالب: BAC، تاریخ درون بازه، تنظیمات، حوزهٔ بی ناظر و AL-STR-06', async () => {
    const response = await createProject(`PRJ-${year()}-071`, templateId);
    expect(response.status).toBe(201);
    projectId = data<{ projectId: string }>(response.body).projectId;

    const {
      rows: [project],
    } = await test.owner.query<Record<string, unknown>>('select * from project where id = $1', [projectId]);
    expect(project).toMatchObject({ template_id: templateId, template_version: 1, contingency_reserve: (250n * M).toString() });
    const { rows: versions } = await test.owner.query('select kind, status, source from plan_version where project_id = $1', [projectId]);
    expect(versions).toEqual([{ kind: 'baseline', status: 'draft', source: 'template' }]);

    // AC-TP-01: بودجهٔ CBS = ۱٬۲۵۰ − ۲۵۰ = ۱٬۰۰۰ میلیون ← BAC برگ‌ها ۱۰۰/۳۰۰/۳۰۰/۳۰۰
    const { rows: bac } = await test.owner.query<{ title: string; bac: string }>(
      `select w.title, sum(l.allocated_amount)::text as bac from wbs_cbs_link l join wbs_item w on w.id = l.wbs_item_id
        where w.project_id = $1 group by w.title, w.code order by w.code`,
      [projectId],
    );
    expect(bac.map((row) => BigInt(row.bac) / M)).toEqual([100n, 300n, 300n, 300n]);
    const { rows: cbs } = await test.owner.query<{ pricing_mode: string; lump_sum_amount: string }>(
      'select pricing_mode, lump_sum_amount from cbs_item where project_id = $1 order by code',
      [projectId],
    );
    expect(cbs.map((row) => [row.pricing_mode, BigInt(row.lump_sum_amount) / M])).toEqual([
      ['lump_sum', 100n],
      ['lump_sum', 400n],
      ['lump_sum', 300n],
      ['lump_sum', 200n],
    ]);

    // AC-TP-04: هیچ آیتمی بیرون از بازهٔ پروژه نیست؛ سرپرست و مقدار کل ندارد
    const { rows: items } = await test.owner.query<{
      code: string;
      planned_start: string;
      planned_finish: string;
      supervisor_user_id: string | null;
      total_quantity: string | null;
    }>(`select code, planned_start::text, planned_finish::text, supervisor_user_id, total_quantity::text from wbs_item where project_id = $1 order by code`, [
      projectId,
    ]);
    expect(items.map((item) => item.code)).toEqual(['1.1', '1.1.1', '1.1.2', '1.2', '1.2.1', '1.2.2']);
    for (const item of items) {
      expect(item.planned_start >= iso(1405, 1, 15) && item.planned_finish <= iso(1405, 6, 30)).toBe(true);
      expect(item.planned_start <= item.planned_finish).toBe(true);
      expect(item).toMatchObject({ supervisor_user_id: null, total_quantity: null });
    }
    expect(items[0]?.planned_start).toBe(iso(1405, 1, 15));

    // ۵.۵: تنظیمات همراه قالب، جایگزین تأیید از ویزارد
    const {
      rows: [settings],
    } = await test.owner.query<Record<string, unknown>>('select * from project_settings where project_id = $1', [projectId]);
    expect(settings).toMatchObject({ approval_mode: 'single_stage', warning_threshold: '7.0000', alternate_reviewer_user_id: org.users.pm.id });

    // AC-TP-09: حوزه بی ناظر و AL-STR-06 در فهرست فعال‌سازی
    const { rows: routes } = await test.owner.query<{ area_name: string; reviewer_user_id: string | null; root_item_ids: string[] }>(
      'select area_name, reviewer_user_id, root_item_ids from approval_route where project_id = $1',
      [projectId],
    );
    expect(routes.map((route) => [route.area_name, route.reviewer_user_id])).toEqual([['همه', null]]);
    expect(routes[0]?.root_item_ids).toHaveLength(2);
    const check = data<{ blockers: { code: string; passed: boolean }[]; warnings: { code: string; passed: boolean }[] }>(
      (await api('pm').get(`/v1/projects/${projectId}/activation-check`).expect(200)).body,
    );
    expect([...check.blockers, ...check.warnings].find((item) => item.code === 'AL-STR-06')).toMatchObject({ passed: false });
  });

  it('AC-TP-06، AC-TP-05 — پیش‌نویس نسخهٔ بعد: ویزارد تا انتشار نسخهٔ ۱ را می‌دهد؛ انتشار روی پروژهٔ ساخته‌شده اثری ندارد', async () => {
    const next = referenceTemplate();
    next.wbs.push({ ...(next.wbs[5] as (typeof next.wbs)[number]), key: 'l123', code: '1.2.3', title: 'دیوارچینی', sortOrder: 3, weightInParent: 0 });
    await api('admin').put(`/v1/templates/${templateId}/draft`, { content: next }).expect(200);
    expect(data<Detail>((await api('admin').get(`/v1/templates/${templateId}`).expect(200)).body)).toMatchObject({
      status: 'published',
      version: 1,
      hasUnpublishedDraft: true,
    });
    expect(await wizardCards()).toEqual([expect.objectContaining({ version: 'نسخهٔ ۱', wbsCount: 6 })]);

    const v2 = data<Detail>((await api('admin').post(`/v1/templates/${templateId}/publish`, { note: 'افزودن دیوارچینی' }).expect(200)).body);
    expect(v2.versions.map((version) => version.version)).toEqual([2, 1]);
    expect(await wizardCards()).toEqual([expect.objectContaining({ version: 'نسخهٔ ۲', wbsCount: 7 })]);

    const {
      rows: [count],
    } = await test.owner.query<{ n: number }>('select count(*)::int as n from wbs_item where project_id = $1', [projectId]);
    expect(count?.n).toBe(6);
    const {
      rows: [project],
    } = await test.owner.query<{ template_version: number }>('select template_version from project where id = $1', [projectId]);
    expect(project?.template_version).toBe(1);
    expect(data<Detail>((await api('admin').get(`/v1/templates/${templateId}`).expect(200)).body).usedInProjectNames).toEqual([
      `پروژهٔ قالبی PRJ-${year()}-071`,
    ]);
  });

  it('AC-TP-07 — ذخیره به‌عنوان قالب: بی سرپرست، مقدار کل و تاریخ مطلق؛ سهم و ضریب از مبالغ', async () => {
    await test.owner.query(`update wbs_item set supervisor_user_id = $2, total_quantity = 120 where project_id = $1 and code = '1.1.1'`, [
      projectId,
      org.users.reviewer.id,
    ]);
    await api('reviewer').post('/v1/templates/from-project', { projectId, name: 'از پروژه' }).expect(403);
    const saved = data<Detail>((await api('admin').post('/v1/templates/from-project', { projectId, name: 'از پروژهٔ قالبی' }).expect(201)).body);
    expect(saved).toMatchObject({ status: 'draft', version: null, hasUnpublishedDraft: true, originNote: `ساخته‌شده از پروژهٔ پروژهٔ قالبی PRJ-${year()}-071` });
    expect(saved.areas).toEqual([{ key: 'a1', name: 'همه', rootTitles: ['فونداسیون', 'اسکلت'] }]);

    const {
      rows: [row],
    } = await test.owner.query<{ draft_content: Record<string, unknown> }>('select draft_content from template where id = $1', [saved.id]);
    const text = JSON.stringify(row?.draft_content);
    for (const forbidden of ['supervisorUserId', 'totalQuantity', 'plannedStart', 'plannedFinish', org.users.reviewer.id, iso(1405, 1, 15)])
      expect(text).not.toContain(forbidden);
    const content = row?.draft_content as unknown as ReturnType<typeof referenceTemplate>;
    expect(content.cbs.map((item) => item.sharePct)).toEqual([10, 40, 30, 20]);
    const partsOf = (cbsCode: string) =>
      content.links.filter((link) => link.cbsKey === content.cbs.find((item) => item.code === cbsCode)?.key).map((link) => link.parts);
    expect(partsOf('C2')).toEqual([4, 1, 3]);
    expect(partsOf('C4')).toEqual([3, 1]);
    expect(content.wbs.map((item) => item.weightInParent)).toEqual([40, 30, 70, 60, 50, 50]);

    const validation = data<{ canPublish: boolean }>((await api('admin').post(`/v1/templates/${saved.id}/validate`).expect(200)).body);
    expect(validation.canPublish).toBe(true);
    // پیش‌نمایش با همان مدت و بودجه همان BAC را بازمی‌سازد
    const preview = data<{ wbs: { children?: { previewBac: string }[] }[] }>(
      (
        await api('admin')
          .get(`/v1/templates/${saved.id}/preview?cbsBudget=${1000n * M}&workdays=${saved.referenceDurationWd}`)
          .expect(200)
      ).body,
    );
    expect(preview.wbs.flatMap((group) => group.children ?? []).map((leaf) => BigInt(leaf.previewBac) / M)).toEqual([100n, 300n, 300n, 300n]);
    await api('admin').del(`/v1/templates/${saved.id}`).expect(200);
    await api('admin').get(`/v1/templates/${saved.id}`).expect(404);
  });

  it('AC-TP-08 — بایگانی: نه در ویزارد، نه ساخت؛ پروژهٔ قبلی سالم؛ حذف قالب استفاده‌شده ۴۰۹', async () => {
    const archived = data<Detail>((await api('admin').post(`/v1/templates/${templateId}/archive`).expect(200)).body);
    expect(archived).toMatchObject({ status: 'archived', isDefaultForType: false });
    expect(await wizardCards()).toEqual([]);
    const blocked = await createProject(`PRJ-${year()}-072`, templateId);
    expect(blocked.status).toBe(422);
    expect(blocked.body).toMatchObject({ code: 'TEMPLATE_INVALID' });
    const {
      rows: [project],
    } = await test.owner.query<{ status: string; template_id: string }>('select status, template_id from project where id = $1', [projectId]);
    expect(project).toMatchObject({ status: 'draft', template_id: templateId });

    expect((await api('admin').get('/v1/templates').expect(200)).body).toMatchObject({ data: { items: [], archivedCount: 1 } });
    expect(data<{ items: unknown[] }>((await api('admin').get('/v1/templates?status=all').expect(200)).body).items).toHaveLength(1);
    const used = await api('admin').del(`/v1/templates/${templateId}`);
    expect(used.status).toBe(409);
    expect(used.body).toMatchObject({ code: 'TEMPLATE_STATE_CONFLICT' });
    expect(data<Detail>((await api('admin').del(`/v1/templates/${templateId}/archive`).expect(200)).body).status).toBe('published');
  });
});
