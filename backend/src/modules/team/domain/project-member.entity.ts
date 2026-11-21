import { defineEntity, p } from '@mikro-orm/postgresql';
import { MEMBER_STATUSES } from '@projeyar/shared';
import { mutableBase, tenantBase } from '../../../platform/database/base-properties.js';

/** ProjectMember — `02` ۲. یکتا روی (project_id, user_id). مالک: F07 (`03` ۲). */
const ProjectMemberSchema = defineEntity({
  name: 'ProjectMember',
  tableName: 'project_member',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    userId: p.uuid(),
    status: p.enum(MEMBER_STATUSES).default('active'),
  },
});

export class ProjectMember extends ProjectMemberSchema.class {}
ProjectMemberSchema.setClass(ProjectMember);

/** نقش‌های یک عضو در همان پروژه (W27: یک یا چند نقش). */
const ProjectMemberRoleSchema = defineEntity({
  name: 'ProjectMemberRole',
  tableName: 'project_member_role',
  properties: {
    ...tenantBase(),
    memberId: p.uuid(),
    roleId: p.uuid(),
  },
});

export class ProjectMemberRole extends ProjectMemberRoleSchema.class {}
ProjectMemberRoleSchema.setClass(ProjectMemberRole);
