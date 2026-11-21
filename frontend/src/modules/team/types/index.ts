import type { SystemRole } from '@/config/constants';
import type { EntityId, IsoInstant, Percent } from '@/shared/types/api';

// F07 — تیم، تخصیص و حوزه‌های تأیید (`features/team-assignment.md`). همهٔ شمارش‌ها،
// بار کاری، پیامدهای حذف و تأییدکنندهٔ هر برگ را سرور می‌سازد (D07).

/** نقش‌هایی که در W42 و ویرایش نقش انتخاب می‌شوند — مدیر پروژه نه (تصمیم 1405/08/15). */
export type AssignableRole = Exclude<SystemRole, 'org_admin' | 'project_manager'>;

export type AppStatus =
  | { kind: 'web' }
  | { kind: 'synced'; at: IsoInstant }
  | { kind: 'offline'; queued: number }
  | { kind: 'outdated' }
  | { kind: 'not_installed' };

export interface MemberDto {
  userId: EntityId;
  fullName: string;
  avatarTone: string;
  /** فقط برای `team.manage` (D11)؛ برای بقیه `null`. */
  mobile: string | null;
  roles: SystemRole[];
  isManager: boolean;
  /** خلاصهٔ مسئولیت: حوزهٔ تأیید ناظر یا بخش WBS سرپرست. */
  responsibility: string | null;
  assignedCount: number;
  app: AppStatus;
  status: 'active' | 'inactive';
  lastActiveAt: IsoInstant | null;
}

export interface InvitationDto {
  id: EntityId;
  channel: 'sms' | 'email';
  target: string;
  /** نام دعوت‌شده اگر داده شده باشد (W26، ورود گروهی). */
  fullName?: string | null;
  roles: SystemRole[];
  sentAt: IsoInstant;
  expiresAt: IsoInstant;
  status: 'pending' | 'expired';
}

export interface MembersDto {
  members: MemberDto[];
  invitations: InvitationDto[];
  summary: {
    total: number;
    managerName: string | null;
    reviewers: number;
    supervisors: number;
    unassignedSupervisors: number;
    active7d: number;
  };
  seats: { used: number; limit: number };
}

/** کاربر سازمان برای جستجوی W42. */
export interface OrgUserDto {
  userId: EntityId;
  fullName: string;
  avatarTone: string;
  mobile: string;
  /** «ناظر · ۲ پروژهٔ دیگر» */
  note: string | null;
  alreadyMember: boolean;
}

export interface AddMemberRequest {
  projectId: EntityId;
  /** کاربر موجود؛ `null` = دعوت فرد جدید. */
  userId: EntityId | null;
  invite: { channel: 'sms' | 'email'; target: string; fullName?: string | null } | null;
  roles: AssignableRole[];
  /** ناظر: حوزهٔ مسئولیت — ApprovalRoute ساخته یا به‌روز می‌شود (۴.۱، ۶). */
  area: { name: string; rootIds: EntityId[] } | null;
  sendAppSms: boolean;
}

export interface UpdateRolesRequest {
  projectId: EntityId;
  userId: EntityId;
  roles: AssignableRole[];
}

/** `GET /projects/:pid/members/:userId/removal-impact` (۴.۳). */
export interface RemovalImpactDto {
  userId: EntityId;
  fullName: string;
  blockedReason: string | null;
  assignedLeaves: number;
  routes: Array<{ id: EntityId; areaName: string }>;
  isFallbackApprover: boolean;
  inFlightItems: number;
  /** سرپرستان دیگر برای «انتقال به…». */
  transferCandidates: Array<{ userId: EntityId; fullName: string; assignedCount: number }>;
}

export interface RemoveMemberRequest {
  projectId: EntityId;
  userId: EntityId;
  /** `null` = برگ‌ها بی‌سرپرست بمانند. */
  transferTo: EntityId | null;
}

export interface ApprovalRouteDto {
  id: EntityId;
  areaName: string;
  rootIds: EntityId[];
  rootCodes: string[];
  reviewerUserId: EntityId | null;
  reviewerName: string | null;
}

// ── تخصیص (W17) ──

export interface AssignmentSupervisorDto {
  userId: EntityId;
  fullName: string;
  avatarTone: string;
  /** «عملیات خاکی · میانگین ۷۶٪» */
  note: string;
  workload: number;
}

export interface AssignmentItemDto {
  id: EntityId;
  parentId: EntityId | null;
  code: string;
  title: string;
  sortOrder: number;
  isLeaf: boolean;
  /** برگ فعال غیرزمانی (۵.۱). */
  assignable: boolean;
  notAssignableReason: string | null;
  supervisorUserId: EntityId | null;
  supervisorName: string | null;
  supervisorTone: string | null;
  actualPercent: Percent | null;
}

export interface AssignmentsDto {
  supervisors: AssignmentSupervisorDto[];
  items: AssignmentItemDto[];
  unassignedCount: number;
  averageWorkload: number;
}

export interface AssignRequest {
  projectId: EntityId;
  wbsItemIds: EntityId[];
  supervisorUserId: EntityId | null;
}

/** `GET /projects/:pid/assignments/preview` (۵.۳). */
export interface AssignPreviewDto {
  workloadAfter: number;
  averageAfter: number;
  /** AL-RES-01: بیش از ۲ برابر میانگین. */
  imbalanced: boolean;
  transfers: Array<{ wbsItemId: EntityId; title: string; fromName: string }>;
  rejected: Array<{ wbsItemId: EntityId; title: string; reason: string }>;
  assignCount: number;
}

export interface AssignResultDto {
  changed: number;
  notified: string[];
}
