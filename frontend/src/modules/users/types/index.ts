import type { SystemRole } from '@/config/constants';
import type { GrantedPermission, Permission, PermissionScope } from '@/config/permissions';
import type { IconName } from '@/shared/components/ui/Icon';
import type { EntityId, IsoInstant } from '@/shared/types/api';

// کاربران سازمان (W26) و نقش‌ها و دسترسی‌ها (W27) — `features/access-control.md` ۵.۲–۵.۸.

export type UserRowStatus = 'active' | 'invited' | 'locked' | 'disabled';
export type LoginSecurity = '2fa' | 'no2fa' | 'otp' | 'none';

export interface OrgUserRowDto {
  /** کاربر: شناسهٔ کاربر؛ دعوت: `inv:<invitationId>`. */
  rowId: string;
  kind: 'user' | 'invitation';
  userId: EntityId | null;
  fullName: string;
  avatarTone: string;
  /** ایمیل یا موبایل — فقط با `users.manage` (D11)؛ وگرنه `null`. */
  contact: string | null;
  isOrgAdmin: boolean;
  isMe: boolean;
  /** نقش‌های متمایز در همهٔ پروژه‌ها، به ترتیب اهمیت. */
  roles: SystemRole[];
  projects: Array<{ id: EntityId; code: string; name: string; roles: SystemRole[] }>;
  lastActiveAt: IsoInstant | null;
  /** «وب»، «اندروید ۲.۴.۰ · همگام»، «آفلاین · ۳ گزارش در صف»… */
  device: { icon: IconName; text: string; warn: boolean };
  security: LoginSecurity;
  status: UserRowStatus;
  statusNote: string | null;
  invitation: {
    id: EntityId;
    projectId: EntityId;
    channel: 'sms' | 'email';
    sentAt: IsoInstant;
    expiresAt: IsoInstant;
    expired: boolean;
    /** کمتر از ۲۴ ساعت به انقضا. */
    expiringSoon: boolean;
  } | null;
}

export interface OrgUsersDto {
  rows: OrgUserRowDto[];
  summary: {
    total: number;
    web: number;
    android: number;
    active: number;
    active7d: number;
    invited: number;
    expiringSoon: number;
    locked: number;
    disabled: number;
    /** کاربران وب بدون ورود دومرحله‌ای (G18). */
    no2fa: number;
  };
  seats: { used: number; limit: number; invited: number };
  require2fa: boolean;
  projects: Array<{ id: EntityId; code: string; name: string; status: string }>;
}

export interface InviteUserRequest {
  fullName: string;
  /** همیشه لازم (تصمیم 1405/08/22). */
  mobile: string;
  email: string | null;
  projectId: EntityId;
  roles: Array<Exclude<SystemRole, 'org_admin' | 'project_manager'>>;
}

export interface BulkUsersRequest {
  action: 'resend' | 'revoke' | 'set_roles' | 'add_to_project';
  rowIds: string[];
  projectId?: EntityId;
  roles?: Array<Exclude<SystemRole, 'org_admin' | 'project_manager'>>;
}

export interface BulkResultDto {
  done: number;
  skipped: Array<{ name: string; reason: string }>;
}

export interface DisableImpactDto {
  userId: EntityId;
  fullName: string;
  blockedReason: string | null;
  projects: Array<{
    projectId: EntityId;
    projectName: string;
    roles: SystemRole[];
    blockedReason: string | null;
    assignedLeaves: number;
    inFlightItems: number;
    routes: string[];
    transferCandidates: Array<{ userId: EntityId; fullName: string; assignedCount: number }>;
  }>;
}

export interface ImportRowInput {
  line: number;
  fullName: string;
  mobile: string;
  email: string;
  projectCode: string;
  role: string;
}

export interface ImportPreviewRow extends ImportRowInput {
  outcome: 'invite' | 'add' | 'unchanged' | 'error';
  message: string;
}

export interface ImportResultDto {
  rows: ImportPreviewRow[];
  counts: { invite: number; add: number; unchanged: number; error: number };
  seats: { used: number; limit: number };
  committed: boolean;
}

// ─── W27 ───

export interface CatalogCodeDto {
  code: Permission;
  label: string;
}

export interface CatalogRowDto {
  key: string;
  title: string;
  description: string;
  codes: CatalogCodeDto[];
}

export interface CatalogGroupDto {
  key: string;
  title: string;
  icon: IconName;
  rows: CatalogRowDto[];
}

export interface RoleDto {
  id: EntityId;
  /** نقش سیستمی؛ سفارشی `null`. */
  systemKey: SystemRole | null;
  name: string;
  kind: 'admin' | 'system' | 'custom';
  color: string;
  userCount: number;
  /** سرپرست: فقط اپ اندروید. */
  mobileOnly: boolean;
  grants: GrantedPermission[];
  /** نقش سیستمی که با پیش‌فرض یکی نیست. */
  modified: boolean;
  defaults: GrantedPermission[] | null;
}

export interface RolesDto {
  roles: RoleDto[];
  catalog: CatalogGroupDto[];
}

export interface RoleChange {
  roleId: EntityId;
  grants: GrantedPermission[];
}

export interface RolesImpactDto {
  /** کاربران متمایز با دست‌کم یکی از نقش‌های تغییرکرده. */
  users: number;
  perRole: Array<{ roleId: EntityId; users: number }>;
  /** دسترسی ضروری که با این تغییر در هیچ نقشی نمی‌ماند (۵.۸). */
  warnings: string[];
}

export interface RoleAuditDto {
  id: EntityId;
  at: IsoInstant;
  byName: string;
  roleName: string;
  added: Array<{ code: Permission; scope: PermissionScope }>;
  removed: Array<{ code: Permission; scope: PermissionScope }>;
  reason: string | null;
}
