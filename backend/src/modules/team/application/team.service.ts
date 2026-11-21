import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectRoleCode } from '@projeyar/shared';
import { SYSTEM_ROLE_IDS } from '../../../database/system-ids.js';
import { newId } from '../../../platform/database/ids.js';
import { IdentityService, type PersonRef } from '../../identity/index.js';
import { ProjectMember, ProjectMemberRole } from '../domain/project-member.entity.js';

export interface MemberSummary {
  readonly count: number;
  /** چند عضو اول برای ردیف آواتار کارت‌ها (W07). */
  readonly preview: PersonRef[];
}

/** API عمومی F07 برای ماژول‌های دیگر (docs/backend/01 ۴). */
@Injectable()
export class TeamService {
  constructor(
    private readonly em: EntityManager,
    private readonly identity: IdentityService,
  ) {}

  /**
   * تیم اولیهٔ پروژهٔ تازه (F02 ۵.۳–۵.۴) درون تراکنش ساخت: هر کاربر یک عضویت با نقش‌هایش.
   * نقش تکراری یک بار؛ تنها نویسندهٔ عضویت همین ماژول است (`03` ۲).
   */
  async addInitialMembers(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly projectId: string;
      readonly members: readonly { readonly userId: string; readonly roles: readonly ProjectRoleCode[] }[];
    },
  ): Promise<void> {
    const byUser = new Map<string, Set<ProjectRoleCode>>();
    for (const member of input.members) byUser.set(member.userId, new Set([...(byUser.get(member.userId) ?? []), ...member.roles]));
    const created = [...byUser].map(([userId, roles]) => ({
      member: tx.create(ProjectMember, { id: newId(), orgId: input.orgId, projectId: input.projectId, userId, status: 'active' }),
      roles,
    }));
    // جدول‌ها رابطهٔ ORM ندارند (فقط کلید خارجی پایگاه داده)؛ ترتیب درج با flush صریح: عضو پیش از نقش
    await tx.flush();
    for (const { member, roles } of created) {
      for (const role of roles) tx.create(ProjectMemberRole, { id: newId(), orgId: input.orgId, memberId: member.id, roleId: SYSTEM_ROLE_IDS[role] });
    }
  }

  /** آیا کاربر در دست‌کم یک پروژه این نقش سیستمی را دارد (پیش‌فرض «خودم» برای مدیر در W48). */
  async hasRoleAnywhere(userId: string, role: ProjectRoleCode): Promise<boolean> {
    const members = await this.em.find(ProjectMember, { userId, status: 'active' }, { fields: ['id'] });
    if (members.length === 0) return false;
    return (await this.em.count(ProjectMemberRole, { memberId: { $in: members.map((member) => member.id) }, roleId: SYSTEM_ROLE_IDS[role] })) > 0;
  }

  /** اعضای فعال پروژه‌های داده‌شده با این نقش‌ها — برای «پیشنهاد از پروژه‌های مشابه» (W48). */
  async membersWithRoles(projectIds: readonly string[], roles: readonly ProjectRoleCode[]): Promise<{ userId: string; role: ProjectRoleCode }[]> {
    if (projectIds.length === 0 || roles.length === 0) return [];
    const members = await this.em.find(ProjectMember, { projectId: { $in: [...projectIds] }, status: 'active' });
    if (members.length === 0) return [];
    const roleIds = new Map(roles.map((role) => [SYSTEM_ROLE_IDS[role], role]));
    const rows = await this.em.find(ProjectMemberRole, { memberId: { $in: members.map((member) => member.id) }, roleId: { $in: [...roleIds.keys()] } });
    const userOf = new Map(members.map((member) => [member.id, member.userId]));
    const seen = new Set<string>();
    return rows.flatMap((row) => {
      const userId = userOf.get(row.memberId);
      const role = roleIds.get(row.roleId);
      if (!userId || !role || seen.has(`${userId}:${role}`)) return [];
      seen.add(`${userId}:${role}`);
      return [{ userId, role }];
    });
  }

  /** عضو فعال پروژه است؟ (هدف انتقال مدیریت، F02 ۸.۴) */
  async isActiveMember(projectId: string, userId: string): Promise<boolean> {
    return (await this.em.count(ProjectMember, { projectId, userId, status: 'active' })) > 0;
  }

  /**
   * نقش‌ها در انتقال مدیریت (F02 ۸.۴؛ AC-PS-08): مدیر تازه «مدیر پروژه» می‌گیرد و مدیر قبلی به‌جای آن
   * «برنامه‌ریز». درون تراکنش فرمان پروژه؛ نویسندهٔ عضویت و نقش فقط همین ماژول است (`03` ۲).
   */
  async transferManagerRoles(tx: EntityManager, projectId: string, fromUserId: string, toUserId: string): Promise<void> {
    const members = await tx.find(ProjectMember, { projectId, userId: { $in: [fromUserId, toUserId] }, status: 'active' });
    const target = members.find((member) => member.userId === toUserId);
    if (!target) throw new Error('هدف انتقال عضو فعال پروژه نیست');
    const previous = members.find((member) => member.userId === fromUserId);
    const roles = await tx.find(ProjectMemberRole, { memberId: { $in: members.map((member) => member.id) } });
    const has = (memberId: string, roleId: string) => roles.some((row) => row.memberId === memberId && row.roleId === roleId);
    const add = (member: ProjectMember, roleId: string) => {
      if (!has(member.id, roleId)) tx.create(ProjectMemberRole, { id: newId(), orgId: member.orgId, memberId: member.id, roleId });
    };

    add(target, SYSTEM_ROLE_IDS.project_manager);
    if (previous) {
      for (const row of roles.filter((item) => item.memberId === previous.id && item.roleId === SYSTEM_ROLE_IDS.project_manager)) tx.remove(row);
      add(previous, SYSTEM_ROLE_IDS.planner);
    }
  }

  /** خلاصهٔ اعضای فعال چند پروژه با یک پرس‌وجو؛ مدیر پروژه اول پیش‌نمایش می‌آید. */
  async memberSummaries(projects: readonly { readonly id: string; readonly managerUserId: string }[], previewSize = 3): Promise<Map<string, MemberSummary>> {
    if (projects.length === 0) return new Map();
    const members = await this.em.find(
      ProjectMember,
      { projectId: { $in: projects.map((project) => project.id) }, status: 'active' },
      { fields: ['projectId', 'userId'], orderBy: { createdAt: 'asc' } },
    );
    const byProject = new Map<string, string[]>();
    for (const member of members) byProject.set(member.projectId, [...(byProject.get(member.projectId) ?? []), member.userId]);

    const people = await this.identity.personRefs(members.map((member) => member.userId));
    return new Map(
      projects.map((project) => {
        const userIds = byProject.get(project.id) ?? [];
        const ordered = [project.managerUserId, ...userIds.filter((id) => id !== project.managerUserId)];
        const preview = ordered.flatMap((id) => people.get(id) ?? []).slice(0, previewSize);
        return [project.id, { count: userIds.length, preview }];
      }),
    );
  }
}
