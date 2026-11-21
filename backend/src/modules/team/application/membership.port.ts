import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectRoleCode } from '@projeyar/shared';
import { SYSTEM_ROLE_IDS } from '../../../database/system-ids.js';
import { newId } from '../../../platform/database/ids.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { ConflictError, NotFoundError, ValidationFailedError } from '../../../platform/http/errors.js';
import { type Membership, MembershipPort } from '../../identity/index.js';
import { ProjectMember, ProjectMemberRole } from '../domain/project-member.entity.js';
import { ApprovalRoutes } from './approval-routes.js';
import { Assignments } from './assignments.js';
import { rosterOf } from './roster.js';
import { TeamPlanPort, TeamProjectPort } from './team-ports.js';

// تنها نویسندهٔ عضویت و نقش پروژه (`03` ۲) — برای W16/W42 و برای identity (W26، دعوت، غیرفعال‌سازی). پیامدهای
// تخصیص و حوزه همین‌جاست تا هر دو مسیر یکی باشند (team-assignment.md ۴.۲–۴.۳).

const MANAGER_ROLE_ID = SYSTEM_ROLE_IDS.project_manager;

@Injectable()
export class TeamMemberships extends MembershipPort {
  constructor(
    private readonly em: EntityManager,
    private readonly assignments: Assignments,
    private readonly routes: ApprovalRoutes,
    private readonly plan: TeamPlanPort,
    private readonly projects: TeamProjectPort,
    private readonly outbox: Outbox,
  ) {
    super();
  }

  async memberships(userIds?: readonly string[]): Promise<Membership[]> {
    return (await rosterOf(this.em, userIds ? { userIds } : {})).map(({ userId, projectId, roles }) => ({ userId, projectId, roles }));
  }

  async addMember(
    tx: EntityManager,
    input: { readonly orgId: string; readonly projectId: string; readonly userId: string; readonly roles: readonly ProjectRoleCode[] },
  ): Promise<void> {
    if (input.roles.length === 0) throw new ValidationFailedError([{ field: 'roles', message: 'دست‌کم یک نقش انتخاب کنید.' }]);
    const existing = await tx.findOne(ProjectMember, { projectId: input.projectId, userId: input.userId });
    if (existing?.status === 'active') throw new ConflictError('MEMBER_ALREADY_ACTIVE');
    const member =
      existing ?? tx.create(ProjectMember, { id: newId(), orgId: input.orgId, projectId: input.projectId, userId: input.userId, status: 'active' });
    if (existing) {
      existing.status = 'active';
      await tx.nativeDelete(ProjectMemberRole, { memberId: existing.id });
    }
    // بی رابطهٔ ORM: عضو پیش از نقش (README ۶)
    await tx.flush();
    for (const role of new Set(input.roles)) {
      tx.create(ProjectMemberRole, { id: newId(), orgId: input.orgId, memberId: member.id, roleId: SYSTEM_ROLE_IDS[role] });
    }
    // «فعالیت‌های اخیر» (platform.md ۱۰) و ارزیابی دوبارهٔ هشدار
    await this.outbox.emit(tx, {
      type: 'MemberChanged',
      orgId: input.orgId,
      projectId: input.projectId,
      payload: { v: 1, change: 'added', userId: input.userId, roles: [...new Set(input.roles)] },
    });
  }

  /**
   * تغییر نقش (۴.۲). نقش مدیر پروژه دست نمی‌خورد (با «انتقال مدیریت»). برداشتن «سرپرست» از کسی که برگ دارد ۴۰۹
   * (تصمیم کاربر 1405/08/23: اول در W17 جابه‌جا شود)؛ برداشتن «ناظر» حوزه‌هایش را بی‌تأییدکننده می‌کند.
   */
  async setRoles(tx: EntityManager, input: { readonly projectId: string; readonly userId: string; readonly roles: readonly ProjectRoleCode[] }): Promise<void> {
    const member = await tx.findOne(ProjectMember, { projectId: input.projectId, userId: input.userId, status: 'active' });
    if (!member) throw new NotFoundError('MEMBER_NOT_FOUND');
    const current = await tx.find(ProjectMemberRole, { memberId: member.id });
    const isManager = current.some((row) => row.roleId === MANAGER_ROLE_ID);
    const wanted = new Set(input.roles.filter((role) => role !== 'project_manager'));
    if (wanted.size === 0 && !isManager) {
      throw new ValidationFailedError([{ field: 'roles', message: 'دست‌کم یک نقش لازم است؛ برای خارج کردن از پروژه «حذف عضو» را بزنید.' }]);
    }
    const had = (role: ProjectRoleCode) => current.some((row) => row.roleId === SYSTEM_ROLE_IDS[role]);
    if (had('supervisor') && !wanted.has('supervisor')) {
      const assigned = (await this.plan.items(input.projectId, tx)).filter((item) => item.isLeaf && item.supervisorUserId === input.userId).length;
      if (assigned > 0) {
        throw new ConflictError('MEMBER_ROLE_BLOCKED', {
          reason: 'این سرپرست فعالیت تخصیص‌یافته دارد. اول فعالیت‌هایش را در «تخصیص فعالیت‌ها» به سرپرست دیگری بسپارید.',
          assignedLeaves: assigned,
        });
      }
    }
    if (had('reviewer') && !wanted.has('reviewer') && !isManager) {
      await this.routes.releaseReviewer(tx, await this.projects.context(input.projectId, tx), input.userId, false);
    }
    for (const row of current) {
      const code = (Object.entries(SYSTEM_ROLE_IDS).find(([, id]) => id === row.roleId)?.[0] ?? null) as ProjectRoleCode | null;
      if (code && code !== 'project_manager' && !wanted.has(code)) tx.remove(row);
    }
    for (const role of wanted) {
      if (!had(role)) tx.create(ProjectMemberRole, { id: newId(), orgId: member.orgId, memberId: member.id, roleId: SYSTEM_ROLE_IDS[role] });
    }
  }

  async removalBlock(projectId: string, userId: string): Promise<string | null> {
    const member = await this.em.findOne(ProjectMember, { projectId, userId, status: 'active' });
    if (!member) return null;
    const isManager = (await this.em.count(ProjectMemberRole, { memberId: member.id, roleId: MANAGER_ROLE_ID })) > 0;
    return isManager ? 'مدیر پروژه حذف نمی‌شود تا مدیر تازه تعیین شود. از «انتقال مدیریت» در سربرگ پروژه استفاده کنید.' : null;
  }

  /** حذف نرم عضو (۴.۳) — از identity (غیرفعال‌سازی) برگ‌ها بی‌سرپرست می‌مانند. */
  removeMember(tx: EntityManager, input: { readonly projectId: string; readonly userId: string }): Promise<void> {
    return this.removeWithTransfer(tx, { ...input, transferTo: null });
  }

  /** برگ‌ها به `transferTo` یا بی‌سرپرست، حوزه‌ها بی‌تأییدکننده، جایگزین به مدیر پروژه، عضویت `removed`. */
  async removeWithTransfer(
    tx: EntityManager,
    input: { readonly projectId: string; readonly userId: string; readonly transferTo: string | null },
  ): Promise<void> {
    const member = await tx.findOne(ProjectMember, { projectId: input.projectId, userId: input.userId, status: 'active' });
    if (!member) return;
    const project = await this.projects.context(input.projectId, tx);
    const items = await this.plan.items(input.projectId, tx);
    const leaves = items.filter((item) => item.isLeaf && item.supervisorUserId === input.userId).map((item) => item.id);
    if (leaves.length > 0) await this.assignments.reassign(tx, project, items, leaves, input.transferTo);
    await this.routes.releaseReviewer(tx, project, input.userId, true);
    member.status = 'removed';
    // مالکیت ریسک‌های عضو حذف‌شده به مدیر پروژه می‌رسد (risk.md ۱۱) و قواعد هشدار دوباره ارزیابی می‌شوند
    await this.outbox.emit(tx, { type: 'MemberChanged', projectId: input.projectId, payload: { v: 1, change: 'removed', userId: input.userId } });
  }
}
