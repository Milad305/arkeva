import { hash } from '@node-rs/argon2';
import type { ProjectRoleCode } from '@projeyar/shared';
import type pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { SYSTEM_ROLE_IDS } from '../../src/database/system-ids.js';

// سازندهٔ دادهٔ تست (docs/backend/09 ۶): یک سازمان با کاربر و پروژه، با نقش مالک (بیرون از RLS).
// هر تست سازمان خودش را می‌سازد و به دادهٔ تست دیگر وابسته نیست.

export const TEST_PASSWORD = 'Test-Pass-1405';

const WORK_WEEK = JSON.stringify(
  (['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const).map((day) => ({ day, mode: day === 'fri' ? 'off' : day === 'thu' ? 'half' : 'full' })),
);

let passwordHash: Promise<string> | null = null;
const testPasswordHash = (): Promise<string> =>
  (passwordHash ??= hash(TEST_PASSWORD, { memoryCost: 19_456, timeCost: 2, parallelism: 1 }));

export interface UserSpec {
  readonly mobile: string;
  readonly fullName?: string;
  readonly email?: string;
  readonly orgAdmin?: boolean;
  readonly twoFactor?: boolean;
  readonly status?: 'active' | 'invited' | 'locked' | 'disabled';
}

export interface ProjectSpec {
  readonly code: string;
  readonly name?: string;
  readonly status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  /** کلید کاربر مدیر پروژه در `users`. */
  readonly manager: string;
  /** عضویت‌ها: کلید کاربر ← نقش سیستمی. */
  readonly members?: Readonly<Record<string, ProjectRoleCode>>;
}

export interface OrgSpec<U extends string, P extends string> {
  readonly name: string;
  readonly users: Readonly<Record<U, UserSpec>>;
  readonly projects?: Readonly<Record<P, ProjectSpec>>;
}

export interface SeededOrg<U extends string, P extends string> {
  readonly orgId: string;
  readonly users: Readonly<Record<U, { readonly id: string; readonly mobile: string }>>;
  readonly projects: Readonly<Record<P, string>>;
}

export async function seedOrg<U extends string, P extends string = never>(
  owner: pg.Pool,
  spec: OrgSpec<U, P>,
): Promise<SeededOrg<U, P>> {
  const orgId = uuidv7();
  const now = new Date().toISOString();
  const preferences = JSON.stringify({ calendar: 'jalali', digits: 'fa', amountScale: 'auto', startPage: null });
  const users = {} as Record<U, { id: string; mobile: string }>;
  const projects = {} as Record<P, string>;
  const pwd = await testPasswordHash();

  const client = await owner.connect();
  try {
    await client.query('begin');
    await client.query('insert into organization (id, name, created_at) values ($1, $2, $3)', [orgId, spec.name, now]);
    await client.query(
      `insert into project_type (id, org_id, key, name, sort_order, created_at) values ($1, $2, 'residential', 'ساختمانی', 0, $3)`,
      [uuidv7(), orgId, now],
    );

    for (const key of Object.keys(spec.users) as U[]) {
      const user = spec.users[key];
      const id = uuidv7();
      await client.query(
        `insert into app_user (id, org_id, full_name, mobile, email, password_hash, two_factor_enabled, status, is_org_admin,
           password_changed_at, preferences, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $10, $10)`,
        [id, orgId, user.fullName ?? `کاربر ${key}`, user.mobile, user.email ?? null, pwd, user.twoFactor ?? true,
          user.status ?? 'active', user.orgAdmin ?? false, now, preferences],
      );
      users[key] = { id, mobile: user.mobile };
    }

    for (const key of Object.keys(spec.projects ?? {}) as P[]) {
      const project = (spec.projects as Record<P, ProjectSpec>)[key];
      const id = uuidv7();
      await client.query(
        `insert into project (id, org_id, code, name, client_name, project_type, status, manager_user_id, created_at, updated_at)
         values ($1, $2, $3, $4, 'کارفرمای آزمایشی', 'residential', $5, $6, $7, $7)`,
        [id, orgId, project.code, project.name ?? `پروژهٔ ${key}`, project.status ?? 'active', users[project.manager as U].id, now],
      );
      // همان ردیف‌هایی که ساخت پروژه می‌سازد (F02 ۵.۴): دفتر کد، تنظیمات، تقویم
      await client.query('insert into project_code_register (org_id, code, project_id, created_at) values ($1, $2, $3, $4)', [orgId, project.code, id, now]);
      await client.query(
        'insert into project_settings (project_id, org_id, alternate_reviewer_user_id, created_at, updated_at) values ($1, $2, $3, $4, $4)',
        [id, orgId, users[project.manager as U].id, now],
      );
      await client.query('insert into project_calendar (project_id, org_id, work_week, created_at, updated_at) values ($1, $2, $3, $4, $4)', [
        id,
        orgId,
        WORK_WEEK,
        now,
      ]);
      for (const [userKey, role] of Object.entries(project.members ?? {}) as [U, ProjectRoleCode][]) {
        const memberId = uuidv7();
        await client.query(
          `insert into project_member (id, org_id, project_id, user_id, status, created_at, updated_at) values ($1, $2, $3, $4, 'active', $5, $5)`,
          [memberId, orgId, id, users[userKey].id, now],
        );
        await client.query(
          `insert into project_member_role (id, org_id, member_id, role_id, created_at) values ($1, $2, $3, $4, $5)`,
          [uuidv7(), orgId, memberId, SYSTEM_ROLE_IDS[role], now],
        );
      }
      projects[key] = id;
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  return { orgId, users, projects };
}
