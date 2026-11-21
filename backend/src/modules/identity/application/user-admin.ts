import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { ErrorCode, ProjectRoleCode, SystemRole } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { User } from '../domain/user.entity.js';
import { Invitations } from './invitations.js';
import { type OrgUserRow, OrgUsers } from './org-users.js';
import { MembershipPort, ProjectCatalog, type ProjectBasics } from './ports.js';
import { TrustedDevices } from './trusted-devices.js';

// مدیریت حساب‌ها در W26 (F01 ۵.۶): قفل، غیرفعال/فعال، مدیر سازمان، ورود دومرحله‌ای اجباری، عملیات
// گروهی. ورود از فایل در user-import.ts. عضویت فقط از MembershipPort (team) تغییر می‌کند (`03` ۲).

export type AssignableRole = Exclude<ProjectRoleCode, 'project_manager'>;
export const ASSIGNABLE: readonly AssignableRole[] = ['planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'];

export interface DisableImpact {
  readonly userId: string;
  readonly fullName: string;
  readonly blockedReason: string | null;
  readonly projects: readonly {
    readonly projectId: string;
    readonly projectName: string;
    readonly roles: SystemRole[];
    readonly blockedReason: string | null;
    readonly assignedLeaves: number;
    readonly inFlightItems: number;
    readonly routes: string[];
    readonly transferCandidates: { userId: string; fullName: string; assignedCount: number }[];
  }[];
}

export interface BulkInput {
  readonly action: 'resend' | 'revoke' | 'set_roles' | 'add_to_project';
  readonly rowIds: readonly string[];
  readonly projectId?: string | undefined;
  readonly roles?: readonly AssignableRole[] | undefined;
}

@Injectable()
export class UserAdmin {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly orgUsers: OrgUsers,
    private readonly invitations: Invitations,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
    private readonly devices: TrustedDevices,
  ) {}

  /** `POST /users/:id/unlock` — AC-AC-01. */
  async unlock(userId: string): Promise<{ ok: true }> {
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status !== 'locked' && !user.isLockedAt(now)) throw new ConflictError('USER_STATE_CONFLICT', { status: user.status });
      const before = { status: user.status, lockedUntil: user.lockedUntil?.toISOString() ?? null };
      user.status = 'active';
      user.lockedUntil = null;
      user.failedLoginCount = 0;
      this.audit.record(tx, { action: 'user.unlocked', entityType: 'User', entityId: user.id, before, after: { status: 'active', lockedUntil: null } });
    });
    return { ok: true };
  }

  /** `GET /users/:id/disable-impact` — پیش‌نمایش (F07 ۴.۳). تخصیص و حوزه با برش ۵ پر می‌شود. */
  async disableImpact(userId: string): Promise<DisableImpact> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user || user.status === 'invited') throw new NotFoundError('USER_NOT_FOUND');
    const actor = this.actor();
    let blockedReason: string | null = null;
    if (user.id === actor.userId) blockedReason = 'حساب خودتان را نمی‌توانید غیرفعال کنید.';
    else if (user.isOrgAdmin && (await this.adminCount(this.em)) <= 1) blockedReason = 'این کاربر آخرین مدیر سازمان است؛ اول مدیر سازمان دیگری تعیین کنید.';
    const [memberships, projects] = await Promise.all([this.memberships.memberships([user.id]), this.projects.list()]);
    const byId = new Map(projects.map((project) => [project.id, project]));
    const rows = await Promise.all(
      memberships.map(async (entry) => ({
        projectId: entry.projectId,
        projectName: byId.get(entry.projectId)?.name ?? '',
        roles: [...entry.roles] as SystemRole[],
        blockedReason: await this.memberships.removalBlock(entry.projectId, user.id),
        assignedLeaves: 0,
        inFlightItems: 0,
        routes: [],
        transferCandidates: [],
      })),
    );
    return { userId: user.id, fullName: user.fullName, blockedReason, projects: rows };
  }

  /**
   * `POST /users/:id/disable` — نشست‌ها باطل، از همهٔ پروژه‌ها خارج (F01 ۵.۶). `transfers` (جابه‌جایی
   * کار سرپرست) با برش ۵ اثر می‌گیرد.
   */
  async disable(userId: string, input: { reason: string }): Promise<{ ok: true }> {
    const actor = this.actor();
    if (userId === actor.userId) throw new ConflictError('SELF_ACTION_NOT_ALLOWED');
    const now = this.clock.now();
    const memberships = await this.memberships.memberships([userId]);
    const projects = new Map((await this.projects.list()).map((project) => [project.id, project]));
    for (const entry of memberships) {
      if (await this.memberships.removalBlock(entry.projectId, userId)) {
        throw new ConflictError('MEMBER_REMOVAL_BLOCKED', { projectId: entry.projectId, projectName: projects.get(entry.projectId)?.name ?? null });
      }
    }
    await this.em.transactional(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status === 'disabled' || user.status === 'invited') throw new ConflictError('USER_STATE_CONFLICT', { status: user.status });
      if (user.isOrgAdmin && (await this.adminCount(tx)) <= 1) throw new ConflictError('LAST_ORG_ADMIN');
      const before = { status: user.status };
      user.status = 'disabled';
      for (const entry of memberships) await this.memberships.removeMember(tx, { projectId: entry.projectId, userId });
      const sessions = await tx.find(AuthSession, { userId, revokedAt: null });
      for (const session of sessions) session.revoke('user_disabled', now);
      await this.devices.revokeAll(tx, userId, now);
      this.audit.record(tx, {
        action: 'user.disabled',
        entityType: 'User',
        entityId: user.id,
        before,
        after: { status: 'disabled', removedFromProjects: memberships.map((entry) => entry.projectId) },
        reason: input.reason.trim() || null,
      });
    });
    return { ok: true };
  }

  /** `POST /users/:id/enable` — سهم مجوز تازه؛ عضویت‌های قبلی برنمی‌گردد. */
  async enable(userId: string): Promise<{ ok: true }> {
    await this.em.transactional(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status !== 'disabled') throw new ConflictError('USER_STATE_CONFLICT', { status: user.status });
      const seats = await this.orgUsers.seats(tx);
      if (seats.used >= seats.limit) throw new ConflictError('SEATS_FULL', { limit: seats.limit });
      user.status = 'active';
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      this.audit.record(tx, { action: 'user.enabled', entityType: 'User', entityId: user.id, before: { status: 'disabled' }, after: { status: 'active' } });
    });
    return { ok: true };
  }

  /** `PATCH /users/:id { isOrgAdmin }` — AC-AC-12: آخرین مدیر سازمان برداشته نمی‌شود. */
  async setOrgAdmin(userId: string, isOrgAdmin: boolean): Promise<{ ok: true }> {
    const actor = this.actor();
    await this.em.transactional(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status === 'disabled' || user.status === 'invited') throw new ConflictError('USER_STATE_CONFLICT', { status: user.status });
      if (user.isOrgAdmin === isOrgAdmin) return;
      if (!isOrgAdmin) {
        if (user.id === actor.userId) throw new ConflictError('SELF_ACTION_NOT_ALLOWED');
        if ((await this.adminCount(tx)) <= 1) throw new ConflictError('LAST_ORG_ADMIN');
      }
      user.isOrgAdmin = isOrgAdmin;
      this.audit.record(tx, {
        action: isOrgAdmin ? 'user.org_admin_granted' : 'user.org_admin_revoked',
        entityType: 'User',
        entityId: user.id,
        before: { isOrgAdmin: !isOrgAdmin },
        after: { isOrgAdmin },
      });
    });
    return { ok: true };
  }

  /** `PATCH /org/security { require2fa }` — org.settings. */
  async setRequire2fa(value: boolean): Promise<{ require2fa: boolean }> {
    const actor = this.actor();
    await this.em.transactional(async (tx) => {
      const org = await tx.findOneOrFail(Organization, { id: actor.orgId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (org.require2fa === value) return;
      org.require2fa = value;
      this.audit.record(tx, {
        action: 'org.security_changed',
        entityType: 'Organization',
        entityId: org.id,
        before: { require2fa: !value },
        after: { require2fa: value },
      });
    });
    return { require2fa: value };
  }

  /** `POST /users/bulk` — هر ردیف جدا؛ شکست یکی بقیه را نگه نمی‌دارد. */
  async bulk(input: BulkInput): Promise<{ done: number; skipped: { name: string; reason: string }[] }> {
    const listed = await this.orgUsers.list();
    const rows = input.rowIds.map((rowId) => {
      const row = listed.rows.find((entry) => entry.rowId === rowId);
      if (!row) throw new NotFoundError('USER_NOT_FOUND', { rowId });
      return row;
    });
    const roles = (input.roles ?? []).filter((role): role is AssignableRole => ASSIGNABLE.includes(role));
    if ((input.action === 'set_roles' || input.action === 'add_to_project') && (!input.projectId || roles.length === 0)) {
      throw new ValidationFailedError([{ field: 'roles', message: 'پروژه و دست‌کم یک نقش انتخاب کنید.' }]);
    }
    const project = input.projectId ? await this.invitations.writableProject(input.projectId) : null;
    const skipped: { name: string; reason: string }[] = [];
    let done = 0;
    for (const row of rows) {
      const reason = await this.bulkRow(row, input.action, project, roles).catch((error: unknown) =>
        error instanceof DomainError ? reasonOf(error) : 'انجام نشد',
      );
      if (reason) skipped.push({ name: row.fullName, reason });
      else done += 1;
    }
    return { done, skipped };
  }

  /** یک ردیف عملیات گروهی؛ دلیل رد یا null. */
  private async bulkRow(row: OrgUserRow, action: BulkInput['action'], project: ProjectBasics | null, roles: readonly AssignableRole[]): Promise<string | null> {
    if (action === 'resend' || action === 'revoke') {
      if (!row.invitation) return 'دعوت در انتظار ندارد';
      if (action === 'resend') await this.invitations.resend(row.invitation.id);
      else await this.invitations.revoke(row.invitation.id);
      return null;
    }
    const userId = row.userId;
    if (row.kind !== 'user' || !userId || !project) return 'هنوز دعوت را نپذیرفته است';
    if (row.status === 'disabled') return 'حساب غیرفعال است';
    const member = row.projects.some((entry) => entry.id === project.id);
    if (action === 'set_roles') {
      if (!member) return `عضو «${project.name}» نیست`;
      await this.em.transactional((tx) => this.memberships.setRoles(tx, { projectId: project.id, userId, roles }));
      return null;
    }
    if (member) return `از پیش عضو «${project.name}» است`;
    const orgId = this.actor().orgId;
    await this.em.transactional((tx) => this.memberships.addMember(tx, { orgId, projectId: project.id, userId, roles }));
    return null;
  }

  private async lockUser(tx: EntityManager, userId: string): Promise<User> {
    const user = await tx.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!user) throw new NotFoundError('USER_NOT_FOUND');
    return user;
  }

  private adminCount(em: EntityManager): Promise<number> {
    return em.count(User, { isOrgAdmin: true, status: { $in: ['active', 'locked'] } });
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}

/** دلیل کوتاه فارسی ردیف ردشده در عملیات گروهی و ورود از فایل. */
const REASONS: Partial<Record<ErrorCode, string>> = {
  SEATS_FULL: 'ظرفیت پر است',
  IDENTITY_TAKEN: 'این شماره یا ایمیل در سامانه ثبت است',
  MEMBER_ALREADY_ACTIVE: 'از پیش عضو پروژه است',
  MEMBER_NOT_FOUND: 'عضو پروژه نیست',
  PROJECT_READ_ONLY: 'پروژه بسته یا بایگانی است',
  PERMISSION_DENIED: 'اجازهٔ این کار را ندارید',
  INVITATION_NOT_FOUND: 'دعوت پیدا نشد',
};

export function reasonOf(error: DomainError): string {
  return REASONS[error.code] ?? 'انجام نشد';
}
