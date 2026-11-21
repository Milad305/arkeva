import { type EntityManager, MikroORM, OptimisticLockError, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User } from '../../src/modules/identity/domain/user.entity.js';
import { Audit, auditSnapshot, SensitiveAuditFieldError } from '../../src/platform/audit/audit.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { mapError } from '../../src/platform/http/exception.filter.js';
import { messageFor } from '../../src/platform/http/messages.fa.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { login } from './support/auth.js';

// ممیزی (F20 ۶؛ docs/backend/05 ۱۰): AC-PL-05، قفل خودکار به‌عنوان کار سیستمی، AC-PL-11.

const INSUFFICIENT_PRIVILEGE = '42501';
const RAISE_EXCEPTION = 'P0001';

let test: TestApp;
let org: SeededOrg<'admin' | 'victim' | 'editor', never>;

interface AuditRow {
  actor_kind: string;
  actor_user_id: string | null;
  action: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  ip: string | null;
  trace_id: string | null;
}

async function auditRows(entityId: string): Promise<AuditRow[]> {
  const { rows } = await test.owner.query<AuditRow>(
    `select actor_kind, actor_user_id, action, entity_id, before, after, reason, ip, trace_id
       from audit_log where entity_id = $1 order by occurred_at`,
    [entityId],
  );
  return rows;
}

/** درون تراکنش سازمان، با یا بی کاربر احرازشده در زمینه. */
function inOrg<T>(work: (tx: EntityManager) => Promise<T>, actorUserId?: string): Promise<T> {
  const orm = test.app.get(MikroORM);
  const cls = test.app.get(ClsService);
  const context = test.app.get(AppContext);
  return cls.run(() => {
    context.setJobScope({ orgId: org.orgId, traceId: 'ERR-AB12-34' });
    if (actorUserId) context.setActor({ userId: actorUserId, orgId: org.orgId, sessionId: '00000000-0000-7000-8000-000000000001', client: 'web' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, org.orgId);
      return orm.em.transactional(work);
    });
  });
}

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان ممیزی',
    users: {
      admin: { mobile: '09129000001', orgAdmin: true },
      victim: { mobile: '09129000002' },
      editor: { mobile: '09129000003' },
    },
  });
});

afterAll(async () => {
  await test?.close();
});

describe('F20 ۶ — قفل خودکار حساب در ممیزی (تصمیم کاربر 1405/08/22)', () => {
  it('F20 ۶ — پنجمین رمز نادرست یک ردیف user.locked با بازیگر سیستم، IP و کد پیگیری می‌سازد', async () => {
    const agent = test.http('10.9.0.1');
    for (let index = 0; index < 4; index += 1) await login(agent, '09129000002', 'wrong').expect(401);
    expect(await auditRows(org.users.victim.id)).toEqual([]);
    const locked = await login(agent, '09129000002', 'wrong').set('X-Request-Id', 'ERR-1A2B-03').expect(423);
    expect(locked.headers['x-trace-id']).toBe('ERR-1A2B-03');

    const rows = await auditRows(org.users.victim.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor_kind: 'system',
      actor_user_id: null,
      action: 'user.locked',
      before: { status: 'active', lockedUntil: null },
      after: { status: 'locked', failedLoginCount: 5 },
      reason: 'ورودهای ناموفق پیاپی',
      ip: '10.9.0.1',
      trace_id: 'ERR-1A2B-03',
    });
    const keys = [...Object.keys(rows[0]?.before ?? {}), ...Object.keys(rows[0]?.after ?? {})];
    expect(keys.some((key) => /password|hash|token|secret/i.test(key))).toBe(false);

    // قفل‌ماندن (تلاش در زمان قفل) ردیف تازه نمی‌سازد
    await login(test.http('10.9.0.2'), '09129000002', 'wrong').expect(423);
    expect(await auditRows(org.users.victim.id)).toHaveLength(1);
  });
});

describe('AC-PL-05 — ممیزی فقط‌افزودنی و بی‌داده‌ٔ حساس', () => {
  it('AC-PL-05 — بازیگر کاربرِ زمینه ثبت می‌شود؛ عکس فقط فیلدهای فهرست سفید', async () => {
    await inOrg(async (tx) => {
      const user = await tx.findOneOrFail(User, { id: org.users.editor.id });
      test.app.get(Audit).record(tx, {
        action: 'user.updated',
        entityType: 'User',
        entityId: user.id,
        before: auditSnapshot(user, ['fullName', 'status']),
        after: { fullName: 'نام تازه', status: user.status },
      });
    }, org.users.admin.id);

    expect(await auditRows(org.users.editor.id)).toEqual([
      expect.objectContaining({
        actor_kind: 'user',
        actor_user_id: org.users.admin.id,
        action: 'user.updated',
        before: { fullName: 'کاربر editor', status: 'active' },
        after: { fullName: 'نام تازه', status: 'active' },
        ip: null,
        trace_id: 'ERR-AB12-34',
      }),
    ]);
  });

  it('AC-PL-05 — فیلد رمز یا توکن در before/after رد می‌شود و هیچ ردیفی ثبت نمی‌شود', async () => {
    await expect(
      inOrg(async (tx) => {
        const user = await tx.findOneOrFail(User, { id: org.users.editor.id });
        test.app.get(Audit).record(tx, {
          action: 'user.password_changed',
          entityType: 'User',
          entityId: user.id,
          after: { passwordHash: user.passwordHash },
        });
      }, org.users.admin.id),
    ).rejects.toBeInstanceOf(SensitiveAuditFieldError);
    expect((await auditRows(org.users.editor.id)).map((row) => row.action)).toEqual(['user.updated']);
  });

  it('AC-PL-05 — بی بازیگر کاربر و بی actor: system، یا بیرون از تراکنش، ثبت نمی‌شود', async () => {
    const audit = test.app.get(Audit);
    const entry = { action: 'x.y', entityType: 'User', entityId: org.users.editor.id, orgId: org.orgId };
    await expect(inOrg((tx) => Promise.resolve(audit.record(tx, entry)))).rejects.toThrow(/بازیگر ندارد/);
    const orm = test.app.get(MikroORM);
    RequestContext.create(orm.em, () => {
      expect(() => audit.record(orm.em, { ...entry, actor: 'system' })).toThrow(/درون تراکنش/);
    });
  });

  it('AC-PL-05 — نقش اپ نمی‌تواند ردیف ممیزی را ویرایش یا حذف کند؛ نقش مالک هم با تریگر رد می‌شود', async () => {
    const client = new pg.Client({ connectionString: test.db.appUrl });
    await client.connect();
    try {
      for (const statement of [`update audit_log set reason = 'دست‌کاری'`, 'delete from audit_log']) {
        await client.query('begin');
        await client.query(`select set_config('app.org_id', $1, true)`, [org.orgId]);
        await expect(client.query(statement)).rejects.toMatchObject({ code: INSUFFICIENT_PRIVILEGE });
        await client.query('rollback');
      }
    } finally {
      await client.end();
    }
    await expect(test.owner.query(`update audit_log set reason = 'دست‌کاری'`)).rejects.toMatchObject({ code: RAISE_EXCEPTION });
    await expect(test.owner.query('delete from audit_log')).rejects.toMatchObject({ code: RAISE_EXCEPTION });
  });

  it('F20 ۳.۱ — در domain_event فقط processed_at و attempts تغییرپذیرند', async () => {
    const client = new pg.Client({ connectionString: test.db.appUrl });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('app.org_id', $1, true)`, [org.orgId]);
      await expect(client.query(`update domain_event set type = 'X'`)).rejects.toMatchObject({ code: INSUFFICIENT_PRIVILEGE });
      await client.query('rollback');
    } finally {
      await client.end();
    }
    await test.owner.query(
      `insert into domain_event (id, org_id, type, payload, occurred_at) values (gen_random_uuid(), $1, 'MemberChanged', '{"v":1}', now())`,
      [org.orgId],
    );
    await expect(test.owner.query(`update domain_event set type = 'X'`)).rejects.toMatchObject({ code: RAISE_EXCEPTION });
    await expect(test.owner.query('delete from domain_event')).rejects.toMatchObject({ code: RAISE_EXCEPTION });
    await expect(test.owner.query('update domain_event set attempts = attempts + 1').then((result) => result.rowCount)).resolves.toBe(1);
  });
});

describe('AC-PL-11 — ویرایش هم‌زمان', () => {
  it('AC-PL-11 — دومین ذخیره با نسخهٔ کهنه ۴۰۹ VERSION_CONFLICT با پیام فارسی می‌گیرد', async () => {
    const orm = test.app.get(MikroORM);
    const load = async () => {
      const em = orm.em.fork();
      applyTenant(em, org.orgId);
      return { em, user: await em.findOneOrFail(User, { id: org.users.admin.id }) };
    };
    const first = await load();
    const second = await load();

    first.user.jobTitle = 'مدیر دفتر فنی';
    await first.em.flush();

    second.user.jobTitle = 'برنامه‌ریز';
    const failure = await second.em.flush().then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(OptimisticLockError);

    const mapped = mapError(failure);
    expect(mapped).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', retryable: false });
    expect(messageFor('VERSION_CONFLICT')).toMatch(/[؀-ۿ]/);
  });
});
