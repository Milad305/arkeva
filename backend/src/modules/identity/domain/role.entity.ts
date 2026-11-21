import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, idColumn } from '../../../platform/database/base-properties.js';

export const PERMISSION_SCOPES = ['all', 'own_area', 'own_assigned', 'own_projects'] as const;

/**
 * Role — `02` ۲. نقش سیستمی org_id تهی دارد و میان همهٔ سازمان‌ها مشترک است؛ پس در فیلتر
 * tenant نیست و RLS آن «org_id تهی یا همین سازمان» است (docs/backend/05 ۴.۵).
 */
const RoleSchema = defineEntity({
  name: 'Role',
  tableName: 'role',
  properties: {
    id: idColumn(),
    orgId: p.uuid().nullable(),
    code: p.string(),
    name: p.string(),
    isSystem: p.boolean().default(false),
    basedOnRoleId: p.uuid().nullable(),
    createdAt: createdAtColumn(),
  },
});

export class Role extends RoleSchema.class {}
RoleSchema.setClass(Role);

/** RolePermission — کد + scope (OD-09). */
const RolePermissionSchema = defineEntity({
  name: 'RolePermission',
  tableName: 'role_permission',
  properties: {
    id: idColumn(),
    roleId: p.uuid(),
    permissionCode: p.string(),
    scope: p.enum(PERMISSION_SCOPES),
  },
});

export class RolePermission extends RolePermissionSchema.class {}
RolePermissionSchema.setClass(RolePermission);

/**
 * تنظیم نقش سیستمی در یک سازمان (W27؛ access-control ۵.۲): وجود ردیف = این سازمان پیش‌فرض را عوض کرده و
 * دسترسی‌ها از OrgRoleGrant خوانده می‌شوند؛ «بازگشت به پیش‌فرض» = حذف ردیف و دسترسی‌هایش.
 */
const OrgRoleCustomSchema = defineEntity({
  name: 'OrgRoleCustom',
  tableName: 'org_role_custom',
  properties: {
    orgId: p.uuid().primary(),
    roleId: p.uuid().primary(),
    createdAt: createdAtColumn(),
  },
});

export class OrgRoleCustom extends OrgRoleCustomSchema.class {}
OrgRoleCustomSchema.setClass(OrgRoleCustom);

const OrgRoleGrantSchema = defineEntity({
  name: 'OrgRoleGrant',
  tableName: 'org_role_grant',
  properties: {
    orgId: p.uuid().primary(),
    roleId: p.uuid().primary(),
    permissionCode: p.string().primary(),
    scope: p.enum(PERMISSION_SCOPES),
  },
});

export class OrgRoleGrant extends OrgRoleGrantSchema.class {}
OrgRoleGrantSchema.setClass(OrgRoleGrant);
