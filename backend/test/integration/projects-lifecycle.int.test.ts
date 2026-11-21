import type { ProjectRoleCode } from '@projeyar/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ROLE_IDS } from '../../src/database/system-ids.js';
import { ProjectPurge } from '../../src/modules/projects/application/project-purge.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// چرخهٔ عمر و منطقهٔ خطر پروژه (F02 ۸؛ AC-PS-08، AC-PS-09، AC-PS-11؛ AC-PL-08 روی HTTP).

type UserKey = 'admin' | 'pm' | 'reviewer' | 'planner' | 'outsider';
type ProjectKey =
  | 'view'
  | 'pause'
  | 'complete'
  | 'archiveFromPaused'
  | 'restoreArchived'
  | 'reopenCompleted'
  | 'readOnly'
  | 'deleteDraft'
  | 'deleteActive'
  | 'deleteArchived'
  | 'purgeArchived'
  | 'transfer'
  | 'concurrent';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let other: SeededOrg<'admin', 'foreign'>;
const tokens = {} as Record<UserKey | 'otherAdmin', string>;
let ipCounter = 0;
const nextIp = (): string => `10.40.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

const team: Readonly<Record<string, ProjectRoleCode>> = { pm: 'project_manager', reviewer: 'reviewer', planner: 'planner' };

function api(user: UserKey | 'otherAdmin') {
  const agent = test.http(nextIp());
  return {
    get: (path: string) => agent.get(path).set('Authorization', `Bearer ${tokens[user]}`),
    post: (path: string, body: object = {}) => agent.post(path).set('Authorization', `Bearer ${tokens[user]}`).send(body),
  };
}

const errorCode = (body: unknown): string => (body as { code: string }).code;

async function stepUp(user: UserKey, purpose: 'project.delete' | 'project.transfer_manager', projectId: string): Promise<string> {
  await api(user).post('/v1/auth/step-up', { purpose, subjectId: projectId }).expect(200);
  return test.sms.lastCode(org.users[user].mobile);
}

async function projectRow(id: string) {
  const { rows } = await test.owner.query<{ status: string; manager_user_id: string; deletion_purge_at: Date | null }>(
    'select status, manager_user_id, deletion_purge_at from project where id = $1',
    [id],
  );
  return rows[0];
}

async function events(projectId: string): Promise<{ type: string; payload: Record<string, unknown> }[]> {
  const { rows } = await test.owner.query<{ type: string; payload: Record<string, unknown> }>(
    'select type, payload from domain_event where project_id = $1 order by occurred_at, id',
    [projectId],
  );
  return rows;
}

async function audits(projectId: string): Promise<{ action: string; actor_kind: string; reason: string | null }[]> {
  const { rows } = await test.owner.query<{ action: string; actor_kind: string; reason: string | null }>(
    'select action, actor_kind, reason from audit_log where entity_id = $1 order by occurred_at, id',
    [projectId],
  );
  return rows;
}

beforeAll(async () => {
  test = await startTestApp();
  const at = (code: string, status: 'draft' | 'active' | 'paused' | 'completed' | 'archived' = 'active') => ({
    code,
    status,
    manager: 'pm' as const,
    members: team,
  });
  org = await seedOrg(test.owner, {
    name: 'سازمان چرخهٔ عمر',
    users: {
      admin: { mobile: '09131000001', orgAdmin: true },
      pm: { mobile: '09131000002' },
      reviewer: { mobile: '09131000003' },
      planner: { mobile: '09131000004' },
      outsider: { mobile: '09131000005' },
    },
    projects: {
      view: at('PRJ-1405-201'),
      pause: at('PRJ-1405-202'),
      complete: at('PRJ-1405-203'),
      archiveFromPaused: at('PRJ-1405-204', 'paused'),
      restoreArchived: at('PRJ-1405-205', 'archived'),
      reopenCompleted: at('PRJ-1405-206', 'completed'),
      readOnly: at('PRJ-1405-207', 'archived'),
      deleteDraft: at('PRJ-1405-208', 'draft'),
      deleteActive: at('PRJ-1405-209'),
      deleteArchived: at('PRJ-1405-210', 'archived'),
      purgeArchived: at('PRJ-1405-211', 'archived'),
      transfer: at('PRJ-1405-212'),
      concurrent: at('PRJ-1405-213'),
    },
  });
  other = await seedOrg(test.owner, {
    name: 'سازمان دیگر',
    users: { admin: { mobile: '09132000001', orgAdmin: true } },
    projects: { foreign: { code: 'PRJ-1405-201', manager: 'admin' } },
  });
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  tokens.otherAdmin = (await signIn(test, nextIp(), other.users.admin.mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F02 ۱۲ — جزئیات پروژه', () => {
  it('F02 ۱۲ — عضو جزئیات را می‌گیرد؛ ذخیرهٔ احتیاطی فقط با cbs.view_amounts (D11)', async () => {
    const asPm = await api('pm').get(`/v1/projects/${org.projects.view}`).expect(200);
    const detail = (asPm.body as { data: Record<string, unknown> }).data;
    expect(detail).toMatchObject({
      id: org.projects.view,
      code: 'PRJ-1405-201',
      status: 'active',
      managerUserId: org.users.pm.id,
      contingencyReserve: '0',
      plan: { baseline: null, current: null, pvReference: null, draft: null },
      counts: { members: 3, pendingReports: 0 },
      display: { warningThreshold: 5, criticalThreshold: 15, showFinancialProgress: false },
    });
    const asReviewer = await api('reviewer').get(`/v1/projects/${org.projects.view}`).expect(200);
    expect((asReviewer.body as { data: Record<string, unknown> }).data).not.toHaveProperty('contingencyReserve');
  });

  it('07 ۴ — غیرعضو ۴۰۴ می‌گیرد، نه ۴۰۳', async () => {
    const response = await api('outsider').get(`/v1/projects/${org.projects.view}`).expect(404);
    expect(errorCode(response.body)).toBe('PROJECT_NOT_FOUND');
  });

  it('AC-PL-08 — شناسهٔ پروژهٔ سازمان دیگر حتی برای مدیر سازمان ۴۰۴ است', async () => {
    const response = await api('otherAdmin').get(`/v1/projects/${org.projects.view}`).expect(404);
    expect(errorCode(response.body)).toBe('PROJECT_NOT_FOUND');
    await api('otherAdmin').post(`/v1/projects/${org.projects.view}/pause`).expect(404);
    expect((await projectRow(org.projects.view))?.status).toBe('active');
  });
});

describe('F02 ۸ — چرخهٔ عمر از موتور گردش کار', () => {
  it('F02 ۸.۲ — توقف و ادامه با ممیزی و رویداد ProjectStatusChanged در همان تراکنش', async () => {
    const id = org.projects.pause;
    expect((await api('pm').post(`/v1/projects/${id}/pause`).expect(200)).body).toEqual({ success: true, data: { id, status: 'paused' } });
    const again = await api('pm').post(`/v1/projects/${id}/pause`).expect(409);
    expect(errorCode(again.body)).toBe('TRANSITION_NOT_ALLOWED');
    await api('pm').post(`/v1/projects/${id}/resume`).expect(200);

    expect(await events(id)).toEqual([
      { type: 'ProjectStatusChanged', payload: { v: 1, action: 'pause', from: 'active', to: 'paused' } },
      { type: 'ProjectStatusChanged', payload: { v: 1, action: 'resume', from: 'paused', to: 'active' } },
    ]);
    expect((await audits(id)).map((row) => row.action)).toEqual(['project.pause', 'project.resume']);
  });

  it('access-control ۵.۴ — ناظر کد project.pause ندارد: ۴۰۳', async () => {
    const response = await api('reviewer').post(`/v1/projects/${org.projects.view}/pause`).expect(403);
    expect(response.body).toMatchObject({ code: 'PERMISSION_DENIED', details: { requiredPermission: 'project.pause' } });
  });

  it('F02 ۸.۳ — اعلام پایان بی دلیل ۴۲۲ و با دلیل تمام‌شده؛ دلیل در ممیزی', async () => {
    const id = org.projects.complete;
    expect(errorCode((await api('pm').post(`/v1/projects/${id}/complete`, { reason: ' ' }).expect(422)).body)).toBe('REASON_REQUIRED');
    await api('pm').post(`/v1/projects/${id}/complete`, { reason: 'تحویل موقت انجام شد' }).expect(200);
    expect(await audits(id)).toEqual([{ action: 'project.complete', actor_kind: 'user', reason: 'تحویل موقت انجام شد' }]);
  });

  it('F02 ۸.۴ — بایگانی از متوقف؛ بازگردانی فقط مدیر سازمان', async () => {
    await api('pm').post(`/v1/projects/${org.projects.archiveFromPaused}/archive`, { reason: 'تعلیق طولانی' }).expect(200);
    expect((await projectRow(org.projects.archiveFromPaused))?.status).toBe('archived');

    const denied = await api('pm').post(`/v1/projects/${org.projects.restoreArchived}/restore`).expect(403);
    expect(denied.body).toMatchObject({ details: { requiredPermission: 'project.restore' } });
    await api('admin').post(`/v1/projects/${org.projects.restoreArchived}/restore`).expect(200);
    expect((await projectRow(org.projects.restoreArchived))?.status).toBe('active');
  });

  it('F02 ۸.۳ — بازگشت از پایان: مدیر سازمان با دلیل اجباری (تصمیم کاربر 1405/08/22)', async () => {
    const id = org.projects.reopenCompleted;
    expect(errorCode((await api('admin').post(`/v1/projects/${id}/restore`).expect(422)).body)).toBe('REASON_REQUIRED');
    await api('admin').post(`/v1/projects/${id}/restore`, { reason: 'پایان اشتباهی اعلام شد' }).expect(200);
    expect(await audits(id)).toEqual([{ action: 'project.reopen', actor_kind: 'user', reason: 'پایان اشتباهی اعلام شد' }]);
  });

  it('AC-PS-11 — پروژهٔ بایگانی‌شده جز بازگردانی هیچ تغییری نمی‌پذیرد', async () => {
    const id = org.projects.readOnly;
    expect(errorCode((await api('pm').post(`/v1/projects/${id}/pause`).expect(409)).body)).toBe('TRANSITION_NOT_ALLOWED');
    expect(errorCode((await api('pm').post(`/v1/projects/${id}/complete`, { reason: 'x' }).expect(409)).body)).toBe('TRANSITION_NOT_ALLOWED');
    const transfer = await api('pm').post(`/v1/projects/${id}/transfer-manager`, { userId: org.users.planner.id, otp: '123456' }).expect(409);
    expect(errorCode(transfer.body)).toBe('PROJECT_READ_ONLY');
    expect(await events(id)).toEqual([]);
  });

  it('05 ۹ — دو توقف هم‌زمان: یکی موفق، دیگری ۴۰۹؛ یک رویداد', async () => {
    const id = org.projects.concurrent;
    const responses = await Promise.all([api('pm').post(`/v1/projects/${id}/pause`), api('admin').post(`/v1/projects/${id}/pause`)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await events(id)).toHaveLength(1);
  });
});

describe('F02 ۸.۴ — انتقال مدیریت با کد پیامکی (AC-PS-08)', () => {
  it('F02 ۸.۴ — بی درخواست کد ۴۰۳ STEP_UP_REQUIRED؛ کد نادرست ۴۲۲', async () => {
    const id = org.projects.transfer;
    const body = { userId: org.users.planner.id, otp: '000000' };
    expect(errorCode((await api('pm').post(`/v1/projects/${id}/transfer-manager`, body).expect(403)).body)).toBe('STEP_UP_REQUIRED');
    const code = await stepUp('pm', 'project.transfer_manager', id);
    const wrong = code === '111111' ? '222222' : '111111';
    const invalid = await api('pm').post(`/v1/projects/${id}/transfer-manager`, { ...body, otp: wrong }).expect(422);
    expect(invalid.body).toMatchObject({ code: 'OTP_INVALID', details: { remainingAttempts: 4 } });
  });

  it('F02 ۸.۴ — هدف غیرعضو یا خود مدیر رد می‌شود پیش از مصرف کد', async () => {
    const id = org.projects.transfer;
    for (const userId of [org.users.outsider.id, org.users.pm.id]) {
      const response = await api('pm').post(`/v1/projects/${id}/transfer-manager`, { userId, otp: '123456' }).expect(422);
      expect(errorCode(response.body)).toBe('PROJECT_MANAGER_TARGET_INVALID');
    }
  });

  it('AC-PS-08 — مدیر تازه نقش مدیر پروژه و مدیر قبلی برنامه‌ریز می‌گیرد؛ ممیزی و رویداد؛ کد یک‌بارمصرف', async () => {
    const id = org.projects.transfer;
    test.clock.advance(61_000); // ارسال دوباره پس از ۶۰ ثانیه
    const code = await stepUp('pm', 'project.transfer_manager', id);
    const response = await api('pm').post(`/v1/projects/${id}/transfer-manager`, { userId: org.users.planner.id, otp: code }).expect(200);
    expect((response.body as { data: { managerName: string } }).data.managerName).toBe('کاربر planner');
    expect((await projectRow(id))?.manager_user_id).toBe(org.users.planner.id);
    const { rows: [settings] } = await test.owner.query<{ alternate_reviewer_user_id: string }>(
      'select alternate_reviewer_user_id from project_settings where project_id = $1',
      [id],
    );
    expect(settings?.alternate_reviewer_user_id).toBe(org.users.planner.id);

    const { rows } = await test.owner.query<{ user_id: string; role_id: string }>(
      `select m.user_id, r.role_id from project_member m join project_member_role r on r.member_id = m.id where m.project_id = $1`,
      [id],
    );
    const rolesOf = (userId: string) => rows.filter((row) => row.user_id === userId).map((row) => row.role_id).sort();
    expect(rolesOf(org.users.planner.id)).toEqual([SYSTEM_ROLE_IDS.planner, SYSTEM_ROLE_IDS.project_manager].sort());
    expect(rolesOf(org.users.pm.id)).toEqual([SYSTEM_ROLE_IDS.planner]);

    expect(await events(id)).toEqual([
      { type: 'ProjectManagerTransferred', payload: { v: 1, fromUserId: org.users.pm.id, toUserId: org.users.planner.id } },
    ]);
    expect((await audits(id)).map((row) => row.action)).toEqual(['project.manager_transferred']);

    // همان کد دوباره پذیرفته نمی‌شود — حالا مدیر تازه می‌خواهد برگرداند
    const replay = await api('planner').post(`/v1/projects/${id}/transfer-manager`, { userId: org.users.pm.id, otp: code }).expect(403);
    expect(errorCode(replay.body)).toBe('STEP_UP_REQUIRED');
  });
});

describe('F02 ۸.۴ — حذف (AC-PS-09)', () => {
  it('AC-PS-09 — نام نادرست ۴۲۲؛ پیش‌نویس با نام و کد فوراً پاک می‌شود و ممیزی می‌ماند', async () => {
    const id = org.projects.deleteDraft;
    const mismatch = await api('pm').post(`/v1/projects/${id}/delete`, { confirmName: 'نام دیگر', otp: '123456' }).expect(422);
    expect(errorCode(mismatch.body)).toBe('PROJECT_DELETE_NAME_MISMATCH');

    const code = await stepUp('pm', 'project.delete', id);
    const response = await api('pm').post(`/v1/projects/${id}/delete`, { confirmName: 'پروژهٔ deleteDraft', otp: code }).expect(200);
    expect((response.body as { data: unknown }).data).toEqual({ id, purgeAfterDays: 0 });
    expect(await projectRow(id)).toBeUndefined();
    expect((await audits(id)).map((row) => row.action)).toEqual(['project.deleted']);
    expect((await events(id)).map((row) => row.type)).toEqual(['ProjectDeletionRequested']);
  });

  it('F02 ۸.۴ — پروژهٔ فعال حذف نمی‌شود', async () => {
    const response = await api('admin').post(`/v1/projects/${org.projects.deleteActive}/delete`, { confirmName: 'پروژهٔ deleteActive', otp: '123456' }).expect(409);
    expect(errorCode(response.body)).toBe('PROJECT_DELETE_NOT_ALLOWED');
  });

  it('F02 ۸.۴ — بایگانی‌شده: مدیر پروژه ۴۰۳؛ مدیر سازمان ۱۴ روز مهلت؛ پنهان؛ لغو فقط با مدیر سازمان', async () => {
    const id = org.projects.deleteArchived;
    const denied = await api('pm').post(`/v1/projects/${id}/delete`, { confirmName: 'پروژهٔ deleteArchived', otp: '123456' }).expect(403);
    expect(errorCode(denied.body)).toBe('PERMISSION_DENIED');

    const code = await stepUp('admin', 'project.delete', id);
    const response = await api('admin').post(`/v1/projects/${id}/delete`, { confirmName: 'پروژهٔ deleteArchived', otp: code }).expect(200);
    expect((response.body as { data: unknown }).data).toEqual({ id, purgeAfterDays: 14 });

    await api('pm').get(`/v1/projects/${id}`).expect(404);
    const list = await api('admin').get('/v1/projects').expect(200);
    expect((list.body as { data: { id: string }[] }).data.some((item) => item.id === id)).toBe(false);

    await api('pm').post(`/v1/projects/${id}/delete/cancel`).expect(403);
    await api('admin').post(`/v1/projects/${id}/delete/cancel`).expect(200);
    await api('pm').get(`/v1/projects/${id}`).expect(200);
    expect((await audits(id)).map((row) => row.action)).toEqual(['project.deletion_requested', 'project.deletion_cancelled']);
    expect((await events(id)).map((row) => row.type)).toEqual(['ProjectDeletionRequested', 'ProjectDeletionCancelled']);
  });

  it('AC-PS-09 — پس از ۱۴ روز PurgeTick پروژه را کامل پاک می‌کند؛ ممیزی سیستمی با نام و کد', async () => {
    const id = org.projects.purgeArchived;
    const code = await stepUp('admin', 'project.delete', id);
    await api('admin').post(`/v1/projects/${id}/delete`, { confirmName: 'پروژهٔ purgeArchived', otp: code }).expect(200);

    const purge = test.app.get(ProjectPurge);
    expect(await purge.onTick()).toBe(0); // هنوز در مهلت
    test.clock.advance(14 * 86_400_000 + 1_000);
    expect(await purge.onTick()).toBe(1);
    await waitFor(async () => (await projectRow(id)) === undefined);

    const { rows } = await test.owner.query<{ count: string }>('select count(*)::text as count from project_member where project_id = $1', [id]);
    expect(rows[0]?.count).toBe('0');
    expect(await audits(id)).toEqual([
      { action: 'project.deletion_requested', actor_kind: 'user', reason: null },
      { action: 'project.purged', actor_kind: 'system', reason: 'پایان مهلت ۱۴ روزهٔ حذف' },
    ]);
    // پس از مهلت لغو ممکن نیست
    await api('admin').post(`/v1/projects/${id}/delete/cancel`).expect(409);
  });
});

describe('F02 ۸.۴ — درخواست کد تأیید', () => {
  it('F02 ۸.۴ — ارسال دوباره زودتر از ۶۰ ثانیه ۴۲۹؛ کد به موبایل خود کاربر می‌رود', async () => {
    const id = org.projects.view;
    const first = await api('admin').post('/v1/auth/step-up', { purpose: 'project.delete', subjectId: id }).expect(200);
    expect((first.body as { data: unknown }).data).toEqual({ maskedMobile: '0913 *** 0001', expiresInSec: 300, resendAfterSec: 60 });
    const again = await api('admin').post('/v1/auth/step-up', { purpose: 'project.delete', subjectId: id }).expect(429);
    expect(errorCode(again.body)).toBe('OTP_RESEND_TOO_SOON');
    expect(errorCode((await api('admin').post('/v1/auth/step-up', { purpose: 'user.delete', subjectId: id }).expect(400)).body)).toBe('VALIDATION_FAILED');
  });
});
