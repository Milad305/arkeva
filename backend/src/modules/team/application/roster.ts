import type { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectRoleCode } from '@projeyar/shared';
import { SYSTEM_ROLE_IDS } from '../../../database/system-ids.js';
import { ProjectMember, ProjectMemberRole } from '../domain/project-member.entity.js';

// خواندن عضویت‌های فعال و نقش‌های سیستمی‌شان — مشترک MembershipPort و سرویس‌های F07 (بی وابستگی DI چرخشی).

export interface RosterEntry {
  readonly memberId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly roles: readonly ProjectRoleCode[];
  readonly joinedAt: Date;
}

const ROLE_BY_ID = new Map(Object.entries(SYSTEM_ROLE_IDS).map(([code, id]) => [id, code as ProjectRoleCode]));

export async function rosterOf(em: EntityManager, where: { readonly projectId?: string; readonly userIds?: readonly string[] }): Promise<RosterEntry[]> {
  const members = await em.find(
    ProjectMember,
    {
      status: 'active',
      ...(where.projectId ? { projectId: where.projectId } : {}),
      ...(where.userIds ? { userId: { $in: [...where.userIds] } } : {}),
    },
    { orderBy: { createdAt: 'asc' } },
  );
  if (members.length === 0) return [];
  const rows = await em.find(ProjectMemberRole, { memberId: { $in: members.map((member) => member.id) } });
  return members.map((member) => ({
    memberId: member.id,
    userId: member.userId,
    projectId: member.projectId,
    roles: rows.filter((row) => row.memberId === member.id).flatMap((row) => ROLE_BY_ID.get(row.roleId) ?? []),
    joinedAt: member.createdAt,
  }));
}
