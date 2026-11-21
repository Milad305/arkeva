import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import {
  ESSENTIAL_PERMISSIONS,
  type GrantedPermission,
  isPermission,
  PERMISSION_CATALOG,
  PERMISSION_CODES,
  type Permission,
  type PermissionScope,
  SYSTEM_ROLES,
  type SystemRole,
} from '@projeyar/shared';
import { ORG_ADMIN_ROLE_ID, SYSTEM_ROLE_IDS } from '../../../database/system-ids.js';
import { Audit } from '../../../platform/audit/audit.js';
import { AuditLog } from '../../../platform/audit/audit-log.entity.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { OrgRoleCustom, OrgRoleGrant, PERMISSION_SCOPES, Role, RolePermission } from '../domain/role.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { User } from '../domain/user.entity.js';
import { MembershipPort } from './ports.js';

// نقش‌ها و ماتریس دسترسی (W27؛ access-control ۵.۲–۵.۴ و ۵.۸). همه با roles.edit.
//   • نقش سیستمی: پیش‌فرض سراسری؛ تغییر هر سازمان در org_role_custom/org_role_grant. ذخیرهٔ برابر پیش‌فرض
//     = بازگشت به پیش‌فرض (حذف ردیف‌ها). حذف نمی‌شود (G17).
//   • مدیر سازمان همه‌چیز دارد و تغییر نمی‌کند (D11) — ردیف نمایشی با شناسهٔ ثابت.
//   • نقش سفارشی بی کپی هیچ دسترسی ندارد (OD-09)؛ تا تخصیص در عضویت (برش ۵) کاربری ندارد.
//   • هر ذخیره: ممیزی قبل/بعد با دلیل اختیاری (AC-AC-08) و رویداد RolePermissionChanged.

const ROLE_ORDER: SystemRole[] = ['org_admin', 'project_manager', 'planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'];
const COLORS: Record<SystemRole, string> = {
  org_admin: '#0E1E38',
  project_manager: '#E07A2C',
  planner: '#1A3354',
  reviewer: '#2563EB',
  supervisor: '#16A34A',
  client_reviewer: '#0891B2',
  finance: '#B45309',
};
const AUDIT_ACTIONS = ['role.permissions_changed', 'role.created', 'role.deleted'];

interface RoleRecord {
  readonly id: string;
  readonly systemKey: SystemRole | null;
  readonly name: string;
  readonly grants: GrantedPermission[];
  readonly defaults: GrantedPermission[] | null;
}

const grantKey = (grant: GrantedPermission): string => `${grant.code}:${grant.scope}`;
const sameGrants = (a: readonly GrantedPermission[], b: readonly GrantedPermission[]): boolean =>
  a.map(grantKey).sort().join('|') === b.map(grantKey).sort().join('|');

@Injectable()
export class Roles {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly memberships: MembershipPort,
  ) {}

  /** `GET /roles` — نقش‌ها و کاتالوگ. */
  async list() {
    const [records, counts] = await Promise.all([this.records(this.em), this.userCounts()]);
    return { roles: records.map((record) => this.toDto(record, counts)), catalog: PERMISSION_CATALOG };
  }

  /** `POST /roles/impact` — اثر روی N کاربر و هشدار دسترسی ضروری، پیش از ذخیره. */
  async impact(changes: readonly { roleId: string; grants: readonly GrantedPermission[] }[]) {
    const [records, holders] = await Promise.all([this.records(this.em), this.holders()]);
    const users = new Set<string>();
    const perRole = changes.map((change) => {
      const ids = holders.get(change.roleId) ?? new Set<string>();
      ids.forEach((id) => users.add(id));
      return { roleId: change.roleId, users: ids.size };
    });
    const editable = records.filter((record) => record.systemKey !== 'org_admin');
    const before = editable.map((record) => record.grants);
    const after = editable.map((record) => changes.find((change) => change.roleId === record.id)?.grants ?? record.grants);
    const has = (lists: readonly (readonly GrantedPermission[])[], code: Permission) => lists.some((grants) => grants.some((grant) => grant.code === code));
    const warnings = ESSENTIAL_PERMISSIONS.filter((entry) => has(before, entry.code) && !has(after, entry.code)).map((entry) => entry.reason);
    return { users: users.size, perRole, warnings };
  }

  /** `PUT /roles/:id/permissions` — AC-AC-08. */
  async savePermissions(roleId: string, input: { grants: readonly GrantedPermission[]; reason: string | null }) {
    if (roleId === ORG_ADMIN_ROLE_ID) throw new ConflictError('ROLE_LOCKED');
    const grants = normalize(input.grants);
    const orgId = this.orgId();
    await this.em.transactional(async (tx) => {
      await this.lockOrg(tx, orgId);
      const role = await tx.findOne(Role, { id: roleId });
      if (!role) throw new NotFoundError('ROLE_NOT_FOUND');
      const record = (await this.records(tx)).find((entry) => entry.id === roleId);
      if (!record) throw new NotFoundError('ROLE_NOT_FOUND');
      if (sameGrants(record.grants, grants)) return;

      if (role.isSystem) {
        await tx.nativeDelete(OrgRoleGrant, { roleId });
        await tx.nativeDelete(OrgRoleCustom, { roleId });
        if (!sameGrants(record.defaults ?? [], grants)) {
          tx.create(OrgRoleCustom, { orgId, roleId });
          await tx.flush();
          for (const grant of grants) tx.create(OrgRoleGrant, { orgId, roleId, permissionCode: grant.code, scope: grant.scope });
        }
      } else {
        await tx.nativeDelete(RolePermission, { roleId });
        for (const grant of grants) tx.create(RolePermission, { id: newId(), roleId, permissionCode: grant.code, scope: grant.scope });
      }
      this.audit.record(tx, {
        action: 'role.permissions_changed',
        entityType: 'Role',
        entityId: roleId,
        before: { name: record.name, grants: record.grants },
        after: { name: record.name, grants },
        reason: input.reason?.trim() || null,
      });
      await this.outbox.emit(tx, { type: 'RolePermissionChanged', payload: { v: 1, roleId, systemKey: record.systemKey } });
    });
    return this.dtoOf(roleId);
  }

  /** `POST /roles` — نقش سفارشی؛ فقط با کپی دسترسی دارد (OD-09). */
  async create(input: { name: string; copyFromId: string | null }) {
    const name = input.name.trim();
    if (!name) throw new ValidationFailedError([{ field: 'name', message: 'نام نقش را بنویسید.' }]);
    if (name.length > 60) throw new ValidationFailedError([{ field: 'name', message: 'نام نقش حداکثر ۶۰ نویسه است.' }]);
    const orgId = this.orgId();
    const id = newId();
    await this.em.transactional(async (tx) => {
      await this.lockOrg(tx, orgId);
      const records = await this.records(tx);
      if (records.some((record) => record.name === name)) throw new ConflictError('ROLE_NAME_TAKEN');
      const source = input.copyFromId ? records.find((record) => record.id === input.copyFromId) : null;
      if (input.copyFromId && !source) throw new NotFoundError('ROLE_NOT_FOUND');
      const grants = source ? source.grants : [];
      tx.create(Role, {
        id,
        orgId,
        code: `custom_${id.slice(-12)}`,
        name,
        isSystem: false,
        basedOnRoleId: source && source.id !== ORG_ADMIN_ROLE_ID ? source.id : null,
      });
      await tx.flush();
      for (const grant of grants) tx.create(RolePermission, { id: newId(), roleId: id, permissionCode: grant.code, scope: grant.scope });
      this.audit.record(tx, {
        action: 'role.created',
        entityType: 'Role',
        entityId: id,
        after: { name, grants },
        reason: source ? `ساخت با کپی از «${source.name}»` : 'ساخت نقش سفارشی',
      });
      await this.outbox.emit(tx, { type: 'RolePermissionChanged', payload: { v: 1, roleId: id, systemKey: null } });
    });
    return this.dtoOf(id);
  }

  /** `DELETE /roles/:id` — فقط سفارشی و بی کاربر. */
  async delete(roleId: string): Promise<{ ok: true }> {
    if (roleId === ORG_ADMIN_ROLE_ID) throw new ConflictError('ROLE_IN_USE');
    await this.em.transactional(async (tx) => {
      await this.lockOrg(tx, this.orgId());
      const role = await tx.findOne(Role, { id: roleId });
      if (!role) throw new NotFoundError('ROLE_NOT_FOUND');
      if (role.isSystem) throw new ConflictError('ROLE_IN_USE');
      if ((await this.holders()).get(roleId)?.size) throw new ConflictError('ROLE_IN_USE');
      const grants = await tx.find(RolePermission, { roleId });
      await tx.nativeDelete(RolePermission, { roleId });
      await tx.nativeDelete(Role, { id: roleId });
      this.audit.record(tx, {
        action: 'role.deleted',
        entityType: 'Role',
        entityId: roleId,
        before: { name: role.name, grants: grants.map((grant) => ({ code: grant.permissionCode, scope: grant.scope })) },
      });
    });
    return { ok: true };
  }

  /** `GET /roles/audit` — ۲۰ تغییر آخر ماتریس. */
  async auditTrail() {
    const rows = await this.em.find(AuditLog, { entityType: 'Role', action: { $in: AUDIT_ACTIONS } }, { orderBy: { occurredAt: 'desc' }, limit: 20 });
    const actorIds = [...new Set(rows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])))];
    const actors = actorIds.length > 0 ? await this.em.find(User, { id: { $in: actorIds } }, { fields: ['id', 'fullName'] }) : [];
    const nameOf = new Map(actors.map((user) => [user.id, user.fullName]));
    return rows.map((row) => {
      const before = (row.before?.['grants'] as GrantedPermission[] | undefined) ?? [];
      const after = (row.after?.['grants'] as GrantedPermission[] | undefined) ?? [];
      const keys = (list: GrantedPermission[]) => new Set(list.map(grantKey));
      const beforeKeys = keys(before);
      const afterKeys = keys(after);
      return {
        id: row.id,
        at: row.occurredAt.toISOString(),
        byName: row.actorUserId ? (nameOf.get(row.actorUserId) ?? '—') : 'سیستم',
        roleName: nameIn(row.after) ?? nameIn(row.before) ?? '',
        added: after.filter((grant) => !beforeKeys.has(grantKey(grant))),
        removed: before.filter((grant) => !afterKeys.has(grantKey(grant))),
        reason: row.reason,
      };
    });
  }

  /** نقش‌های سیستمی با تنظیم این سازمان، سفارشی‌های سازمان و ردیف مدیر سازمان. */
  private async records(em: EntityManager): Promise<RoleRecord[]> {
    const [roles, permissions, customized, overrides] = await Promise.all([
      em.find(Role, {}),
      em.find(RolePermission, {}),
      em.find(OrgRoleCustom, {}),
      em.find(OrgRoleGrant, {}),
    ]);
    const custom = new Set(customized.map((row) => row.roleId));
    const grantsOf = (rows: readonly { permissionCode: string; scope: PermissionScope }[]): GrantedPermission[] =>
      rows.flatMap((row) => (isPermission(row.permissionCode) ? [{ code: row.permissionCode, scope: row.scope }] : []));
    const admin: RoleRecord = {
      id: ORG_ADMIN_ROLE_ID,
      systemKey: 'org_admin',
      name: SYSTEM_ROLES.org_admin,
      grants: PERMISSION_CODES.map((code) => ({ code, scope: 'all' as const })),
      defaults: null,
    };
    const records = roles.map((role): RoleRecord => {
      const defaults = grantsOf(permissions.filter((row) => row.roleId === role.id));
      const systemKey = role.isSystem ? (role.code as SystemRole) : null;
      const grants = role.isSystem && custom.has(role.id) ? grantsOf(overrides.filter((row) => row.roleId === role.id)) : defaults;
      return { id: role.id, systemKey, name: role.name, grants, defaults: role.isSystem ? defaults : null };
    });
    const rank = (record: RoleRecord) => (record.systemKey ? ROLE_ORDER.indexOf(record.systemKey) : ROLE_ORDER.length);
    return [admin, ...records].sort((a, b) => rank(a) - rank(b));
  }

  /** نقش ← کاربران فعال دارندهٔ آن. */
  private async holders(): Promise<Map<string, Set<string>>> {
    const [memberships, admins] = await Promise.all([
      this.memberships.memberships(),
      this.em.find(User, { isOrgAdmin: true, status: { $in: ['active', 'locked'] } }, { fields: ['id'] }),
    ]);
    const map = new Map<string, Set<string>>([[ORG_ADMIN_ROLE_ID, new Set(admins.map((user) => user.id))]]);
    for (const entry of memberships) {
      for (const role of entry.roles) {
        const id = SYSTEM_ROLE_IDS[role];
        map.set(id, (map.get(id) ?? new Set()).add(entry.userId));
      }
    }
    return map;
  }

  private async dtoOf(roleId: string) {
    const [records, counts] = await Promise.all([this.records(this.em), this.userCounts()]);
    const record = records.find((entry) => entry.id === roleId);
    if (!record) throw new NotFoundError('ROLE_NOT_FOUND');
    return this.toDto(record, counts);
  }

  private async userCounts(): Promise<Map<string, number>> {
    return new Map([...(await this.holders())].map(([id, users]) => [id, users.size]));
  }

  private toDto(record: RoleRecord, counts: ReadonlyMap<string, number>) {
    return {
      id: record.id,
      systemKey: record.systemKey,
      name: record.name,
      kind: record.systemKey === 'org_admin' ? ('admin' as const) : record.systemKey ? ('system' as const) : ('custom' as const),
      color: record.systemKey ? COLORS[record.systemKey] : '#71717A',
      userCount: counts.get(record.id) ?? 0,
      mobileOnly: record.systemKey === 'supervisor',
      grants: record.grants,
      modified: record.defaults ? !sameGrants(record.defaults, record.grants) : false,
      defaults: record.defaults,
    };
  }

  /**
   * ویرایش‌های ماتریس یک سازمان پشت سر هم: ردیف سازمان قفل می‌شود. نقش سیستمی را نمی‌شود قفل کرد چون
   * سیاست RLS به‌روزرسانی آن را پنهان می‌کند (FOR UPDATE همان سیاست را می‌خواهد).
   */
  private async lockOrg(tx: EntityManager, orgId: string): Promise<void> {
    await tx.findOneOrFail(Organization, { id: orgId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
  }

  private orgId(): string {
    const orgId = this.context.orgId;
    if (!orgId) throw new UnauthorizedError();
    return orgId;
  }
}

function nameIn(snapshot: Readonly<Record<string, unknown>> | null | undefined): string | null {
  const name = snapshot?.['name'];
  return typeof name === 'string' ? name : null;
}

/** کد ناشناخته و scope نادرست رد؛ هر کد یک بار. */
function normalize(grants: readonly GrantedPermission[]): GrantedPermission[] {
  const errors: { field: string; message: string }[] = [];
  const byCode = new Map<Permission, GrantedPermission>();
  for (const grant of grants) {
    if (!isPermission(grant.code)) errors.push({ field: 'grants', message: `کد دسترسی «${String(grant.code)}» شناخته نیست.` });
    else if (!(PERMISSION_SCOPES as readonly string[]).includes(grant.scope))
      errors.push({ field: 'grants', message: `دامنهٔ «${String(grant.scope)}» برای ${grant.code} درست نیست.` });
    else byCode.set(grant.code, { code: grant.code, scope: grant.scope });
  }
  if (errors.length > 0) throw new ValidationFailedError(errors);
  return [...byCode.values()];
}
