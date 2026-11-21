import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type SystemRole, WEB_PANEL_ROLES, widerScope, type Permission, type PermissionScope } from '@projeyar/shared';
import type { Actor } from '../../../platform/context/app-context.js';
import { AccessResolver, type ResolvedAccess } from '../../../platform/security/access.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectMember, ProjectMemberRole } from '../domain/project-member.entity.js';

/**
 * دسترسی حل‌شده (access-control.md ۵.۲): عضویت‌های فعال کاربر ← نقش‌ها ← کدها؛ اجتماع نقش‌ها در
 * هر پروژه با وسیع‌ترین scope. هر درخواست یک بار از پایگاه داده، نه از توکن (07 ۳).
 */
@Injectable()
export class TeamAccessResolver extends AccessResolver {
  constructor(
    private readonly em: EntityManager,
    private readonly identity: IdentityService,
  ) {
    super();
  }

  async resolve(actor: Actor): Promise<ResolvedAccess> {
    const [isOrgAdmin, members] = await Promise.all([
      this.identity.isOrgAdmin(actor.userId),
      this.em.find(ProjectMember, { userId: actor.userId, status: 'active' }),
    ]);
    const memberRoles = members.length ? await this.em.find(ProjectMemberRole, { memberId: { $in: members.map((member) => member.id) } }) : [];
    const grants = await this.identity.roleGrants(memberRoles.map((row) => row.roleId));

    const projectOf = new Map(members.map((member) => [member.id, member.projectId]));
    const projects = new Map<string, Map<Permission, PermissionScope>>();
    const roleCodes = new Set<string>();
    for (const member of members) projects.set(member.projectId, new Map());

    for (const row of memberRoles) {
      const projectId = projectOf.get(row.memberId);
      const grant = grants.get(row.roleId);
      if (!projectId || !grant) continue;
      // نقش سیستمی فقط‌اپ (سرپرست) در نشست وب حساب نمی‌شود (§۷.۳ ردیف ۱۷؛ تصمیم کاربر 1405/08/22)
      if (actor.client === 'web' && grant.isSystem && !WEB_PANEL_ROLES.includes(grant.roleCode as SystemRole)) continue;
      roleCodes.add(grant.roleCode);
      const codes = projects.get(projectId) ?? new Map<Permission, PermissionScope>();
      for (const [code, scope] of grant.permissions) {
        const current = codes.get(code);
        codes.set(code, current ? widerScope(current, scope) : scope);
      }
      projects.set(projectId, codes);
    }
    return { isOrgAdmin, roleCodes, projects };
  }
}
