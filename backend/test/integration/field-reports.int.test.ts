import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Escalation } from '../../src/modules/approvals/application/escalation.js';
import { type AppReportInput, FieldIntake } from '../../src/modules/field/index.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { newId } from '../../src/platform/database/ids.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { tehranClock } from '../../src/platform/scheduler/ticks.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۷ — گزارش کارگاه و تأیید (F09 + دادهٔ F08؛ AC-AP-02، ۰۳، ۰۵، ۰۶، ۰۷، ۰۸، ۰۹، ۱۰، ۱۱). گزارش اپ از FieldIntake (API
// همگام‌سازی با مرحلهٔ ۴؛ تصمیم کاربر 1405/08/23). AC-AP-01 و AC-AP-04 در evaluate.test.ts و progress.test.ts.

type UserKey = 'pm' | 'planner' | 'reviewer' | 'reviewer2' | 'sup';
type ProjectKey = 'live' | 'paused';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.84.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = (project: ProjectKey) => org.projects[project];
const SITE = { lat: 35.7, lng: 51.4 };
const leafIds: Record<string, string> = {};
let today: string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
  };
}

/** کار سرویس درون زمینهٔ سازمان (همان کاری که API همگام‌سازی اپ خواهد کرد). */
function inOrg<T>(work: () => Promise<T>): Promise<T> {
  const orm = test.app.get(MikroORM);
  const cls = test.app.get(ClsService);
  const context = test.app.get(AppContext);
  return cls.run(() => {
    context.setJobScope({ orgId: org.orgId, traceId: 'ERR-FR07-01' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return work();
    });
  });
}

interface ItemView {
  id: string;
  status: string;
  currentStage: number | null;
  deltaPercent: number;
  computedPercent: number;
  flags: string[];
  autoApproved: boolean;
  revisionCount: number;
  supersedesItemId: string | null;
  heldBy: { id: string } | null;
  reviews: { decision: string | null; assignee: { id: string } | null; escalatedTo: { id: string } | null }[];
  can: { decide: boolean; revokeAuto: boolean; correct: boolean; resolve: boolean };
}
interface ReportView {
  id: string;
  reportNo: string;
  items: ItemView[];
}
interface Inbox {
  reports: { id: string; counts: Record<string, number>; flagged: boolean }[];
  tabCounts: Record<string, number>;
  kpis: { pendingItems: number };
}

let reportSeq = 0;
function appReport(
  items: { leaf: string; percent?: number; quantity?: number; steps?: Record<string, number> }[],
  extra: Partial<AppReportInput> = {},
): AppReportInput {
  reportSeq += 1;
  const reportItems = items.map((entry) => ({
    id: newId(),
    wbsItemId: leafIds[entry.leaf] as string,
    values: { reportedPercent: entry.percent ?? null, quantityToday: entry.quantity ?? null, steps: entry.steps ?? null },
  }));
  return {
    id: newId(),
    projectId: pid('live'),
    authorUserId: org.users.sup.id,
    workDate: today,
    deviceRecordedAt: new Date(test.clock.now().getTime() - 60_000 * reportSeq),
    gps: { ...SITE, accuracyM: 8 },
    items: reportItems,
    photos: reportItems.flatMap((item) =>
      [0, 1].map(() => ({ id: newId(), itemId: item.id, sha256: 'x'.repeat(64), takenAt: test.clock.now(), uploaded: true })),
    ),
    ...extra,
  };
}

const receive = (input: AppReportInput) => inOrg(() => test.app.get(FieldIntake).receive(input));
const reportOf = async (reportId: string, user: UserKey = 'pm') =>
  data<ReportView>(
    (
      await as(user)
        .get(`/v1/projects/${pid('live')}/field-reports/${reportId}`)
        .expect(200)
    ).body,
  );
const decide = (user: UserKey, itemId: string, body: object) => as(user).post(`/v1/projects/${pid('live')}/field-items/${itemId}/decision`, body);
const inbox = async (user: UserKey, query = 'tab=pending') => data<Inbox>((await as(user).get(`/v1/inbox/field-items?${query}`).expect(200)).body);
const signInAll = async () => {
  for (const key of ['pm', 'planner', 'reviewer', 'reviewer2'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
};

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', planner: 'planner', reviewer: 'reviewer', reviewer2: 'reviewer', sup: 'supervisor' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان گزارش',
    users: {
      pm: { mobile: '09165000001' },
      planner: { mobile: '09165000002' },
      reviewer: { mobile: '09165000003' },
      reviewer2: { mobile: '09165000004' },
      sup: { mobile: '09165000005' },
    },
    projects: {
      live: { code: 'PRJ-1405-901', manager: 'pm', members: team },
      paused: { code: 'PRJ-1405-902', status: 'paused', manager: 'pm', members: team },
    },
  });
  today = tehranClock(test.clock.now()).date;
  const start = new Date(Date.parse(`${today}T00:00:00Z`) - 20 * 86_400_000).toISOString().slice(0, 10);
  const finish = new Date(Date.parse(`${today}T00:00:00Z`) + 20 * 86_400_000).toISOString().slice(0, 10);
  await test.owner.query(`update project set planned_start = $1, planned_finish = $2, site_lat = $3, site_lng = $4 where id = any($5)`, [
    start,
    finish,
    SITE.lat,
    SITE.lng,
    Object.values(org.projects),
  ]);
  for (const project of Object.values(org.projects)) {
    await test.owner.query(
      `insert into project_settings (project_id, org_id, alternate_reviewer_user_id, created_at, updated_at) values ($1, $2, $3, now(), now())
       on conflict (project_id) do update set alternate_reviewer_user_id = excluded.alternate_reviewer_user_id`,
      [project, org.orgId, org.users.pm.id],
    );
  }
  await signInAll();

  // ساختار: یک گروه و پنج برگ، اعمال، تخصیص به سرپرست، حوزهٔ تأیید به ناظر
  const leaf = (title: string, extra: object = {}) => ({
    title,
    weightInParent: 20,
    plannedStart: start,
    plannedFinish: finish,
    measurementMethod: 'percent',
    ...extra,
  });
  const saved = await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/wbs/ops`, {
      draftRevision: 0,
      ops: [
        { type: 'add', tempId: 'g', parentId: null, afterId: null, fields: { title: 'اسکلت', weightInParent: 100 } },
        { type: 'add', tempId: 'P', parentId: 'g', afterId: null, fields: leaf('ستون‌ها') },
        { type: 'add', tempId: 'Q', parentId: 'g', afterId: 'P', fields: leaf('بتن‌ریزی', { measurementMethod: 'quantity', unit: 'm3', totalQuantity: 1000 }) },
        { type: 'add', tempId: 'S', parentId: 'g', afterId: 'Q', fields: leaf('سقف') },
        { type: 'add', tempId: 'T', parentId: 'g', afterId: 'S', fields: leaf('دیوار') },
        { type: 'add', tempId: 'U', parentId: 'g', afterId: 'T', fields: leaf('نما') },
      ],
    })
    .expect(200);
  Object.assign(leafIds, data<{ idMap: Record<string, string> }>(saved.body).idMap);
  await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: 1, note: 'ساختار' })
    .expect(200);
  await as('pm')
    .post(`/v1/projects/${pid('live')}/assignments`, { wbsItemIds: ['P', 'Q', 'S', 'T', 'U'].map((key) => leafIds[key]), supervisorUserId: org.users.sup.id })
    .expect(200);
  await as('pm')
    .put(`/v1/projects/${pid('live')}/approval-routes`, {
      areas: [{ id: null, areaName: 'اسکلت', rootIds: [leafIds['g']], reviewerUserId: org.users.reviewer.id }],
      fallbackApproverId: org.users.pm.id,
    })
    .expect(200);
});

afterAll(async () => {
  await test?.close();
});

describe('F09 ۲–۴ — خط پردازش', () => {
  let autoItem: string;
  let stageItem: string;

  it('AC-AP-02 — +۱٫۵ با دو عکس و GPS معتبر ← تأیید خودکار، Review(auto_approve) و رویداد', async () => {
    const received = await receive(appReport([{ leaf: 'P', percent: 1.5 }]));
    expect(received.reportNo).toMatch(/^FR-\d{4}-0001$/);
    const view = await reportOf(received.reportId);
    autoItem = view.items[0]?.id as string;
    expect(view.items[0]).toMatchObject({ status: 'approved', autoApproved: true, deltaPercent: 1.5, flags: [] });
    expect(view.items[0]?.reviews.map((review) => review.decision)).toEqual(['auto_approve']);
    const { rows } = await test.owner.query("select 1 from domain_event where type = 'FieldReportItemApproved' and payload->>'itemId' = $1", [autoItem]);
    expect(rows).toHaveLength(1);
    // دریافت دوباره همان گزارش بی‌اثر (D10)
    const again = await receive({ ...appReport([{ leaf: 'P', percent: 1.5 }]), id: received.reportId });
    expect(again.duplicate).toBe(true);
  });

  it('AC-AP-03 — +۵ ← مرحلهٔ اول نزد ناظر حوزه با یک NT-APR-01؛ +۳۰ ← پرچم جهش، پس از تأیید ناظر مرحلهٔ دوم نزد مدیر پروژه', async () => {
    const small = await receive(appReport([{ leaf: 'P', percent: 6.5 }]));
    let view = await reportOf(small.reportId, 'reviewer');
    stageItem = view.items[0]?.id as string;
    expect(view.items[0]).toMatchObject({ status: 'stage1', currentStage: 1, deltaPercent: 5, can: { decide: true } });
    expect(view.items[0]?.reviews[0]?.assignee?.id).toBe(org.users.reviewer.id);
    const { rows: notes } = await test.owner.query("select 1 from notification where code = 'NT-APR-01' and channel = 'in_app' and user_id = $1", [org.users.reviewer.id]);
    expect(notes).toHaveLength(1);
    // مدیر پروژه هم می‌تواند (دامنهٔ all)، ناظر دیگر نه
    expect((await reportOf(small.reportId, 'pm')).items[0]?.can.decide).toBe(true);
    await decide('reviewer2', stageItem, { decision: 'approve' }).expect(403);
    const approved = data<{ item: ItemView; message: string | null }>((await decide('reviewer', stageItem, { decision: 'approve' }).expect(200)).body);
    expect(approved.item).toMatchObject({ status: 'approved', autoApproved: false });
    // اولین تصمیم برنده؛ دومی ۴۰۹ (۹.۱)
    expect(code((await decide('pm', stageItem, { decision: 'approve' }).expect(409)).body)).toBe('FIELD_DECISION_CONFLICT');

    const jump = await receive(appReport([{ leaf: 'P', percent: 36.5 }]));
    view = await reportOf(jump.reportId, 'reviewer');
    const jumpItem = view.items[0] as ItemView;
    expect(jumpItem).toMatchObject({ status: 'stage1', flags: ['abnormal_jump'] });
    const first = data<{ item: ItemView; message: string }>((await decide('reviewer', jumpItem.id, { decision: 'approve' }).expect(200)).body);
    expect(first.item).toMatchObject({ status: 'stage2', currentStage: 2 });
    expect(first.message).toContain('مرحلهٔ دوم');
    await decide('reviewer', jumpItem.id, { decision: 'approve' }).expect(403);
    expect(data<{ item: ItemView }>((await decide('pm', jumpItem.id, { decision: 'approve' }).expect(200)).body).item.status).toBe('approved');
  });

  it('AC-AP-09 — برگرداندن تأیید خودکار در مهلت؛ آیتم دستی‌تأییدشده رد', async () => {
    expect(
      code(
        (
          await as('reviewer')
            .post(`/v1/projects/${pid('live')}/field-items/${stageItem}/revoke-auto`, { note: 'بازبینی دوباره' })
            .expect(409)
        ).body,
      ),
    ).toBe('FIELD_DECISION_CONFLICT');
    const revoked = data<{ item: ItemView }>(
      (
        await as('reviewer')
          .post(`/v1/projects/${pid('live')}/field-items/${autoItem}/revoke-auto`, { note: 'عکس‌ها مربوط نیست' })
          .expect(200)
      ).body,
    );
    expect(revoked.item.status).toBe('needs_revision');
    const { rows } = await test.owner.query("select 1 from notification where code = 'NT-FLD-01' and channel = 'in_app' and user_id = $1", [org.users.sup.id]);
    expect(rows).toHaveLength(1);
  });

  it('AC-AP-07 — درخواست اصلاح بی یادداشت رد؛ پس از ارسال دوباره revisionCount = ۱ نزد همان ناظر', async () => {
    const report = await receive(appReport([{ leaf: 'T', percent: 5 }]));
    const item = (await reportOf(report.reportId)).items[0] as ItemView;
    expect(code((await decide('reviewer', item.id, { decision: 'request_revision', note: '' }).expect(422)).body)).toBe('FIELD_DECISION_INVALID');
    await decide('reviewer', item.id, {
      decision: 'request_revision',
      note: 'عکس نمای نزدیک بفرستید',
      requiredActions: [{ key: 'a1', text: 'دو عکس نزدیک', type: 'photo', minPhotos: 2 }],
    }).expect(200);
    await inOrg(() => test.app.get(FieldIntake).resubmit(pid('live'), item.id, { authorUserId: org.users.sup.id, values: { reportedPercent: 6 } }));
    const after = (await reportOf(report.reportId)).items[0] as ItemView;
    expect(after).toMatchObject({ status: 'stage1', revisionCount: 1, computedPercent: 6 });
    expect(after.reviews.at(-1)?.assignee?.id).toBe(org.users.reviewer.id);
  });

  it('AC-AP-05 — آیتم منتظر عکس در هیچ صندوقی نیست؛ پس از بارگذاری خودکار ارزیابی می‌شود', async () => {
    const input = appReport([{ leaf: 'Q', quantity: 50 }]);
    const photos = (input.photos ?? []).map((photo, index) => ({ ...photo, uploaded: index === 0 }));
    const report = await receive({ ...input, photos });
    let box = await inbox('reviewer', `tab=all&projectId=${pid('live')}`);
    expect(box.reports.map((entry) => entry.id)).not.toContain(report.reportId);
    await inOrg(() => test.app.get(FieldIntake).photoUploaded(pid('live'), photos[1]?.id as string));
    box = await inbox('reviewer');
    expect(box.reports.map((entry) => entry.id)).toContain(report.reportId);
    expect((await reportOf(report.reportId)).items[0]).toMatchObject({ status: 'stage1', deltaPercent: 5 });
  });

  it('AC-AP-10 — تأیید گروهی گزارشی با ۳ آیتم بی‌پرچم و ۱ پرچم‌دار فقط ۳ را تأیید می‌کند', async () => {
    const report = await receive(
      appReport([
        { leaf: 'Q', quantity: 30 },
        { leaf: 'S', percent: 4 },
        { leaf: 'U', percent: 3 },
        { leaf: 'T', percent: 40 },
      ]),
    );
    const before = await reportOf(report.reportId, 'reviewer');
    expect(before.items.filter((item) => item.flags.length > 0)).toHaveLength(1);
    const result = data<{ approved: number; movedToStage2: number; skipped: number }>(
      (
        await as('reviewer')
          .post(`/v1/projects/${pid('live')}/field-reports/${report.reportId}/approve-clean`)
          .expect(200)
      ).body,
    );
    expect(result).toEqual({ approved: 3, movedToStage2: 0, skipped: 1 });
  });

  it('AC-AP-08 — اصلاح بعد از تأیید: آیتم تازهٔ approved با supersedesItemId؛ قبلی superseded و دست‌نخورده؛ نویسنده خودش نه', async () => {
    const corrected = data<{ item: ItemView }>(
      (
        await as('reviewer')
          .post(`/v1/projects/${pid('live')}/field-items/${stageItem}/correct`, { values: { reportedPercent: 6 }, reason: 'مقدار با برگهٔ انبار تطبیق داده شد' })
          .expect(200)
      ).body,
    );
    expect(corrected.item).toMatchObject({ status: 'approved', supersedesItemId: stageItem, computedPercent: 6 });
    const { rows } = await test.owner.query<{ status: string; reported_percent: string }>(
      'select status, reported_percent from field_report_item where id = $1',
      [stageItem],
    );
    expect(rows[0]).toEqual({ status: 'superseded', reported_percent: '6.5000' });
    const { rows: events } = await test.owner.query("select 1 from domain_event where type = 'FieldReportItemSuperseded' and payload->>'itemId' = $1", [
      stageItem,
    ]);
    expect(events).toHaveLength(1);
  });
});

describe('F09 ۵.۳ — ثبت دستی وب (G10)', () => {
  it('AC-AP-11 — ثبت دستی ناظر نزد جایگزین است و در صندوق خودش نیست؛ هرگز خودکار تأیید نمی‌شود', async () => {
    const before = (await inbox('reviewer')).kpis.pendingItems;
    const created = data<ReportView>(
      (
        await as('reviewer')
          .post(`/v1/projects/${pid('live')}/field-reports/manual`, { wbsItemId: leafIds['U'], workDate: today, note: 'بازدید میدانی', reportedPercent: 4 })
          .expect(201)
      ).body,
    );
    const item = created.items[0] as ItemView;
    expect(item).toMatchObject({ status: 'stage1', autoApproved: false, can: { decide: false } });
    expect(item.heldBy?.id).toBe(org.users.pm.id);
    expect((await inbox('reviewer')).kpis.pendingItems).toBe(before);
    const pmBox = await inbox('pm');
    expect(pmBox.reports.map((entry) => entry.id)).toContain(created.id);
    expect(code((await decide('reviewer', item.id, { decision: 'approve' }).expect(409)).body)).toBe('FIELD_DECISION_CONFLICT');
  });

  it('OD-F09-01 و ۹.۷ — پروژهٔ متوقف ۴۰۹؛ تاریخ آینده ۴۲۲؛ برگ والد ۴۲۲؛ زمینهٔ فرم', async () => {
    const paused = await as('planner')
      .post(`/v1/projects/${pid('paused')}/field-reports/manual`, { wbsItemId: leafIds['P'], workDate: today, note: 'آزمون', reportedPercent: 1 })
      .expect(409);
    expect(code(paused.body)).toBe('FIELD_ENTRY_NOT_ALLOWED');
    const future = new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
    await as('planner')
      .post(`/v1/projects/${pid('live')}/field-reports/manual`, { wbsItemId: leafIds['P'], workDate: future, note: 'آزمون', reportedPercent: 1 })
      .expect(422);
    await as('planner')
      .post(`/v1/projects/${pid('live')}/field-reports/manual`, { wbsItemId: leafIds['g'], workDate: today, note: 'آزمون', reportedPercent: 1 })
      .expect(422);
    const context = data<{ method: string; totalQuantity: number; approvedQuantity: number; approvedPercent: number }>(
      (
        await as('planner')
          .get(`/v1/projects/${pid('live')}/wbs/${leafIds['Q']}/report-context`)
          .expect(200)
      ).body,
    );
    expect(context).toMatchObject({ method: 'quantity', totalQuantity: 1000, approvedQuantity: 30, approvedPercent: 3 });
  });
});

describe('F09 ۴.۴ و W23 — مهلت، ارجاع، یادآوری، واگذاری', () => {
  it('AC-AP-06 — آیتم بی‌پاسخ پس از ۲۴ ساعت یک بار به جایگزین می‌رود و Review(escalate) دارد', async () => {
    const report = await receive(appReport([{ leaf: 'S', percent: 8 }]));
    const itemId = (await reportOf(report.reportId)).items[0]?.id as string;
    test.clock.advance(25 * 3_600_000);
    const escalated = await inOrg(() => test.app.get(Escalation).escalateProject(pid('live')));
    expect(escalated).toBeGreaterThanOrEqual(1);
    await signInAll();
    const item = (await reportOf(report.reportId)).items.find((entry) => entry.id === itemId) as ItemView;
    expect(item.reviews.map((review) => review.decision)).toEqual(['escalate', null]);
    expect(item.reviews[0]?.escalatedTo?.id).toBe(org.users.pm.id);
    expect(item.reviews[1]?.assignee?.id).toBe(org.users.pm.id);
    // ناظر اصلی هنوز می‌تواند تصمیم بگیرد (۴.۴)
    expect((await reportOf(report.reportId, 'reviewer')).items[0]?.can.decide).toBe(true);
    // فقط یک بار
    test.clock.advance(25 * 3_600_000);
    await inOrg(() => test.app.get(Escalation).escalateProject(pid('live')));
    await signInAll();
    expect((await reportOf(report.reportId)).items[0]?.reviews).toHaveLength(2);
  });

  it('W23 — یادآوری و واگذاری مرحله‌های باز ناظر به ناظر دیگر', async () => {
    await receive(appReport([{ leaf: 'T', percent: 47 }]));
    const reminded = data<{ count: number }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('live')}/approvers/${org.users.reviewer.id}/remind`)
          .expect(200)
      ).body,
    );
    expect(reminded.count).toBeGreaterThan(0);
    await as('reviewer')
      .post(`/v1/projects/${pid('live')}/approvers/${org.users.reviewer.id}/remind`)
      .expect(403);
    const moved = data<{ count: number }>(
      (
        await as('pm')
          .post(`/v1/projects/${pid('live')}/approvers/${org.users.reviewer.id}/reassign`, { substituteUserId: org.users.reviewer2.id })
          .expect(200)
      ).body,
    );
    expect(moved.count).toBe(reminded.count);
    expect((await inbox('reviewer2')).kpis.pendingItems).toBe(moved.count);
  });
});
