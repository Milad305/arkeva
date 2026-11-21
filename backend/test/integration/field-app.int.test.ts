import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tehranClock } from '../../src/platform/scheduler/ticks.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// برش ۱۱ — API اپ کارگاه (F08 سمت سرور؛ field-app.md ۵؛ D10). ورود اپ با کد ۵ رقمی، همگام‌سازی، ارسال گزارش idempotent، عکس با
// /uploads و پردازش پس‌زمینه، پرچم‌های سرور، تعیین تکلیف، اصلاح و ضربان. AC-FA-01، ۰۲، ۰۳، ۰۵، ۰۶، ۰۷، ۰۸، ۱۰؛ AC-FA-04 و
// ۰۹ رابط اپ‌اند.

type UserKey = 'pm' | 'reviewer' | 'sup' | 'sup2';
type ProjectKey = 'live' | 'paused';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.88.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const pid = (project: ProjectKey) => org.projects[project];
const SITE = { lat: 35.7, lng: 51.4 };
const leafIds: Record<string, string> = {};
let today: string;
let refreshToken: string;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    put: (path: string, body: object = {}) => auth(agent.put(path)).send(body),
    delete: (path: string) => auth(agent.delete(path)),
    part: (path: string, bytes: Buffer) => auth(agent.put(path)).set('Content-Type', 'application/octet-stream').send(bytes),
  };
}

interface ItemState {
  id: string;
  status: string;
  flags: string[];
  computedPercent: number;
}
interface Submitted {
  reportId: string;
  reportNo: string;
  duplicate: boolean;
  items: ItemState[];
  photos: { id: string; uploadStatus: string }[];
}

const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** گزارش اپ با شناسه‌های گوشی. */
function report(items: { leaf: string; percent?: number; quantity?: number }[], extra: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    projectId: pid('live'),
    workDate: today,
    deviceRecordedAt: new Date(test.clock.now().getTime() - 60_000).toISOString(),
    appVersion: '1.0.0',
    gps: { ...SITE, accuracyM: 8 },
    weather: 'sunny',
    attested: true,
    items: items.map((entry) => ({
      id: randomUUID(),
      wbsItemId: leafIds[entry.leaf],
      values: { reportedPercent: entry.percent ?? null, quantityToday: entry.quantity ?? null },
      crewCount: 6,
    })),
    ...extra,
  };
}

const submit = (body: object) => as('sup').post('/v1/field/reports', body);

beforeAll(async () => {
  test = await startTestApp();
  const team = { pm: 'project_manager', reviewer: 'reviewer', sup: 'supervisor', sup2: 'supervisor' } as const;
  org = await seedOrg(test.owner, {
    name: 'سازمان اپ',
    users: { pm: { mobile: '09169000001' }, reviewer: { mobile: '09169000002' }, sup: { mobile: '09169000003' }, sup2: { mobile: '09169000004' } },
    projects: {
      live: { code: 'PRJ-1405-981', manager: 'pm', members: team },
      paused: { code: 'PRJ-1405-982', status: 'paused', manager: 'pm', members: team },
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
  for (const key of ['pm', 'reviewer'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;

  const leaf = (title: string, extra: object = {}) => ({
    title,
    weightInParent: 20,
    plannedStart: start,
    plannedFinish: finish,
    measurementMethod: 'percent',
    ...extra,
  });
  const saved = await as('pm').post(`/v1/projects/${pid('live')}/plan-draft/wbs/ops`, {
    draftRevision: 0,
    ops: [
      { type: 'add', tempId: 'g', parentId: null, afterId: null, fields: { title: 'اسکلت', weightInParent: 100 } },
      { type: 'add', tempId: 'P', parentId: 'g', afterId: null, fields: leaf('ستون‌ها') },
      { type: 'add', tempId: 'Q', parentId: 'g', afterId: 'P', fields: leaf('لوله‌کشی', { measurementMethod: 'quantity', unit: 'm', totalQuantity: 2400 }) },
      { type: 'add', tempId: 'S', parentId: 'g', afterId: 'Q', fields: leaf('سقف') },
      { type: 'add', tempId: 'T', parentId: 'g', afterId: 'S', fields: leaf('دیوار', { measurementMethod: 'time_based' }) },
      { type: 'add', tempId: 'U', parentId: 'g', afterId: 'T', fields: leaf('نما') },
    ],
  });
  if (saved.status !== 200) throw new Error(JSON.stringify(saved.body));
  Object.assign(leafIds, data<{ idMap: Record<string, string> }>(saved.body).idMap);
  await as('pm')
    .post(`/v1/projects/${pid('live')}/plan-draft/apply`, { draftRevision: 1, note: 'ساختار' })
    .expect(200);
  await as('pm')
    .post(`/v1/projects/${pid('live')}/assignments`, { wbsItemIds: ['P', 'Q', 'S', 'U'].map((key) => leafIds[key]), supervisorUserId: org.users.sup.id })
    .expect(200);
  await as('pm')
    .put(`/v1/projects/${pid('live')}/approval-routes`, {
      areas: [{ id: null, areaName: 'اسکلت', rootIds: [leafIds['g']], reviewerUserId: org.users.reviewer.id }],
      fallbackApproverId: org.users.pm.id,
    })
    .expect(200);
  // AC-FA-07: ۱٬۳۲۰ از ۲٬۴۰۰ متر = ۵۵٪ تأییدشده
  const reportId = uuidv7();
  const at = test.clock.now().toISOString();
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'web_manual', $4, $5, 'FR-T-0001', $6, $6, $6)`,
    [reportId, org.orgId, pid('live'), org.users.pm.id, start, at],
  );
  await test.owner.query(
    `insert into field_report_item (id, org_id, project_id, report_id, wbs_item_id, method, quantity_today, status, approved_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 'quantity', 1320, 'approved', $6, $6, $6)`,
    [uuidv7(), org.orgId, pid('live'), reportId, leafIds['Q'], at],
  );
}, 90_000);

afterAll(async () => {
  await test?.close();
});

describe('ورود اپ (M01، M02؛ 07 ۲.۲)', () => {
  it('کد ۵ رقمی؛ شمارهٔ ناشناخته همان پاسخ بی پیامک؛ کد نادرست ۴۰۱؛ نشست android با توکن تازه‌سازی در بدنه', async () => {
    const agent = () => test.http(nextIp());
    const unknown = data<Record<string, unknown>>((await agent().post('/v1/auth/app/request-code').send({ mobile: '09169999999' }).expect(200)).body);
    expect(unknown).toMatchObject({ codeLength: 5, maskedMobile: '0916 *** 9999' });
    expect(test.sms.sent.some((message) => message.to === '09169999999')).toBe(false);
    await agent().post('/v1/auth/app/verify').send({ otpToken: unknown['otpToken'], code: '12345' }).expect(401);

    const step = data<{ otpToken: string }>((await agent().post('/v1/auth/app/request-code').send({ mobile: org.users.sup.mobile }).expect(200)).body);
    const sent = [...test.sms.sent].reverse().find((message) => message.to === org.users.sup.mobile);
    const smsCode = /\d{5}/.exec(sent?.text ?? '')?.[0] as string;
    expect(smsCode).toHaveLength(5);
    const wrong = smsCode === '00000' ? '11111' : '00000';
    expect(code((await agent().post('/v1/auth/app/verify').send({ otpToken: step.otpToken, code: wrong }).expect(401)).body)).toBe('OTP_INVALID');
    const session = data<{ session: { accessToken: string }; refreshToken: string; refreshExpiresAt: string }>(
      (await agent().post('/v1/auth/app/verify').send({ otpToken: step.otpToken, code: smsCode }).expect(200)).body,
    );
    tokens.sup = session.session.accessToken;
    refreshToken = session.refreshToken;
    expect(Date.parse(session.refreshExpiresAt) - test.clock.now().getTime()).toBeGreaterThan(29 * 86_400_000);
    // سرپرست پنل وب ندارد
    expect(code((await agent().post('/v1/auth/login').send({ identifier: org.users.sup.mobile, password: 'Test-Pass-1405' }).expect(403)).body)).toBe(
      'WEB_ACCESS_APP_ONLY',
    );
  });

  it('حداکثر ۳ کد در ساعت برای هر شماره؛ تازه‌سازی چرخشی ۳۰ روزه؛ خروج نشست را می‌بندد', async () => {
    const agent = () => test.http(nextIp());
    await agent().post('/v1/auth/app/request-code').send({ mobile: org.users.sup2.mobile }).expect(200);
    await agent().post('/v1/auth/app/request-code').send({ mobile: org.users.sup2.mobile }).expect(200);
    await agent().post('/v1/auth/app/request-code').send({ mobile: org.users.sup2.mobile }).expect(200);
    expect(code((await agent().post('/v1/auth/app/request-code').send({ mobile: org.users.sup2.mobile }).expect(429)).body)).toBe('RATE_LIMITED');

    test.clock.advance(10 * 86_400_000);
    const refreshed = data<{ refreshToken: string; session: { accessToken: string } }>(
      (await agent().post('/v1/auth/app/refresh').send({ refreshToken }).expect(200)).body,
    );
    expect(refreshed.refreshToken).not.toBe(refreshToken);
    tokens.sup = refreshed.session.accessToken;
    // توکن اپ با کوکی وب تازه نمی‌شود و برعکس
    await agent().post('/v1/auth/refresh').set('X-Requested-With', 'projeyar').set('Cookie', `projeyar_refresh=${refreshed.refreshToken}`).expect(401);
    test.clock.advance(-10 * 86_400_000);
    refreshToken = refreshed.refreshToken;
  });
});

describe('ورود اپ با کد یا QR دعوت (M01؛ OD-20)', () => {
  const invite = async (mobile: string) =>
    data<{ invitationId: string; inviteCode: string }>(
      (await as('pm').post('/v1/invitations', { fullName: 'سرپرست تازه', mobile, projectId: pid('live'), roles: ['supervisor'] }).expect(201)).body,
    );
  const lastOtp = (mobile: string): string =>
    /\d{5}/.exec([...test.sms.sent].reverse().find((message) => message.to === mobile)?.text ?? '')?.[0] as string;

  it('OD-20 — کد دعوت در پیامک و پاسخ دعوت؛ QR یا کد ← کد پیامکی به شمارهٔ دعوت؛ verify دعوت را می‌پذیرد و کاربر فعال می‌شود', async () => {
    const agent = () => test.http(nextIp());
    const mobile = '09169000077';
    const invited = await invite(mobile);
    expect(invited.inviteCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(test.sms.sent.some((message) => message.to === mobile && message.text.includes(invited.inviteCode))).toBe(true);

    const step = data<{ otpToken: string; maskedMobile: string; codeLength: number }>(
      (await agent().post('/v1/auth/app/invite-code').send({ code: `projeyar:invite:${invited.inviteCode.toLowerCase()}` }).expect(200)).body,
    );
    expect(step).toMatchObject({ maskedMobile: '0916 *** 0077', codeLength: 5 });
    const session = data<{ session: { accessToken: string } }>(
      (await agent().post('/v1/auth/app/verify').send({ otpToken: step.otpToken, code: lastOtp(mobile) }).expect(200)).body,
    );
    // عضو پروژه شد و اپ کار می‌کند
    await agent().get('/v1/field/sync').set('Authorization', `Bearer ${session.session.accessToken}`).expect(200);
    const { rows } = await test.owner.query<{ status: string; invite_code_hash: string | null }>(
      'select status, invite_code_hash from invitation where id = $1',
      [invited.invitationId],
    );
    expect(rows[0]).toEqual({ status: 'accepted', invite_code_hash: null });
    // کد مصرف‌شده دیگر کار نمی‌کند؛ ورود بعدی با شماره و OTP عادی
    expect(code((await agent().post('/v1/auth/app/invite-code').send({ code: invited.inviteCode }).expect(401)).body)).toBe('INVITE_CODE_INVALID');
  });

  it('OD-20 — کد نادرست، بدشکل یا دعوت لغوشده ۴۰۱؛ ارسال دوباره کد قبلی را باطل می‌کند', async () => {
    const agent = () => test.http(nextIp());
    expect(code((await agent().post('/v1/auth/app/invite-code').send({ code: 'ZZZZZZZZ' }).expect(401)).body)).toBe('INVITE_CODE_INVALID');
    expect(code((await agent().post('/v1/auth/app/invite-code').send({ code: 'abc' }).expect(401)).body)).toBe('INVITE_CODE_INVALID');

    const resent = await invite('09169000078');
    const fresh = data<{ inviteCode: string }>((await as('pm').post(`/v1/invitations/${resent.invitationId}/resend`).expect(200)).body);
    expect(fresh.inviteCode).not.toBe(resent.inviteCode);
    await agent().post('/v1/auth/app/invite-code').send({ code: resent.inviteCode }).expect(401);
    await agent().post('/v1/auth/app/invite-code').send({ code: fresh.inviteCode }).expect(200);

    const revoked = await invite('09169000079');
    await as('pm').delete(`/v1/invitations/${revoked.invitationId}`).expect(200);
    await agent().post('/v1/auth/app/invite-code').send({ code: revoked.inviteCode }).expect(401);
  });
});

describe('همگام‌سازی و ارسال (field-app.md ۵)', () => {
  it('AC-FA-10 — فعالیت‌های من: برگ زمانی و پروژهٔ متوقف نیست؛ برنامهٔ ۱۴ روزه و تأییدشده', async () => {
    const sync = data<{
      projects: { id: string }[];
      activities: { id: string; method: string; plan: unknown[]; approvedPercent: number; approverName: string | null }[];
    }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(sync.projects.map((project) => project.id)).toEqual([pid('live')]);
    expect(sync.activities.map((activity) => activity.id).sort()).toEqual(['P', 'Q', 'S', 'U'].map((key) => leafIds[key]).sort());
    const pipe = sync.activities.find((activity) => activity.id === leafIds['Q']);
    expect(pipe).toMatchObject({ method: 'quantity', approvedPercent: 55, approverName: 'کاربر reviewer' });
    expect(pipe?.plan).toHaveLength(14);
    await as('pm').get('/v1/field/sync').expect(403);
  });

  it('F08 ۵.۱ — قواعد پروژه ساعت یادآوری روزانه را دارد؛ اعلان‌های ۳۰ روز اخیر خود کاربر، تازه‌ترین اول', async () => {
    const now = test.clock.now();
    const insert = (userId: string, title: string, at: Date, readAt: Date | null = null) => {
      const id = randomUUID();
      return test.owner.query(
        `insert into notification (id, org_id, user_id, project_id, code, category, severity, channel, status, title, body, link, dedupe_key, group_key,
           created_at, updated_at, read_at)
         values ($1, $2, $3, $4, 'NT-FLD-02', 'approvals', 'info', 'in_app', 'sent', $5, 'متن', '/field/items', $8, 'g', $6, $6, $7)`,
        [id, org.orgId, userId, pid('live'), title, at, readAt, id],
      );
    };
    await insert(org.users.sup.id, 'قدیمی', new Date(now.getTime() - 40 * 86_400_000));
    await insert(org.users.sup.id, 'دیروز', new Date(now.getTime() - 86_400_000), now);
    await insert(org.users.sup.id, 'امروز', new Date(now.getTime() - 60_000));
    await insert(org.users.sup2.id, 'دیگری', new Date(now.getTime() - 60_000));
    const sync = data<{
      projects: { rules: { dailyReminder: { enabled: boolean; time: string } } }[];
      notifications: { title: string; projectName: string | null; readAt: string | null; link: string }[];
    }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(sync.projects[0]?.rules.dailyReminder).toEqual({ enabled: true, time: '17:00' });
    const mine = sync.notifications.filter((entry) => ['قدیمی', 'دیروز', 'امروز', 'دیگری'].includes(entry.title));
    expect(mine.map((entry) => entry.title)).toEqual(['امروز', 'دیروز']);
    expect(mine[0]).toMatchObject({ readAt: null, link: '/field/items' });
    expect(mine[1]?.readAt).not.toBeNull();
  });

  it('AC-FA-01 و AC-FA-07 — ارسال idempotent: تکرار گزارش تکراری نمی‌سازد؛ ۷۲ متر از ۲٬۴۰۰ با ۵۵٪ ← ۵۸٪', async () => {
    const body = report([{ leaf: 'Q', quantity: 72 }]);
    const first = data<Submitted>((await submit(body).expect(200)).body);
    expect(first.reportNo).toMatch(/^FR-\d{4}-\d{4}$/);
    expect(first.items[0]?.computedPercent).toBe(58);
    const again = data<Submitted>((await submit(body).expect(200)).body);
    expect(again).toMatchObject({ duplicate: true, reportNo: first.reportNo, reportId: first.reportId });
    const [count] = (await test.owner.query<{ n: number }>('select count(*)::int as n from field_report where id = $1', [body.id])).rows;
    expect(count?.n).toBe(1);
    // پروژهٔ متوقف نمی‌پذیرد؛ پروژهٔ غیرعضو ۴۰۴
    expect(code((await submit({ ...report([{ leaf: 'P', percent: 1 }]), projectId: pid('paused') }).expect(409)).body)).toBe('FIELD_ENTRY_NOT_ALLOWED');
    await submit({ ...report([{ leaf: 'P', percent: 1 }]), projectId: randomUUID() }).expect(404);
  });

  it('AC-FA-02 و AC-FA-05 — ۷۳ ساعت در صف ← late_submission؛ موقعیت جعلی، ساعت گوشی و زمان عکس ← پرچم، بی تأیید خودکار', async () => {
    const late = data<Submitted>(
      (await submit(report([{ leaf: 'P', percent: 1 }], { deviceRecordedAt: new Date(test.clock.now().getTime() - 73 * 3_600_000).toISOString() })).expect(200))
        .body,
    );
    expect(late.items[0]?.flags).toContain('late_submission');
    const odd = report([{ leaf: 'S', percent: 1 }], { mockLocation: true, deviceRecordedAt: new Date(test.clock.now().getTime() + 10 * 60_000).toISOString() });
    const yesterday = new Date(test.clock.now().getTime() - 30 * 3_600_000).toISOString();
    const photos = [0, 1].map(() => ({ id: randomUUID(), itemId: odd.items[0]?.id, sha256: 'a'.repeat(64), takenAt: yesterday, ...SITE }));
    const flagged = data<Submitted>((await submit({ ...odd, photos }).expect(200)).body);
    expect(flagged.items[0]?.flags).toEqual(expect.arrayContaining(['mock_location', 'clock_skew', 'photo_time_mismatch', 'photos_pending']));
    expect(flagged.items[0]?.status).toBe('submitted');
  });

  it('AC-FA-03 — عکس با /uploads: پس از کامل شدن هر دو عکس آیتم وارد بررسی می‌شود؛ بندانگشتی ۳۲۰ و ۱۲۸۰ و EXIF در پس‌زمینه', async () => {
    const jpeg = (shade: number) =>
      sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: shade, g: 120, b: 90 } } })
        .withExif({ IFD0: { Make: 'TestCam', Model: 'X1' } })
        .jpeg({ quality: 80 })
        .toBuffer();
    const images = [await jpeg(10), await jpeg(200)];
    const body = report([{ leaf: 'P', percent: 4 }]);
    const itemId = body.items[0]?.id as string;
    const photos = images.map((image) => ({ id: randomUUID(), itemId, sha256: sha(image), takenAt: test.clock.now().toISOString(), ...SITE }));
    const submitted = data<Submitted>((await submit({ ...body, photos }).expect(200)).body);
    expect(submitted.items[0]).toMatchObject({ status: 'submitted' });
    expect(submitted.items[0]?.flags).toContain('photos_pending');

    for (const [index, image] of images.entries()) {
      const photo = photos[index] as { id: string };
      const upload = data<{ uploadId: string; partCount: number }>(
        (
          await as('sup')
            .post('/v1/uploads', {
              projectId: pid('live'),
              kind: 'photo',
              subjectId: photo.id,
              fileName: `p${index}.jpg`,
              contentType: 'image/jpeg',
              size: image.length,
            })
            .expect(201)
        ).body,
      );
      for (let part = 1; part <= upload.partCount; part += 1) {
        await as('sup')
          .part(`/v1/uploads/${upload.uploadId}/parts/${part}`, image.subarray((part - 1) * 1024 * 1024, part * 1024 * 1024))
          .expect(200);
      }
      await as('sup')
        .post(`/v1/uploads/${upload.uploadId}/complete`, { sha256: sha(image) })
        .expect(200);
    }
    const sync = data<{ items: { id: string; status: string }[] }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(sync.items.find((item) => item.id === itemId)?.status).toBe('stage1');

    const photoId = (photos[0] as { id: string }).id;
    await waitFor(async () => (await test.owner.query('select 1 from field_photo where id = $1 and processed_at is not null', [photoId])).rowCount === 1);
    const [row] = (
      await test.owner.query<{ thumb_small_key: string; thumb_large_key: string; exif: { make: string } }>(
        'select thumb_small_key, thumb_large_key, exif from field_photo where id = $1',
        [photoId],
      )
    ).rows;
    expect(row?.thumb_small_key).toMatch(/-t320$/);
    expect(row?.thumb_large_key).toMatch(/-t1280$/);
    expect(row?.exif.make).toBe('TestCam');
  });

  it('AC-FA-06 — برگی که در فاصلهٔ صف به سرپرست دیگر سپرده شد پذیرفته و needs_resolution می‌شود', async () => {
    await as('pm')
      .post(`/v1/projects/${pid('live')}/assignments`, { wbsItemIds: [leafIds['U']], supervisorUserId: org.users.sup2.id })
      .expect(200);
    const result = data<Submitted>((await submit(report([{ leaf: 'U', percent: 3 }])).expect(200)).body);
    expect(result.items[0]?.status).toBe('needs_resolution');
  });

  it('اصلاح (M11): درخواست اصلاح با یادداشت و چک‌لیست در همگام‌سازی؛ ارسال دوباره ← مرحلهٔ ۱', async () => {
    const result = data<Submitted>((await submit(report([{ leaf: 'S', percent: 6 }])).expect(200)).body);
    const itemId = result.items[0]?.id as string;
    expect(result.items[0]?.status).toBe('stage1');
    await as('reviewer')
      .post(`/v1/projects/${pid('live')}/field-items/${itemId}/decision`, {
        decision: 'request_revision',
        note: 'عکس نمای نزدیک بفرستید',
        requiredActions: [{ key: 'a1', text: 'دو عکس نزدیک', type: 'photo', minPhotos: 2 }],
      })
      .expect(200);
    const sync = data<{ items: { id: string; status: string; revision: { note: string; requiredActions: unknown[] } | null }[] }>(
      (await as('sup').get('/v1/field/sync').expect(200)).body,
    );
    expect(sync.items.find((item) => item.id === itemId)).toMatchObject({ status: 'needs_revision', revision: { note: 'عکس نمای نزدیک بفرستید' } });
    const after = data<ItemState>(
      (
        await as('sup')
          .put(`/v1/field/items/${itemId}`, { values: { reportedPercent: 7 }, note: 'اصلاح شد' })
          .expect(200)
      ).body,
    );
    expect(after).toMatchObject({ status: 'stage1', computedPercent: 7 });
    await as('sup')
      .put(`/v1/field/items/${itemId}`, { values: { reportedPercent: 8 } })
      .expect(409);
  });

  it('AC-FA-09 — عکس تازهٔ اصلاح با PUT: آیتم منتظر عکس می‌ماند، تکرار بی‌اثر، پس از بارگذاری نزد همان تأییدکننده', async () => {
    const result = data<Submitted>((await submit(report([{ leaf: 'S', percent: 9 }])).expect(200)).body);
    const itemId = result.items[0]?.id as string;
    await as('reviewer')
      .post(`/v1/projects/${pid('live')}/field-items/${itemId}/decision`, {
        decision: 'request_revision',
        note: 'دو عکس نزدیک',
        requiredActions: [{ key: 'p', text: 'دو عکس نزدیک', type: 'photo', minPhotos: 2 }],
      })
      .expect(200);
    const images = [
      await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 20, b: 30 } } }).jpeg().toBuffer(),
      await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 90, g: 20, b: 30 } } }).jpeg().toBuffer(),
    ];
    const photos = images.map((image) => ({ id: randomUUID(), sha256: sha(image), takenAt: test.clock.now().toISOString(), ...SITE }));
    const body = { values: { reportedPercent: 10 }, note: 'عکس‌ها گرفته شد', photos };
    const after = data<ItemState & { photos: { id: string; uploadStatus: string }[] }>(
      (await as('sup').put(`/v1/field/items/${itemId}`, body).expect(200)).body,
    );
    expect(after).toMatchObject({ status: 'submitted', computedPercent: 10 });
    expect(after.flags).toContain('photos_pending');
    expect(after.photos.map((photo) => photo.uploadStatus)).toEqual(['pending', 'pending']);
    // پاسخ گم شد و گوشی دوباره فرستاد
    await as('sup').put(`/v1/field/items/${itemId}`, body).expect(200);
    expect((await test.owner.query('select 1 from field_photo where item_id = $1', [itemId])).rowCount).toBe(2);
    // عکس تازه پس از ارسال دوباره: آیتم دیگر منتظر اصلاح نیست
    await as('sup')
      .put(`/v1/field/items/${itemId}`, { values: { reportedPercent: 10 }, photos: [{ ...(photos[0] as object), id: randomUUID() }, photos[0]] })
      .expect(409);

    for (const [index, image] of images.entries()) {
      const upload = data<{ uploadId: string }>(
        (
          await as('sup')
            .post('/v1/uploads', {
              projectId: pid('live'),
              kind: 'photo',
              subjectId: (photos[index] as { id: string }).id,
              fileName: `r${index}.jpg`,
              contentType: 'image/jpeg',
              size: image.length,
            })
            .expect(201)
        ).body,
      );
      await as('sup').part(`/v1/uploads/${upload.uploadId}/parts/1`, image).expect(200);
      await as('sup').post(`/v1/uploads/${upload.uploadId}/complete`, { sha256: sha(image) }).expect(200);
    }
    const sync = data<{ items: { id: string; status: string }[] }>((await as('sup').get('/v1/field/sync').expect(200)).body);
    expect(sync.items.find((item) => item.id === itemId)?.status).toBe('stage1');
    const open = await test.owner.query<{ assignee_user_id: string }>(
      'select assignee_user_id from field_review where item_id = $1 and decision is null',
      [itemId],
    );
    expect(open.rows.map((row) => row.assignee_user_id)).toEqual([org.users.reviewer.id]);
  });

  it('AC-FA-08 — ضربان: آخرین حالت صف ذخیره و DeviceQueueHeartbeat منتشر می‌شود', async () => {
    const oldest = new Date(test.clock.now().getTime() - 5 * 3_600_000).toISOString();
    await as('sup')
      .post('/v1/field/heartbeat', { queuedReports: 2, queuedPhotos: 5, queuedBytes: 4_000_000, oldestQueuedAt: oldest, appVersion: '1.0.0', wifiOnly: true })
      .expect(200);
    await as('sup')
      .post('/v1/field/heartbeat', { queuedReports: 1, queuedPhotos: 2, queuedBytes: 1_000_000, oldestQueuedAt: oldest, appVersion: '1.0.0', wifiOnly: true })
      .expect(200);
    const [state] = (
      await test.owner.query<{ queued_reports: number; wifi_only: boolean }>('select queued_reports, wifi_only from device_queue_state where user_id = $1', [
        org.users.sup.id,
      ])
    ).rows;
    expect(state).toEqual({ queued_reports: 1, wifi_only: true });
    const [events] = (
      await test.owner.query<{ n: number }>(`select count(*)::int as n from domain_event where type = 'DeviceQueueHeartbeat' and org_id = $1`, [org.orgId])
    ).rows;
    expect(events?.n).toBe(2);
  });

  it('خروج اپ نشست را می‌بندد', async () => {
    await test.http(nextIp()).post('/v1/auth/app/logout').send({ refreshToken }).expect(204);
    await test.http(nextIp()).post('/v1/auth/app/refresh').send({ refreshToken }).expect(401);
  });
});
