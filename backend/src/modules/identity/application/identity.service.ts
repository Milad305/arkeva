import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { isPermission, type Permission, type PermissionScope } from '@projeyar/shared';
import { OrgRoleCustom, OrgRoleGrant, Role, RolePermission } from '../domain/role.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { User } from '../domain/user.entity.js';

// API عمومی ماژول identity برای ماژول‌های دیگر (docs/backend/01 ۴، ۷). فقط خواندن.

/** خلاصهٔ فرد برای ردیف‌ها و آواتارها — همان `PersonRef` فرانت. */
export interface MemberProfile {
  readonly id: string;
  readonly fullName: string;
  readonly avatarTone: string;
  readonly mobile: string;
  readonly status: string;
  readonly lastActiveAt: Date | null;
}

export interface PersonRef {
  readonly id: string;
  readonly fullName: string;
  readonly avatarTone: string;
}

/** ردیف فهرست کاربران سازمان برای انتخاب مدیر و عضو (W48، W16) — همان OrgDirectoryUserDto فرانت. */
export interface DirectoryUser {
  readonly userId: string;
  readonly fullName: string;
  readonly avatarTone: string;
  readonly contact: string;
  readonly note: string;
}

export interface RoleGrant {
  readonly roleCode: string;
  readonly isSystem: boolean;
  readonly permissions: ReadonlyMap<Permission, PermissionScope>;
}

@Injectable()
export class IdentityService {
  constructor(private readonly em: EntityManager) {}

  async isOrgAdmin(userId: string): Promise<boolean> {
    const user = await this.em.findOne(User, { id: userId }, { fields: ['isOrgAdmin'] });
    return user?.isOrgAdmin ?? false;
  }

  /** ایمیل کاربران فعال برای ارسال گزارش (F18 ۷.۴). */
  async emails(userIds: readonly string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await this.em.find(User, { id: { $in: [...userIds] }, status: 'active' }, { fields: ['id', 'email'] });
    return new Map(users.flatMap((user) => (user.email ? [[user.id, user.email] as const] : [])));
  }

  /** نام سازمان برای سرصفحهٔ گزارش (F18 ۷.۲). */
  async orgName(orgId: string): Promise<string> {
    return (await this.em.findOne(Organization, { id: orgId }))?.name ?? '';
  }

  async personRefs(userIds: readonly string[]): Promise<Map<string, PersonRef>> {
    if (userIds.length === 0) return new Map();
    const users = await this.em.find(User, { id: { $in: [...new Set(userIds)] } }, { fields: ['fullName', 'avatarTone'] });
    return new Map(users.map((user) => [user.id, { id: user.id, fullName: user.fullName, avatarTone: user.avatarTone }]));
  }

  /** نمایهٔ اعضا برای W16: نام، رنگ، موبایل، وضعیت و آخرین فعالیت (موبایل را فراخواننده با team.manage نشان می‌دهد). */
  async memberProfiles(userIds: readonly string[]): Promise<Map<string, MemberProfile>> {
    if (userIds.length === 0) return new Map();
    const users = await this.em.find(User, { id: { $in: [...new Set(userIds)] } }, { fields: ['fullName', 'avatarTone', 'mobile', 'status', 'lastActiveAt'] });
    return new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          fullName: user.fullName,
          avatarTone: user.avatarTone,
          mobile: user.mobile,
          status: user.status,
          lastActiveAt: user.lastActiveAt ?? null,
        },
      ]),
    );
  }

  /** دسترسی‌های هر نقش (سیستمی یا سفارشی همین سازمان؛ RLS نقش سازمان دیگر را پنهان می‌کند). */
  async roleGrants(roleIds: readonly string[]): Promise<Map<string, RoleGrant>> {
    if (roleIds.length === 0) return new Map();
    const ids = [...new Set(roleIds)];
    const [roles, defaults, customized, overrides] = await Promise.all([
      this.em.find(Role, { id: { $in: ids } }),
      this.em.find(RolePermission, { roleId: { $in: ids } }),
      this.em.find(OrgRoleCustom, { roleId: { $in: ids } }),
      this.em.find(OrgRoleGrant, { roleId: { $in: ids } }),
    ]);
    // نقش سیستمی که این سازمان عوضش کرده: دسترسی از OrgRoleGrant، نه پیش‌فرض سراسری (W27)
    const custom = new Set(customized.map((row) => row.roleId));
    const grants = [...defaults.filter((grant) => !custom.has(grant.roleId)), ...overrides];
    const byRole = new Map<string, Map<Permission, PermissionScope>>();
    for (const grant of grants) {
      if (!isPermission(grant.permissionCode)) continue; // کد حذف‌شده از کاتالوگ اثری ندارد
      const codes = byRole.get(grant.roleId) ?? new Map<Permission, PermissionScope>();
      codes.set(grant.permissionCode, grant.scope);
      byRole.set(grant.roleId, codes);
    }
    return new Map(roles.map((role) => [role.id, { roleCode: role.code, isSystem: role.isSystem, permissions: byRole.get(role.id) ?? new Map() }]));
  }

  /** کاربران فعالِ این سازمان از میان شناسه‌ها (RLS سازمان‌های دیگر را پنهان می‌کند). */
  async activeUserIds(userIds: readonly string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const users = await this.em.find(User, { id: { $in: [...new Set(userIds)] }, status: 'active' }, { fields: ['id'] });
    return new Set(users.map((user) => user.id));
  }

  /** جستجوی کاربران فعال سازمان در نام، موبایل و ایمیل (حداکثر ۸). */
  /** جستجوی W43: کاربران فعال با نام نرمال‌شده (`search_norm`). */
  async searchPeople(pattern: string, limit: number): Promise<{ id: string; fullName: string; jobTitle: string | null; avatarTone: string }[]> {
    const rows = await this.em.transactional((tx) =>
      tx
        .getConnection()
        .execute<{ id: string; full_name: string; job_title: string | null; avatar_tone: string }[]>(
          `select id, full_name, job_title, avatar_tone from app_user where status = 'active' and search_norm(full_name) like ? order by full_name limit ?`,
          [pattern, limit],
          'all',
          tx.getTransactionContext(),
        ),
    );
    return rows.map((row) => ({ id: row.id, fullName: row.full_name, jobTitle: row.job_title, avatarTone: row.avatar_tone }));
  }

  async directory(search: string, limit = 8): Promise<DirectoryUser[]> {
    const q = search.trim();
    const like = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const users = await this.em.find(
      User,
      q ? { status: 'active', $or: [{ fullName: { $ilike: like } }, { mobile: { $ilike: like } }, { email: { $ilike: like } }] } : { status: 'active' },
      { orderBy: { fullName: 'asc' }, limit },
    );
    return users.map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      avatarTone: user.avatarTone,
      contact: user.mobile,
      note: user.jobTitle ?? '',
    }));
  }
}
