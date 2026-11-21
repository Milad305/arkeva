import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectRoleCode } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { IdentityService, Invitations, OrgUsers } from '../../identity/index.js';
import { ApprovalRoutes } from './approval-routes.js';
import { Assignments, sectionOf } from './assignments.js';
import { TeamMemberships } from './membership.port.js';
import { rosterOf } from './roster.js';
import { TeamPlanPort, TeamProjectPort } from './team-ports.js';

// اعضای پروژه (W16، W42؛ team-assignment.md ۴). وضعیت اپ اندروید با F08 (برش ۹)؛ تا آن موقع سرپرست «نصب نشده» و
// بقیه «وب». آیتم‌های در گردش با F09؛ تا آن موقع صفر.

const ACTIVE_WINDOW_MS = 48 * 3_600_000;
const WEEK_MS = 7 * 24 * 3_600_000;

export interface AddMemberInput {
  readonly userId: string | null;
  readonly invite: { readonly channel: 'sms' | 'email'; readonly target: string; readonly fullName?: string | null } | null;
  readonly roles: readonly ProjectRoleCode[];
  readonly area: { readonly name: string; readonly rootIds: readonly string[] } | null;
}

const invalid = (reason: string) => new DomainError('MEMBER_INVALID', 422, { reason });

@Injectable()
export class TeamMembers {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly identity: IdentityService,
    private readonly invitations: Invitations,
    private readonly orgUsers: OrgUsers,
    private readonly memberships: TeamMemberships,
    private readonly assignments: Assignments,
    private readonly routes: ApprovalRoutes,
    private readonly projects: TeamProjectPort,
    private readonly plan: TeamPlanPort,
  ) {}

  /** `GET /projects/:pid/members` — موبایل و هدف دعوت فقط برای team.manage (D11؛ تصمیم 1405/08/15). */
  async view(projectId: string) {
    const project = await this.projects.context(projectId);
    const canManage = this.can(projectId, 'team.manage');
    const [roster, items, routeRows, invitations, seats] = await Promise.all([
      rosterOf(this.em, { projectId }),
      this.plan.items(projectId),
      this.routes.view(projectId),
      this.invitations.forProject(projectId),
      this.orgUsers.seats(),
    ]);
    const profiles = await this.identity.memberProfiles(roster.map((entry) => entry.userId));
    const now = this.clock.now().getTime();
    const members = roster.map((entry) => {
      const profile = profiles.get(entry.userId);
      const isSupervisor = entry.roles.includes('supervisor');
      const assignedCount = isSupervisor ? items.filter((item) => item.isLeaf && item.supervisorUserId === entry.userId).length : 0;
      const lastActive = profile?.lastActiveAt ?? null;
      return {
        userId: entry.userId,
        fullName: profile?.fullName ?? '',
        avatarTone: profile?.avatarTone ?? 'a1',
        mobile: canManage ? (profile?.mobile ?? null) : null,
        roles: entry.roles,
        isManager: entry.userId === project.managerUserId,
        responsibility: this.responsibility(entry.roles, entry.userId, routeRows.areas, items),
        assignedCount,
        app: isSupervisor ? { kind: 'not_installed' as const } : { kind: 'web' as const },
        status: lastActive && now - lastActive.getTime() <= ACTIVE_WINDOW_MS ? ('active' as const) : ('inactive' as const),
        lastActiveAt: lastActive?.toISOString() ?? null,
        recent: !!lastActive && now - lastActive.getTime() <= WEEK_MS,
      };
    });
    const supervisors = members.filter((member) => member.roles.includes('supervisor'));
    const manager = members.find((member) => member.isManager);
    return {
      members: members.map(({ recent: _recent, ...member }) => member),
      invitations: invitations.map((invitation) => ({ ...invitation, target: canManage ? invitation.target : '•••' })),
      summary: {
        total: members.length,
        managerName: manager?.fullName ?? null,
        reviewers: members.filter((member) => member.roles.includes('reviewer')).length,
        supervisors: supervisors.length,
        unassignedSupervisors: supervisors.filter((member) => member.assignedCount === 0).length,
        active7d: members.filter((member) => member.recent).length,
      },
      seats: { used: seats.used, limit: seats.limit },
    };
  }

  /** `POST /projects/:pid/members` — کاربر موجود یا دعوت فرد تازه (۴.۱). */
  async add(projectId: string, input: AddMemberInput): Promise<{ userId: string | null; invitationId: string | null; inviteCode: string | null }> {
    if (input.roles.length === 0) throw invalid('دست‌کم یک نقش انتخاب کنید.');
    if (input.roles.includes('project_manager')) throw invalid('مدیر پروژه با «انتقال مدیریت» عوض می‌شود، نه از اینجا.');
    if (!input.userId) {
      if (!input.invite) throw invalid('کاربری انتخاب کنید یا فرد تازه‌ای دعوت کنید.');
      // دعوت با ایمیل هنوز نیست (code-mapping ۳.۵.۳۴)؛ شماره لازم است
      if (input.invite.channel === 'email') throw invalid('دعوت با ایمیل هنوز ممکن نیست؛ شمارهٔ همراه فرد را بنویسید.');
      const fullName = input.invite.fullName?.trim();
      if (!fullName) throw invalid('نام فرد دعوت‌شده را بنویسید.');
      const { invitationId, inviteCode } = await this.invitations.invite({ fullName, mobile: input.invite.target, projectId, roles: input.roles });
      // کد دعوت یک بار برای QR در کارگاه (OD-20)
      return { userId: null, invitationId, inviteCode };
    }
    const userId = input.userId;
    if (!(await this.identity.activeUserIds([userId])).has(userId)) throw new ConflictError('USER_STATE_CONFLICT', { reason: 'inactive' });
    if (input.area && input.roles.includes('reviewer') && input.area.rootIds.length === 0) {
      throw invalid('برای ناظر دست‌کم یک بخش WBS به‌عنوان حوزهٔ مسئولیت انتخاب کنید.');
    }
    await this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
      await this.memberships.addMember(tx, { orgId: project.orgId, projectId, userId, roles: input.roles });
      if (input.area && input.roles.includes('reviewer'))
        await this.routes.assignArea(tx, project, { name: input.area.name, rootIds: input.area.rootIds, reviewerUserId: userId });
      this.audit.record(tx, { action: 'team.member_added', entityType: 'ProjectMember', entityId: userId, projectId, after: { roles: [...input.roles] } });
    });
    return { userId, invitationId: null, inviteCode: null };
  }

  /** `PATCH /projects/:pid/members/:userId` — نقش‌ها (۴.۲). */
  async updateRoles(projectId: string, userId: string, roles: readonly ProjectRoleCode[]) {
    await this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
      const before = (await rosterOf(tx, { projectId, userIds: [userId] }))[0];
      if (!before) throw new NotFoundError('MEMBER_NOT_FOUND');
      await this.memberships.setRoles(tx, { projectId, userId, roles });
      this.audit.record(tx, {
        action: 'team.member_roles_changed',
        entityType: 'ProjectMember',
        entityId: userId,
        projectId,
        before: { roles: [...before.roles] },
        after: { roles: [...roles] },
      });
    });
    const member = (await this.view(projectId)).members.find((entry) => entry.userId === userId);
    if (!member) throw new NotFoundError('MEMBER_NOT_FOUND');
    return member;
  }

  /** `GET /projects/:pid/members/:userId/removal-impact` (۴.۳). */
  async removalImpact(projectId: string, userId: string) {
    const project = await this.projects.context(projectId);
    const roster = await rosterOf(this.em, { projectId });
    const entry = roster.find((member) => member.userId === userId);
    if (!entry) throw new NotFoundError('MEMBER_NOT_FOUND');
    const [items, routes, supervisors] = await Promise.all([
      this.plan.items(projectId),
      this.routes.routesOf(projectId, userId),
      this.assignments.supervisors(projectId),
    ]);
    const loads = this.assignments.loads(items, supervisors);
    const people = await this.identity.personRefs([userId, ...supervisors]);
    return {
      userId,
      fullName: people.get(userId)?.fullName ?? '',
      blockedReason: userId === project.managerUserId ? 'مدیر پروژه حذف نمی‌شود تا مدیر تازه تعیین شود. از «انتقال مدیریت» در سربرگ پروژه استفاده کنید.' : null,
      assignedLeaves: items.filter((item) => item.isLeaf && item.supervisorUserId === userId).length,
      routes: routes.map((route) => ({ id: route.id, areaName: route.areaName })),
      isFallbackApprover: project.alternateReviewerUserId === userId && userId !== project.managerUserId,
      inFlightItems: 0,
      transferCandidates: supervisors
        .filter((id) => id !== userId)
        .map((id) => ({ userId: id, fullName: people.get(id)?.fullName ?? '', assignedCount: loads.get(id) ?? 0 })),
    };
  }

  /** `DELETE /projects/:pid/members/:userId {transferTo}` — حذف نرم (۴.۳؛ AC-TM-05). */
  async remove(projectId: string, userId: string, transferTo: string | null): Promise<{ removed: true }> {
    this.actor();
    await this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
      const roster = await rosterOf(tx, { projectId });
      if (!roster.some((entry) => entry.userId === userId)) throw new NotFoundError('MEMBER_NOT_FOUND');
      if (userId === project.managerUserId) throw new ConflictError('MEMBER_REMOVAL_BLOCKED', { projectId, projectName: project.name });
      if (transferTo) {
        const target = roster.find((entry) => entry.userId === transferTo);
        if (transferTo === userId || !target?.roles.includes('supervisor')) throw invalid('«انتقال به» باید سرپرست کارگاه دیگری در همین پروژه باشد.');
      }
      await this.memberships.removeWithTransfer(tx, { projectId, userId, transferTo });
      this.audit.record(tx, { action: 'team.member_removed', entityType: 'ProjectMember', entityId: userId, projectId, after: { transferTo } });
    });
    return { removed: true };
  }

  private responsibility(
    roles: readonly ProjectRoleCode[],
    userId: string,
    areas: readonly { areaName: string; reviewerUserId: string | null }[],
    items: Parameters<typeof sectionOf>[0],
  ): string | null {
    if (roles.includes('reviewer')) {
      const mine = areas.filter((area) => area.reviewerUserId === userId).map((area) => area.areaName);
      return mine.length > 0 ? `بازبینی ${mine.join('، ')}` : 'بدون حوزهٔ تأیید';
    }
    if (roles.includes('supervisor')) return sectionOf(items, userId) ?? 'بدون تخصیص';
    if (roles.includes('project_manager')) return 'دسترسی کامل پروژه';
    if (roles.includes('planner')) return 'ویرایش WBS و CBS';
    return null;
  }

  private can(projectId: string, code: 'team.manage'): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has(code) ?? false));
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
