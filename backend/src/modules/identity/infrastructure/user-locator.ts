import type { EntityManager } from '@mikro-orm/postgresql';
import type { LoginIdentifier } from '../domain/rules/identifier.js';

// تنها جست‌وجوی پیش از شناخت سازمان (docs/backend/05 ۴). تابع SECURITY DEFINER پایگاه داده
// (migration اولیه) فقط شناسهٔ کاربر و سازمان را برمی‌گرداند؛ بقیهٔ ورود زیر RLS همان سازمان است.

export interface UserLocation {
  readonly userId: string;
  readonly orgId: string;
}

export async function locateUsers(em: EntityManager, identifier: LoginIdentifier): Promise<UserLocation[]> {
  if (!identifier.mobile && !identifier.email) return [];
  const rows = await em
    .getConnection()
    .execute<{ user_id: string; org_id: string }[]>('select user_id, org_id from auth_locate_user(?, ?)', [identifier.mobile, identifier.email]);
  return rows.map((row) => ({ userId: row.user_id, orgId: row.org_id }));
}
