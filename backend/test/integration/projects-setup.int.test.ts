import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProjectPurge } from '../../src/modules/projects/application/project-purge.js';
import { fromJalali, jalaliYear } from '../../src/platform/time/jalali.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// ساخت و تنظیمات پروژه (F02 ۵–۷): AC-PS-01، ۰۲، ۰۳، ۱۰، ۱۱، ۱۲ روی HTTP.

type UserKey = 'admin' | 'admin2' | 'pm' | 'reviewer' | 'supervisor';
let test: TestApp;
let org: SeededOrg<UserKey, 'existing' | 'archived'>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.50.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

function api(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    put: (path: string, body: object) => agent.put(path).set(auth).send(body),
    patch: (path: string, body: object) => agent.patch(path).set(auth).send(body),
    del: (path: string) => agent.delete(path).set(auth),
  };
}

const data = <T>(body: unknown): T => (body as { data: T }).data;
const iso = (year: number, month: number, day: number): string => fromJalali(year, month, day) ?? '';
const year = (): number => jalaliYear(test.clock.now().toISOString().slice(0, 10));

function draftBody(overrides: { basic?: object; schedule?: object; team?: object; structure?: object } = {}) {
  return {
    step: 4,
    basic: { name: 'برج آزمایشی', code: '', clientName: 'کارفرمای نمونه', projectTypeId: 'residential', location: 'تهران', imageName: null, ...overrides.basic },
    schedule: {
      plannedStart: iso(1404, 4, 1),
      plannedFinish: iso(1405, 12, 20),
      calendarPresetId: 'cal-site6',
      currency: 'rial',
      plannedTotalBudget: '1200000000000',
      contingencyPct: 5,
      milestones: [{ key: 'm1', title: 'اسکلت', date: iso(1405, 1, 15) }],
      ...overrides.schedule,
    },
    team: {
      managerUserId: org.users.pm.id,
      managerDisplay: { fullName: 'کاربر pm', avatarTone: 'a1', contact: '09141000003' },
      members: [{ userId: org.users.reviewer.id, fullName: 'کاربر reviewer', avatarTone: 'a2', inviteTarget: null, roles: ['reviewer'], note: null }],
      ...overrides.team,
    },
    structure: { mode: 'empty', templateId: null, ...overrides.structure },
    sendInvites: true,
  };
}

async function eventsOf(projectId: string): Promise<{ type: string; payload: Record<string, unknown> }[]> {
  const { rows } = await test.owner.query<{ type: string; payload: Record<string, unknown> }>(
    'select type, payload from domain_event where project_id = $1 order by occurred_at, id',
    [projectId],
  );
  return rows;
}

beforeAll(async () => {
  test = await startTestApp();
  const y = jalaliYear(test.clock.now().toISOString().slice(0, 10));
  org = await seedOrg(test.owner, {
    name: 'سازمان ساخت',
    users: {
      admin: { mobile: '09141000001', orgAdmin: true },
      admin2: { mobile: '09141000002', orgAdmin: true },
      pm: { mobile: '09141000003' },
      reviewer: { mobile: '09141000004' },
      supervisor: { mobile: '09141000005' },
    },
    projects: {
      existing: { code: `PRJ-${y}-001`, manager: 'pm', members: { pm: 'project_manager', reviewer: 'reviewer', supervisor: 'supervisor' } },
      archived: { code: `PRJ-${y}-050`, manager: 'pm', status: 'archived', members: { pm: 'project_manager' } },
    },
  });
  // تاریخ برنامه برای سال‌های پوشش تقویم
  await test.owner.query(`update project set planned_start = $1, planned_finish = $2 where id = $3`, [iso(1405, 1, 15), iso(1406, 6, 1), org.projects.existing]);
  // سرپرست فقط اپ دارد و به وب وارد نمی‌شود (§۷.۳ ردیف ۱۷)
  for (const key of Object.keys(org.users) as UserKey[]) {
    if (key !== 'supervisor') tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  }
});

afterAll(async () => {
  await test?.close();
});

describe('F02 ۵ — کمک‌های ویزارد', () => {
  it('F02 ۵.۱ — گزینه‌ها: نوع‌ها، دو تقویم، کد پیشنهادی بعد از بزرگ‌ترین کد ثبت‌شده', async () => {
    const options = data<{ projectTypes: { id: string }[]; calendarPresets: unknown[]; suggestedCode: string; me: { userId: string } }>(
      (await api('admin').get('/v1/projects/drafts/options').expect(200)).body,
    );
    expect(options.projectTypes.map((type) => type.id)).toEqual(['residential']);
    expect(options.calendarPresets).toHaveLength(2);
    expect(options.suggestedCode).toBe(`PRJ-${year()}-051`);
    expect(options.me.userId).toBe(org.users.admin.id);
  });

  it('access-control ۵.۴ — بی project.create ۴۰۳', async () => {
    const response = await api('pm').get('/v1/projects/drafts/options').expect(403);
    expect(response.body).toMatchObject({ code: 'PERMISSION_DENIED', details: { requiredPermission: 'project.create' } });
  });

  it('AC-PS-03 — کد تکراری یا بدشکل رد و کد بعدی پیشنهاد می‌شود', async () => {
    const taken = data<{ available: boolean; suggestion: string }>((await api('admin').get(`/v1/projects/code-available?code=prj-${year()}-001`).expect(200)).body);
    expect(taken).toMatchObject({ available: false, suggestion: `PRJ-${year()}-051` });
    const bad = data<{ available: boolean; message: string }>((await api('admin').get('/v1/projects/code-available?code=ABC').expect(200)).body);
    expect(bad).toMatchObject({ available: false, message: 'کد باید مثل PRJ-1405-001 باشد.' });
    const free = data<{ available: boolean }>((await api('admin').get(`/v1/projects/code-available?code=PRJ-${year()}-077`).expect(200)).body);
    expect(free.available).toBe(true);
  });

  it('AC-PS-01، AC-PS-02 — پیش‌نمایش: ۶۲۸ روز، ذخیرهٔ ۶۰ میلیارد و سهم CBS ۱٬۱۴۰ میلیارد', async () => {
    const preview = data<Record<string, unknown>>((await api('admin').post('/v1/projects/drafts/schedule-preview', draftBody().schedule).expect(200)).body);
    expect(preview).toMatchObject({
      calendarDays: 628,
      contingencyReserve: '60000000000',
      cbsShare: '1140000000000',
      calendarName: 'کارگاه — ۶ روز در هفته',
      errors: {},
    });
    expect(preview['workDays']).toEqual(expect.any(Number));

    const invalid = data<{ errors: Record<string, string>; calendarDays: null }>(
      (await api('admin').post('/v1/projects/drafts/schedule-preview', { ...draftBody().schedule, plannedFinish: iso(1404, 3, 1), contingencyPct: 25 }).expect(200)).body,
    );
    expect(invalid.calendarDays).toBeNull();
    expect(Object.keys(invalid.errors).sort()).toEqual(['contingency', 'dates']);
  });

  it('F02 ۵.۳ — ترکیب تیم و هشدار نبود سرپرست؛ پیشنهاد از پروژهٔ هم‌نوع', async () => {
    const check = data<{ composition: { role: string; count: number }[]; warnings: string[]; suggestions: { userId: string; role: string }[] }>(
      (await api('admin').post('/v1/projects/drafts/team-check', { basic: draftBody().basic, team: draftBody().team }).expect(200)).body,
    );
    expect(check.composition).toEqual([
      { role: 'project_manager', count: 1 },
      { role: 'reviewer', count: 1 },
    ]);
    expect(check.warnings.some((warning) => warning.includes('سرپرست کارگاهی نیست'))).toBe(true);
    expect(check.suggestions).toEqual([expect.objectContaining({ userId: org.users.supervisor.id, role: 'supervisor' })]);
  });
});

describe('F02 ۵.۴ — ساخت پروژه', () => {
  async function createFrom(body: object, user: UserKey = 'admin') {
    const draft = data<{ id: string }>((await api(user).post('/v1/projects/drafts', body).expect(201)).body);
    return { draftId: draft.id, response: await api(user).post(`/v1/projects/drafts/${draft.id}/create`) };
  }

  it('F02 ۵.۴ — دعوت با ایمیل و قالبِ انتخاب‌نشده مانع‌اند (تصمیم 1405/08/22؛ قالب با برش ۱۶)', async () => {
    const { response } = await createFrom(
      draftBody({
        basic: { code: `PRJ-${year()}-060` },
        structure: { mode: 'template', templateId: null },
        team: { members: [{ userId: null, fullName: 'دعوتی', avatarTone: 'a1', inviteTarget: 'site@example.com', roles: ['supervisor'], note: null }] },
      }),
    );
    expect(response.status).toBe(422);
    const blockers = (response.body as { code: string; details: { blockers: { step: number }[] } });
    expect(blockers.code).toBe('PROJECT_WIZARD_BLOCKED');
    expect(blockers.details.blockers.map((blocker) => blocker.step)).toEqual([3, 4]);
  });

  it('AC-PS-03 — کد گرفته‌شده هنگام ساخت ۴۰۹ با پیشنهاد کد بعدی', async () => {
    const { response } = await createFrom(draftBody({ basic: { code: `PRJ-${year()}-001` } }));
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'PROJECT_CODE_TAKEN', details: { suggestion: `PRJ-${year()}-051` } });
  });

  it('F02 ۵.۴ — ساخت: پیش‌نویس، تنظیمات، تقویم با تعطیلات سال اول، تیم با سازندهٔ برنامه‌ریز، ممیزی و ProjectCreated', async () => {
    const code = `PRJ-${year()}-051`;
    const { draftId, response } = await createFrom(draftBody({ basic: { code: code.toLowerCase() } }));
    expect(response.status).toBe(201);
    const created = data<{ projectId: string; next: string }>(response.body);
    expect(created.next).toBe('overview');
    const id = created.projectId;

    const { rows: [project] } = await test.owner.query<Record<string, unknown>>('select * from project where id = $1', [id]);
    expect(project).toMatchObject({
      code,
      status: 'draft',
      manager_user_id: org.users.pm.id,
      contingency_reserve: '60000000000',
      planned_total_budget: '1200000000000',
      created_by_user_id: org.users.admin.id,
      key_milestones: [{ title: 'اسکلت', date: iso(1405, 1, 15) }],
    });
    const { rows: [settings] } = await test.owner.query<Record<string, unknown>>('select * from project_settings where project_id = $1', [id]);
    expect(settings).toMatchObject({ approval_mode: 'two_stage', alternate_reviewer_user_id: org.users.pm.id });
    const { rows: [calendar] } = await test.owner.query<{ holidays: { date: string; type: string }[] }>('select holidays from project_calendar where project_id = $1', [id]);
    expect(calendar?.holidays).toContainEqual(expect.objectContaining({ date: iso(1404, 1, 1), type: 'official' }));
    expect(calendar?.holidays.every((holiday) => jalaliYear(holiday.date) === 1404)).toBe(true);

    const { rows: roles } = await test.owner.query<{ user_id: string; code: string }>(
      `select m.user_id, r.code from project_member m join project_member_role pr on pr.member_id = m.id join role r on r.id = pr.role_id
        where m.project_id = $1 order by r.code`,
      [id],
    );
    expect(roles).toEqual([
      { user_id: org.users.admin.id, code: 'planner' },
      { user_id: org.users.pm.id, code: 'project_manager' },
      { user_id: org.users.reviewer.id, code: 'reviewer' },
    ]);
    expect(await eventsOf(id)).toEqual([{ type: 'ProjectCreated', payload: { v: 1, structure: 'empty' } }]);
    const { rows: audit } = await test.owner.query<{ action: string }>('select action from audit_log where entity_id = $1', [id]);
    expect(audit).toEqual([{ action: 'project.created' }]);
    // F04 ۳: مبنای کاری همراه ساخت؛ نقطهٔ عطف ویزارد زیر گروه «نقاط عطف کلیدی» با وزن ۰ (project-setup.md ۵.۲)
    const { rows: versions } = await test.owner.query('select kind, number, status, source from plan_version where project_id = $1', [id]);
    expect(versions).toEqual([{ kind: 'baseline', number: 0, status: 'draft', source: 'wizard' }]);
    const { rows: items } = await test.owner.query<{ title: string; weight_in_parent: string; is_milestone: boolean }>(
      'select title, weight_in_parent, is_milestone from wbs_item where project_id = $1 order by code',
      [id],
    );
    expect(items).toEqual([
      { title: 'نقاط عطف کلیدی', weight_in_parent: '0.0000', is_milestone: false },
      { title: 'اسکلت', weight_in_parent: '0.0000', is_milestone: true },
    ]);

    await api('admin').get(`/v1/projects/drafts/${draftId}`).expect(404);
    const detail = data<{ status: string; contingencyReserve: string }>((await api('pm').get(`/v1/projects/${id}`).expect(200)).body);
    expect(detail).toMatchObject({ status: 'draft', contingencyReserve: '60000000000' });
  });

  it('F02 ۵.۴ — ورود از MSP: پروژهٔ پیش‌نویس و رفتن به W34', async () => {
    const { response } = await createFrom(draftBody({ basic: { code: `PRJ-${year()}-061` }, structure: { mode: 'msp' }, team: { members: [] } }));
    expect(data<{ next: string }>(response.body).next).toBe('msp_import');
  });

  it('F02 ۸.۴ — کد پروژهٔ حذف‌شده دوباره استفاده نمی‌شود', async () => {
    const code = `PRJ-${year()}-062`;
    const { response } = await createFrom(draftBody({ basic: { code, name: 'پروژهٔ موقت' }, team: { members: [] } }));
    const id = data<{ projectId: string }>(response.body).projectId;
    await api('admin').post('/v1/auth/step-up', { purpose: 'project.delete', subjectId: id }).expect(200);
    const otp = test.sms.lastCode(org.users.admin.mobile);
    await api('admin').post(`/v1/projects/${id}/delete`, { confirmName: 'پروژهٔ موقت', otp }).expect(200);

    const check = data<{ available: boolean }>((await api('admin').get(`/v1/projects/code-available?code=${code}`).expect(200)).body);
    expect(check.available).toBe(false);
  });
});

describe('F02 ۷ — تنظیمات پروژه', () => {
  const settingsPath = () => `/v1/projects/${org.projects.existing}/settings`;

  it('F02 ۷ — خواندن بخش‌ها؛ بودجه بی cbs.view_amounts تهی', async () => {
    const asPm = data<{ general: Record<string, unknown>; calendar: { missingOfficialYears: number[] }; workflow: Record<string, unknown> }>(
      (await api('pm').get(settingsPath()).expect(200)).body,
    );
    expect(asPm.general).toMatchObject({ code: `PRJ-${year()}-001`, status: 'active', gpsRadiusM: 300 });
    expect(asPm.calendar.missingOfficialYears).toEqual([1405, 1406]);
    expect(asPm.workflow).toMatchObject({ approvalMode: 'two_stage', reviewDeadlineHours: 24, avgApprovalHours: null });
    const asReviewer = data<{ general: { plannedTotalBudget: unknown } }>((await api('reviewer').get(settingsPath()).expect(200)).body);
    expect(asReviewer.general.plannedTotalBudget).toBeNull();
  });

  it('F02 ۷ — ذخیرهٔ یک بخش با رویداد و ممیزی فقط برای فیلدهای تغییرکرده؛ ذخیرهٔ بی‌تغییر رویداد نمی‌سازد', async () => {
    const id = org.projects.existing;
    const before = (await eventsOf(id)).length;
    const saved = data<{ name: string }>((await api('pm').patch(settingsPath(), { general: { name: 'برج تازه', location: 'کرج' } }).expect(200)).body);
    expect(saved.name).toBe('برج تازه');
    await api('pm').patch(settingsPath(), { general: { name: 'برج تازه' } }).expect(200);
    const events = (await eventsOf(id)).slice(before);
    expect(events).toEqual([{ type: 'ProjectSettingsChanged', payload: { v: 1, section: 'general', fields: ['name', 'location'] } }]);
    const { rows } = await test.owner.query<{ before: Record<string, unknown>; after: Record<string, unknown> }>(
      `select before, after from audit_log where entity_id = $1 and action = 'project.settings_changed'`,
      [id],
    );
    expect(rows).toEqual([{ before: { section: 'general', name: 'پروژهٔ existing', location: null }, after: { section: 'general', name: 'برج تازه', location: 'کرج' } }]);
  });

  it('F02 ۷ — قواعد: دو بخش با هم، کد پروژه، آستانه‌ها، مسیر بحرانی بی MSP، مختصات', async () => {
    await api('pm').patch(settingsPath(), { general: { name: 'x y z' }, field: { minPhotos: 3 } }).expect(400);
    await api('pm').patch(settingsPath(), { general: { code: 'PRJ-1405-999' } }).expect(400); // AC-PS-03: کد ویرایش نمی‌شود
    await api('pm').patch(settingsPath(), { progress: { warningThreshold: 20, criticalThreshold: 10 } }).expect(400);
    await api('pm').patch(settingsPath(), { workflow: { stage2OnCriticalPath: true } }).expect(400);
    await api('pm').patch(settingsPath(), { general: { siteLat: 35.7 } }).expect(400);
    await api('pm').patch(settingsPath(), { field: { minPhotos: 11 } }).expect(400);
    await api('reviewer').patch(settingsPath(), { field: { minPhotos: 3 } }).expect(403);
  });

  it('F02 ۷ — شعاع کارگاه روی پروژه و قواعد گزارش روی ProjectSettings', async () => {
    const field = data<{ gpsRadiusM: number; minPhotos: number }>((await api('pm').patch(settingsPath(), { field: { gpsRadiusM: 500, minPhotos: 4 } }).expect(200)).body);
    expect(field).toMatchObject({ gpsRadiusM: 500, minPhotos: 4 });
    const { rows } = await test.owner.query<{ gps_radius_m: number }>('select gps_radius_m from project where id = $1', [org.projects.existing]);
    expect(rows[0]?.gps_radius_m).toBe(500);
  });

  it('AC-PS-10 — تغییر تقویم ProjectSettingsChanged می‌سازد؛ تقویم نادرست ۴۰۰ با فیلد', async () => {
    const id = org.projects.existing;
    const current = data<{ calendar: Record<string, unknown> }>((await api('pm').get(settingsPath()).expect(200)).body).calendar;
    const body = { ...current, dayEnd: '15:00', holidays: [{ date: iso(1405, 2, 10), title: 'تعطیلی کارگاه', type: 'manual', enabled: true }] };
    delete (body as Record<string, unknown>)['missingOfficialYears'];
    await api('pm').put(`/v1/projects/${id}/calendar`, body).expect(200);
    expect((await eventsOf(id)).at(-1)).toEqual({ type: 'ProjectSettingsChanged', payload: { v: 1, section: 'calendar', fields: ['dayEnd', 'holidays'] } });

    const invalid = await api('pm').put(`/v1/projects/${id}/calendar`, { ...body, dayEnd: '06:00' }).expect(400);
    expect((invalid.body as { details: { fields: { field: string }[] } }).details.fields.map((item) => item.field)).toContain('dayEnd');
  });

  it('F02 ۶ — افزودن تعطیلات رسمی یک سال؛ سال‌های جاافتاده کم می‌شود', async () => {
    const calendar = data<{ holidays: { date: string; type: string }[]; missingOfficialYears: number[] }>(
      (await api('pm').post(`/v1/projects/${org.projects.existing}/calendar/official-holidays/1406`).expect(200)).body,
    );
    expect(calendar.holidays).toContainEqual(expect.objectContaining({ date: iso(1406, 1, 1), type: 'official' }));
    expect(calendar.missingOfficialYears).toEqual([1405]);
  });

  it('AC-PS-11 — پروژهٔ بایگانی‌شده تنظیمات تازه نمی‌پذیرد', async () => {
    const response = await api('admin').patch(`/v1/projects/${org.projects.archived}/settings`, { field: { minPhotos: 3 } }).expect(409);
    expect((response.body as { code: string }).code).toBe('PROJECT_READ_ONLY');
    await api('admin').post(`/v1/projects/${org.projects.archived}/calendar/official-holidays/1405`).expect(409);
  });
});

describe('F02 ۶ — تعطیلات رسمی سازمان (تصمیم کاربر 1405/08/22)', () => {
  it('F02 ۶ — مدیر سازمان تعطیلی قمری می‌افزاید؛ فهرست سال آن را با منبع سازمان دارد؛ تکرار و بی‌دسترسی رد', async () => {
    const date = iso(1405, 4, 14);
    await api('admin').post('/v1/org/official-holidays', { date, title: 'عاشورا' }).expect(201);
    const list = data<{ date: string; title: string; source: string }[]>((await api('pm').get('/v1/calendar/official-holidays?year=1405').expect(200)).body);
    expect(list).toContainEqual({ date, title: 'عاشورا', source: 'org' });
    expect(list).toContainEqual({ date: iso(1405, 1, 1), title: 'عید نوروز', source: 'system' });
    await api('admin').post('/v1/org/official-holidays', { date: iso(1405, 1, 1), title: 'تکراری' }).expect(400);
    await api('pm').post('/v1/org/official-holidays', { date: iso(1405, 5, 1), title: 'x' }).expect(403);
  });
});

describe('W48 — فهرست کاربران سازمان', () => {
  it('W48 — جستجو با users.invite؛ ناظر بی‌دسترسی', async () => {
    const found = data<{ userId: string; contact: string }[]>((await api('admin').get('/v1/org/users/search?q=reviewer').expect(200)).body);
    expect(found).toEqual([expect.objectContaining({ userId: org.users.reviewer.id, contact: '09141000004' })]);
    await api('pm').get('/v1/org/users/search?q=0914').expect(200);
    await api('reviewer').get('/v1/org/users/search?q=x').expect(403);
  });
});

describe('AC-PS-12 — پیش‌نویس ویزارد', () => {
  it('AC-PS-12 — بین مراحل حفظ می‌شود، فقط برای سازنده در W07 «ناتمام» است و پس از ۹۰ روز بی‌فعالیتی پاک می‌شود', async () => {
    const first = data<{ id: string; step: number }>((await api('admin').post('/v1/projects/drafts', { ...draftBody(), step: 1 }).expect(201)).body);
    const updated = data<{ id: string; step: number; basic: { name: string } }>(
      (await api('admin').put(`/v1/projects/drafts/${first.id}`, { ...draftBody({ basic: { name: 'نیمه‌کاره' } }), step: 2 }).expect(200)).body,
    );
    expect(updated).toMatchObject({ id: first.id, step: 2, basic: { name: 'نیمه‌کاره' } });
    expect(data<{ step: number }>((await api('admin').get(`/v1/projects/drafts/${first.id}`).expect(200)).body).step).toBe(2);

    const mine = data<{ id: string; wizardIncomplete: boolean }[]>((await api('admin').get('/v1/projects').expect(200)).body);
    expect(mine.find((row) => row.id === first.id)).toMatchObject({ wizardIncomplete: true });
    const others = data<{ id: string }[]>((await api('admin2').get('/v1/projects').expect(200)).body);
    expect(others.some((row) => row.id === first.id)).toBe(false);
    await api('admin2').get(`/v1/projects/drafts/${first.id}`).expect(404);

    test.clock.advance(91 * 86_400_000);
    await test.app.get(ProjectPurge).onTick();
    await api('admin').get(`/v1/projects/drafts/${first.id}`).expect(404);
  });
});

describe('برش ۱ — دعوت در ویزارد', () => {
  async function createFrom(body: object) {
    const draft = data<{ id: string }>((await api('admin').post('/v1/projects/drafts', body).expect(201)).body);
    return { response: await api('admin').post(`/v1/projects/drafts/${draft.id}/create`) };
  }

  it('§۷.۱.۲۹ پس از برش ۱ — دعوت با شمارهٔ همراه در ویزارد کاربر invited و دعوت ۷روزه می‌سازد', async () => {
    const { response } = await createFrom(
      draftBody({
        basic: { code: `PRJ-${year()}-070` },
        team: { members: [{ userId: null, fullName: '0912 999 0000', avatarTone: 'a1', inviteTarget: '0912 999 0000', roles: ['supervisor'], note: null }] },
      }),
    );
    expect(response.status).toBe(201);
    const projectId = data<{ projectId: string }>(response.body).projectId;
    const { rows } = await test.owner.query<{ status: string; role_codes: string[]; user_status: string }>(
      `select i.status, i.role_codes, u.status as user_status from invitation i join app_user u on u.id = i.user_id where i.project_id = $1`,
      [projectId],
    );
    expect(rows).toEqual([{ status: 'pending', role_codes: ['supervisor'], user_status: 'invited' }]);
    expect(test.sms.sent.at(-1)).toMatchObject({ to: '09129990000' });
  });
});
