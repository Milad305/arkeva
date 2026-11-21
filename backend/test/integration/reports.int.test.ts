import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Jobs } from '../../src/platform/jobs/jobs.js';
import { ObjectStorage } from '../../src/platform/storage/object-storage.js';
import { REPORT_QUEUE } from '../../src/modules/reports/application/report-generation.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// F18 — گزارش‌های مدیریتی (management-reports.md؛ برش ۱۸الف): AC-MR-01، ۰۲، ۰۳، ۰۴، ۰۷، ۰۹، ۱۰ روی HTTP.
// ساختار و بودجهٔ مثال مرجع (00 ۶) با تاریخ داده ۱۴۰۵/۰۳/۳۱ (2026-06-21)؛ پیشرفت فقط از گزارش‌های همین آزمون.

type UserKey = 'pm' | 'planner' | 'finance' | 'client' | 'sup';
let test: TestApp;
let org: SeededOrg<UserKey, 'ref'>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.75.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const M = (millions: number) => (BigInt(millions) * 1_000_000n).toString();
const pid = () => org.projects.ref;
const id = (key: string) => plan.ids.get(key) as string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    del: (path: string) => agent.delete(path).set(auth),
  };
}

async function approved(leaf: string, workDate: string, quantity: number, photo = false): Promise<string> {
  const reportId = uuidv7();
  const itemId = uuidv7();
  const at = `${workDate}T10:00:00Z`;
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, $5, $6, $7, $7, $7)`,
    [reportId, org.orgId, pid(), org.users.sup.id, workDate, `FR-R-${reportId.slice(-8)}`, at],
  );
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 'quantity', $6, 'approved', $7, $7, $7)`,
    [itemId, org.orgId, pid(), reportId, id(leaf), quantity, at],
  );
  if (photo) await insertPhoto(reportId, itemId, workDate);
  return reportId;
}

async function insertPhoto(reportId: string, itemId: string | null, workDate: string): Promise<void> {
  await test.owner.query(
    `insert into field_photo (id, org_id, project_id, report_id, item_id, storage_key, sha256, taken_at, upload_status, created_at)
     values ($1, $2, $3, $4, $5, $6, 'x', $7, 'complete', $7)`,
    [uuidv7(), org.orgId, pid(), reportId, itemId, `org/${org.orgId}/project/${pid()}/photo/${uuidv7()}`, `${workDate}T10:00:00Z`],
  );
}

interface Section {
  key: string;
  empty: string | null;
  [field: string]: unknown;
}
interface Preview {
  includesAmounts: boolean;
  amountsHiddenByPermission: boolean;
  sourceKind: string;
  watermark: string;
  openPeriodNote: string | null;
  header: { projectName: string; orgName: string };
  sections: Section[];
}
interface Range {
  id: string;
  kind: string;
  closed: boolean;
  from: string;
}

const preview = async (user: UserKey, templateId: string, rangeId: string, scope: string = pid()) =>
  data<Preview>((await as(user).post(`/v1/projects/${scope}/reports/preview`, { templateId, rangeId, disabledSections: [] }).expect(200)).body);
const section = (view: Preview, key: string) => view.sections.find((entry) => entry.key === key) as Section;

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  org = await seedOrg(test.owner, {
    name: 'سازمان گزارش',
    users: {
      pm: { mobile: '09210100001', fullName: 'مریم احمدی' },
      planner: { mobile: '09210100002' },
      finance: { mobile: '09210100003' },
      client: { mobile: '09210100004' },
      sup: { mobile: '09210100005', fullName: 'سرپرست' },
    },
    projects: {
      ref: {
        code: 'PRJ-1405-901',
        name: 'ساختمان مثال مرجع',
        manager: 'pm',
        members: { pm: 'project_manager', planner: 'planner', finance: 'finance', client: 'client_reviewer', sup: 'supervisor' },
      },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    await client.query(`update project set planned_start = null, activated_at = '2026-03-25T05:00:00Z', costs_complete_through = '2026-06-21' where id = $1`, [
      pid(),
    ]);
  } finally {
    client.release();
  }
  await approved('l111', '2026-04-05', 300, true);
  await approved('l111', '2026-04-15', 200);
  await approved('l112', '2026-05-10', 120);
  await approved('l112', '2026-05-20', 60);
  for (const key of ['pm', 'planner', 'finance', 'client'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  // آیتم در انتظار با عکس: نباید در بخش عکس بیاید (AC-MR-09)
  const pendingReport = uuidv7();
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, '2026-04-06', 'FR-R-PENDING', now(), now(), now())`,
    [pendingReport, org.orgId, pid(), org.users.sup.id],
  );
  const pendingItem = uuidv7();
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, status, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 'quantity', 10, 'stage1', now(), now())`,
    [pendingItem, org.orgId, pid(), pendingReport, id('l111')],
  );
  await insertPhoto(pendingReport, pendingItem, '2026-04-06');
  for (const [key, amount] of [
    ['C1', 105],
    ['C2', 215],
    ['C3', 140],
    ['C4', 60],
  ] as const) {
    await as('finance')
      .post(`/v1/projects/${pid()}/cost-entries`, { cbsItemId: id(key), costDate: '2026-04-10', amount: M(amount), documentNo: key, post: true })
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

describe('F18 — کتابخانه و پیش‌نمایش', () => {
  it('قالب‌ها: ده قالب سیستمی و یازده بخش؛ قالب سفارشی با نام یکتا؛ بی reports.custom_template ۴۰۳', async () => {
    const list = data<{ items: { id: string; includesAmounts: boolean }[]; sections: unknown[] }>(
      (await as('pm').get('/v1/report-templates').expect(200)).body,
    );
    expect(list.items).toHaveLength(10);
    expect(list.sections).toHaveLength(11);
    expect(list.items.find((item) => item.id === 'rt-client-monthly')?.includesAmounts).toBe(false);
    const body = {
      name: 'گزارش هیئت‌مدیره',
      description: '',
      category: 'project',
      audience: 'internal',
      scope: 'project',
      sections: ['summary', 'risks'],
      formats: ['pdf'],
    };
    const created = data<{ id: string; isSystem: boolean }>((await as('pm').post('/v1/report-templates', body).expect(201)).body);
    expect(created.isSystem).toBe(false);
    expect((await as('pm').post('/v1/report-templates', body)).status).toBe(409);
    expect((await as('client').post('/v1/report-templates', { ...body, name: 'دیگر' })).status).toBe(403);
  });

  it('AC-MR-02، AC-MR-03 — مبلغ فقط با cbs.view_amounts؛ قالب کارفرما هیچ‌وقت', async () => {
    const withAmounts = await preview('pm', 'rt-weekly', 'last_week');
    expect(withAmounts.includesAmounts).toBe(true);
    const {
      rows: [stored],
    } = await test.owner.query<{ ev: string; actual: string; planned: string }>(
      'select ev::text, actual_percent::text as actual, planned_percent::text as planned from project_progress where project_id = $1',
      [pid()],
    );
    expect(section(withAmounts, 'cost')).toMatchObject({ bac: M(1000), ac: M(520), ev: stored?.ev });
    const summary = section(withAmounts, 'summary');
    const faPct = (value: string) =>
      `${String(Math.round(Number(value) * 10) / 10)
        .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)
        .replace('.', '٫')}٪`;
    expect(summary['text']).toContain(faPct(stored?.actual ?? '0'));
    expect(summary['text']).toContain(faPct(stored?.planned ?? '0'));
    const hidden = await preview('client', 'rt-weekly', 'last_week');
    expect(hidden).toMatchObject({ includesAmounts: false, amountsHiddenByPermission: true });
    expect(section(hidden, 'cost')).toMatchObject({ bac: '0', ac: '0' });
    expect(section(hidden, 'cost').empty).not.toBeNull();
    const clientTemplate = await preview('pm', 'rt-client-monthly', 'last_week');
    expect(clientTemplate.includesAmounts).toBe(false);
    expect(JSON.stringify(clientTemplate)).not.toContain(M(1000));
  });

  it('AC-MR-07، AC-MR-09 — بازهٔ باز واترمارک و برچسب دارد؛ عکس فقط از آیتم تأییدشده', async () => {
    const ranges = data<Range[]>((await as('pm').get(`/v1/report-templates/ranges?projectId=${pid()}`).expect(200)).body);
    expect(ranges[0]).toMatchObject({ id: 'last_week', closed: false });
    const farvardin = ranges.find((range) => range.from === '2026-03-21') as Range;
    expect(farvardin).toMatchObject({ kind: 'period', closed: false });
    const open = await preview('pm', 'rt-weekly', farvardin.id);
    expect(open).toMatchObject({ sourceKind: 'live', watermark: 'open_period', openPeriodNote: 'دورهٔ باز؛ اعداد ممکن است تغییر کنند.' });
    const photos = section(open, 'photos')['items'] as { code: string; takenAt: string }[];
    expect(photos.map((photo) => photo.takenAt)).toEqual(['2026-04-05']);
    expect(Object.keys(photos[0] as object)).not.toContain('storageKey');
  });

  it('پرتفوی سطح سازمان با «org»', async () => {
    const view = await preview('pm', 'rt-portfolio', 'last_week', 'org');
    const rows = section(view, 'portfolio')['rows'] as { code: string; actualPercent: number }[];
    expect(rows).toHaveLength(1);
    const {
      rows: [stored],
    } = await test.owner.query<{ actual: string }>('select actual_percent::text as actual from project_progress where project_id = $1', [pid()]);
    expect(rows[0]?.actualPercent).toBeCloseTo(Number(stored?.actual), 4);
    expect(view.header.projectName).toBe('همهٔ پروژه‌های فعال');
  });
});

describe('F18 — تولید فایل', () => {
  it('AC-MR-01 — دورهٔ بسته از PeriodSnapshot؛ تأیید دیرهنگام اعداد گزارش را عوض نمی‌کند؛ اجرای دوباره همان فایل', async () => {
    const ranges = data<Range[]>((await as('pm').get(`/v1/report-templates/ranges?projectId=${pid()}`).expect(200)).body);
    const farvardin = ranges.find((range) => range.from === '2026-03-21') as Range;
    await as('planner')
      .post(`/v1/projects/${pid()}/periods/${farvardin.id.slice('period:'.length)}/close`)
      .expect(200);
    const before = await preview('pm', 'rt-weekly', farvardin.id);
    expect(before).toMatchObject({ sourceKind: 'period_snapshot', watermark: 'none', openPeriodNote: null });
    const actualBefore = (section(before, 'summary')['kpis'] as { value: string }[])[0]?.value;
    const first = data<{ id: string; status: string; sourceKind: string }>(
      (await as('pm').post(`/v1/projects/${pid()}/reports`, { templateId: 'rt-financial', rangeId: farvardin.id, format: 'xlsx' }).expect(201)).body,
    );
    expect(first).toMatchObject({ status: 'queued', sourceKind: 'period_snapshot' });
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string }>('select status from generated_report where id = $1', [first.id]);
      return rows[0]?.status === 'done';
    });
    // تأیید دیرهنگام در دورهٔ بسته
    await approved('l112', '2026-04-18', 100);
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ n: number }>(
        "select count(*)::int as n from compute_run where project_id = $1 and status in ('queued', 'running')",
        [pid()],
      );
      return rows[0]?.n === 0;
    });
    const after = await preview('pm', 'rt-weekly', farvardin.id);
    expect((section(after, 'summary')['kpis'] as { value: string }[])[0]?.value).toBe(actualBefore);
    const again = data<{ id: string; status: string }>(
      (await as('pm').post(`/v1/projects/${pid()}/reports`, { templateId: 'rt-financial', rangeId: farvardin.id, format: 'xlsx' }).expect(201)).body,
    );
    expect(again.status).toBe('done');
    const { rows: keys } = await test.owner.query<{ storage_key: string }>('select storage_key from generated_report where id = any($1)', [
      [first.id, again.id],
    ]);
    expect(new Set(keys.map((row) => row.storage_key)).size).toBe(1);
    const xls = (await test.app.get(ObjectStorage).get(keys[0]?.storage_key as string))?.toString('utf8') ?? '';
    expect(xls).toContain('<Workbook');
    expect(xls).toContain('<Data ss:Type="Number">1000000000</Data>');
  });

  it('AC-MR-04 — PDF با Chromium؛ HTML راست‌به‌چپ با Vazirmatn، ارقام فارسی و منحنی S برداری؛ NT-RPT-01 و دانلود امضاشده', async () => {
    const created = data<{ id: string }>(
      (await as('pm').post(`/v1/projects/${pid()}/reports`, { templateId: 'rt-exec', rangeId: 'last_week', format: 'pdf' }).expect(201)).body,
    );
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string }>('select status from generated_report where id = $1', [created.id]);
      return rows[0]?.status === 'done';
    }, 60_000);
    const {
      rows: [row],
    } = await test.owner.query<{ storage_key: string; page_count: number; size_bytes: number }>(
      'select storage_key, page_count, size_bytes from generated_report where id = $1',
      [created.id],
    );
    const pdf = await test.app.get(ObjectStorage).get(row?.storage_key as string);
    expect(pdf?.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(row?.page_count).toBeGreaterThanOrEqual(1);
    const link = data<{ url: string; fileName: string }>((await as('pm').get(`/v1/reports/${created.id}/download`).expect(200)).body);
    expect(link.fileName).toBe('خلاصهٔ مدیریتی - ' + link.fileName.split(' - ')[1]);
    expect(link.url).toContain('token=');
    const { rows: notices } = await test.owner.query<{ title: string }>("select title from notification where code = 'NT-RPT-01' and user_id = $1", [
      org.users.pm.id,
    ]);
    expect(notices.some((notice) => notice.title.includes('خلاصهٔ مدیریتی'))).toBe(true);
    const list = data<{ id: string; sizeLabel: string | null; requestedByName: string }[]>((await as('pm').get('/v1/reports').expect(200)).body);
    expect(list.find((entry) => entry.id === created.id)).toMatchObject({ requestedByName: 'مریم احمدی' });
  }, 90_000);

  it('AC-MR-10 — شکست تولید پس از ۳ تلاش failed و اعلان به درخواست‌کننده', async () => {
    const reportId = uuidv7();
    await test.owner.query(
      `insert into generated_report (id, org_id, project_id, template_id, template_name, scope_label, range_id, range_label, range_from, range_to, format, source_kind,
        includes_amounts, watermark, status, requested_by_user_id, created_at)
       values ($1, $2, $3, 'rt-missing', 'قالب گمشده', 'پروژه', 'last_week', 'هفته', '2026-06-06', '2026-06-12', 'xlsx', 'live', false, 'open_period', 'queued', $4, now())`,
      [reportId, org.orgId, pid(), org.users.planner.id],
    );
    await test.app.get(Jobs).send(null, REPORT_QUEUE, { orgId: org.orgId, reportId });
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ status: string; attempts: number }>('select status, attempts from generated_report where id = $1', [reportId]);
      return rows[0]?.status === 'failed' && rows[0]?.attempts === 3;
    }, 40_000);
    const { rows } = await test.owner.query<{ title: string }>("select title from notification where code = 'NT-RPT-01' and user_id = $1", [
      org.users.planner.id,
    ]);
    expect(rows.some((notice) => notice.title.includes('ناموفق'))).toBe(true);
  }, 60_000);

  it('۷.۵ — حذف خروجی فقط سازنده یا مدیر پروژه؛ بی reports.generate ۴۰۳', async () => {
    const created = data<{ id: string }>(
      (await as('planner').post(`/v1/projects/${pid()}/reports`, { templateId: 'rt-supervisors', rangeId: 'last_week', format: 'xlsx' }).expect(201)).body,
    );
    expect((await as('client').del(`/v1/reports/${created.id}`)).status).toBe(403);
    await as('pm').del(`/v1/reports/${created.id}`).expect(200);
    expect((await as('pm').get(`/v1/reports/${created.id}/download`)).status).toBe(404);
  });
});
