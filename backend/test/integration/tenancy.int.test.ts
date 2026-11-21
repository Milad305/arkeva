import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Project } from '../../src/modules/projects/domain/project.entity.js';
import { applyTenant, TENANT_FILTER } from '../../src/platform/database/tenant.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { refresh, signIn } from './support/auth.js';

// چندمستأجری و فهرست پروژه (D12؛ F02 ۱۲؛ docs/backend/05 ۴، 09 ۴ AC-PL-08).

let test: TestApp;

// کدهای خطای پستگرس (مستقل از زبان پیام سرور): RLS و نبود مجوز هر دو 42501؛ تریگر reject_mutation با P0001
const INSUFFICIENT_PRIVILEGE = '42501';
const RAISE_EXCEPTION = 'P0001';
let alpha: SeededOrg<'admin' | 'pm' | 'reviewer' | 'outsider', 'tower' | 'bridge' | 'tunnel'>;
let beta: SeededOrg<'admin', 'mall'>;

interface ListItem {
  id: string;
  code: string;
  status: string;
  manager: { id: string };
  memberCount: number;
  progress: null;
}
const items = (body: unknown): ListItem[] => (body as { data: ListItem[] }).data;

beforeAll(async () => {
  test = await startTestApp();
  alpha = await seedOrg(test.owner, {
    name: 'سازمان الف',
    users: {
      admin: { mobile: '09125000001', orgAdmin: true },
      pm: { mobile: '09125000002' },
      reviewer: { mobile: '09125000003' },
      outsider: { mobile: '09125000004' },
    },
    projects: {
      tower: { code: 'PRJ-1405-001', manager: 'pm', members: { pm: 'project_manager', reviewer: 'reviewer' } },
      bridge: { code: 'PRJ-1405-002', manager: 'pm', status: 'paused', members: { pm: 'project_manager' } },
      tunnel: { code: 'PRJ-1404-003', manager: 'admin', status: 'draft' },
    },
  });
  beta = await seedOrg(test.owner, {
    name: 'سازمان ب',
    users: { admin: { mobile: '09126000001', orgAdmin: true } },
    // همان کد پروژه در سازمان دیگر مجاز است (یکتایی درون سازمان)
    projects: { mall: { code: 'PRJ-1405-001', manager: 'admin' } },
  });
});

afterAll(async () => {
  await test?.close();
});

async function listAs(ip: string, mobile: string, status: number, query = '') {
  const { accessToken } = await signIn(test, ip, mobile);
  return test.http(ip).get(`/v1/projects${query}`).set('Authorization', `Bearer ${accessToken}`).expect(status);
}

describe('F02 ۱۲ — فهرست پروژه‌ها (W07)', () => {
  it('F02 ۱۲ — مدیر سازمان همهٔ پروژه‌های سازمان خودش را می‌بیند', async () => {
    const response = await listAs('10.5.0.1', '09125000001', 200);
    const list = items(response.body);
    expect(list.map((item) => item.id).sort()).toEqual(Object.values(alpha.projects).sort());
    const tower = list.find((item) => item.id === alpha.projects.tower);
    expect(tower).toMatchObject({ code: 'PRJ-1405-001', manager: { id: alpha.users.pm.id }, memberCount: 2, progress: null });
  });

  it('F02 ۱۲ — غیرمدیر فقط پروژه‌هایی را می‌بیند که عضو است و project.view دارد', async () => {
    const pm = items((await listAs('10.5.0.2', '09125000002', 200)).body);
    expect(pm.map((item) => item.id).sort()).toEqual([alpha.projects.tower, alpha.projects.bridge].sort());

    // سرپرست (SS) عمداً اینجا نیست: «project.view … SS با اپ» در access-control.md ۵.۴ پرسش باز است (code-mapping §۷.۳)
    const reviewer = items((await listAs('10.5.0.3', '09125000003', 200)).body);
    expect(reviewer.map((item) => item.id)).toEqual([alpha.projects.tower]);
  });

  it('07 ۵ — کاربر بی‌عضویت و غیرمدیر: ۴۰۳ PERMISSION_DENIED', async () => {
    const response = await listAs('10.5.0.4', '09125000004', 403);
    expect(response.body).toMatchObject({ code: 'PERMISSION_DENIED', details: { requiredPermission: 'project.view' } });
  });

  it('F02 ۱۲ — فیلتر وضعیت و جستجو روی همان دامنهٔ دسترسی', async () => {
    const paused = items((await listAs('10.5.0.5', '09125000002', 200, '?status=paused')).body);
    expect(paused.map((item) => item.id)).toEqual([alpha.projects.bridge]);
    const searched = items((await listAs('10.5.0.6', '09125000001', 200, '?q=1404')).body);
    expect(searched.map((item) => item.id)).toEqual([alpha.projects.tunnel]);
  });

  it('07 ۱ — بی توکن ۴۰۱ AUTH_REQUIRED', async () => {
    const response = await test.http('10.5.0.7').get('/v1/projects').expect(401);
    expect(response.body).toMatchObject({ code: 'AUTH_REQUIRED' });
  });
});

describe('AC-PL-08 — دو سازمان', () => {
  it('AC-PL-08 — فهرست سازمان ب هیچ پروژهٔ سازمان الف را ندارد و برعکس', async () => {
    const list = items((await listAs('10.6.0.1', '09126000001', 200)).body);
    expect(list.map((item) => item.id)).toEqual([beta.projects.mall]);
  });

  it('AC-PL-08 — شیء سازمان دیگر نه با فیلتر tenant پیدا می‌شود و نه با فیلتر خاموش (RLS)', async () => {
    const orm = test.app.get(MikroORM);
    await RequestContext.create(orm.em, async () => {
      const em = orm.em.fork();
      applyTenant(em, beta.orgId);
      expect(await em.findOne(Project, { id: alpha.projects.tower })).toBeNull();
      // حتی اگر کدی فیلتر ORM را خاموش کند، RLS پستگرس ردیف سازمان دیگر را برنمی‌گرداند
      expect(await em.findOne(Project, { id: alpha.projects.tower }, { filters: { [TENANT_FILTER]: false } })).toBeNull();
      const own = await em.findOne(Project, { id: beta.projects.mall });
      expect(own?.orgId).toBe(beta.orgId);
    });
  });

  it('AC-PL-08 — کوکی تازه‌سازی با پیشوند سازمان دیگر ۴۰۱', async () => {
    const { cookie } = await signIn(test, '10.6.0.2', '09125000002');
    const [, sessionId, secret] = cookie.split('.');
    const forged = `${beta.orgId}.${sessionId}.${secret}`;
    const response = await refresh(test.http('10.6.0.2'), forged).expect(401);
    expect(response.body).toMatchObject({ code: 'SESSION_EXPIRED' });
    // نشست اصلی سالم می‌ماند
    await refresh(test.http('10.6.0.2'), cookie).expect(200);
  });
});

describe('05 ۴ — RLS روی نقش اپ', () => {
  async function asApp<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
    const client = new pg.Client({ connectionString: test.db.appUrl });
    await client.connect();
    try {
      return await work(client);
    } finally {
      await client.end();
    }
  }

  it('AC-PL-08 — پرس‌وجوی بدون set_config صفر ردیف برمی‌گرداند', async () => {
    await asApp(async (client) => {
      for (const table of ['project', 'app_user', 'project_member', 'organization', 'auth_session', 'login_attempt']) {
        const { rows } = await client.query<{ count: string }>(`select count(*)::text as count from ${table}`);
        expect({ table, count: rows[0]?.count }).toEqual({ table, count: '0' });
      }
    });
  });

  it('05 ۴ — با set_config فقط ردیف‌های همان سازمان', async () => {
    await asApp(async (client) => {
      await client.query('begin');
      await client.query(`select set_config('app.org_id', $1, true)`, [alpha.orgId]);
      const { rows } = await client.query<{ org_id: string }>('select distinct org_id from project');
      expect(rows).toEqual([{ org_id: alpha.orgId }]);
      await client.query('rollback');
    });
  });

  it('05 ۴ — نوشتن ردیف برای سازمان دیگر با WITH CHECK رد می‌شود', async () => {
    await asApp(async (client) => {
      await client.query('begin');
      await client.query(`select set_config('app.org_id', $1, true)`, [alpha.orgId]);
      await expect(
        client.query(`update project set name = 'نفوذ' where id = $1`, [beta.projects.mall]).then((result) => result.rowCount),
      ).resolves.toBe(0);
      await expect(
        client.query(`update project set org_id = $1 where id = $2`, [beta.orgId, alpha.projects.tower]),
      ).rejects.toMatchObject({ code: INSUFFICIENT_PRIVILEGE });
      await client.query('rollback');
    });
  });

  it('05 ۴ — نقش اپ سوپریوزر نیست، RLS را دور نمی‌زند و مالک جدول نیست', async () => {
    await asApp(async (client) => {
      const { rows } = await client.query<{ rolsuper: boolean; rolbypassrls: boolean; owns: boolean }>(
        `select r.rolsuper, r.rolbypassrls,
                exists (select 1 from pg_tables t where t.schemaname = 'public' and t.tableowner = r.rolname) as owns
           from pg_roles r where r.rolname = current_user`,
      );
      expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, owns: false });
    });
  });
});

describe('F01 ۴ — login_attempt فقط‌افزودنی', () => {
  it('05 ۵ — نقش اپ نمی‌تواند تلاش ورود را ویرایش یا حذف کند (مجوز)', async () => {
    await signIn(test, '10.7.0.1', '09125000001');
    const client = new pg.Client({ connectionString: test.db.appUrl });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('app.org_id', $1, true)`, [alpha.orgId]);
      const { rows } = await client.query<{ count: string }>('select count(*)::text as count from login_attempt');
      expect(Number(rows[0]?.count)).toBeGreaterThan(0);
      await expect(client.query(`update login_attempt set result = 'success'`)).rejects.toMatchObject({ code: INSUFFICIENT_PRIVILEGE });
      await client.query('rollback');
      await client.query('begin');
      await client.query(`select set_config('app.org_id', $1, true)`, [alpha.orgId]);
      await expect(client.query('delete from login_attempt')).rejects.toMatchObject({ code: INSUFFICIENT_PRIVILEGE });
      await client.query('rollback');
    } finally {
      await client.end();
    }
  });

  it('05 ۵ — حتی نقش مالک با تریگر رد می‌شود', async () => {
    await expect(test.owner.query(`update login_attempt set result = 'success'`)).rejects.toMatchObject({ code: RAISE_EXCEPTION });
    await expect(test.owner.query('delete from login_attempt')).rejects.toMatchObject({ code: RAISE_EXCEPTION });
    const { rows } = await test.owner.query<{ count: string }>('select count(*)::text as count from login_attempt');
    expect(Number(rows[0]?.count)).toBeGreaterThan(0);
  });
});
