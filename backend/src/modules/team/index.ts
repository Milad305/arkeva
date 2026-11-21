// API عمومی ماژول team (docs/backend/03 ۵).
import { ProjectMember, ProjectMemberRole } from './domain/project-member.entity.js';
import { ApprovalRoute, WbsAssignmentHistory } from './domain/team.entities.js';

export { TeamModule } from './team.module.js';
export { TeamService, type MemberSummary } from './application/team.service.js';
export { ApprovalRoutes } from './application/approval-routes.js';
export { Assignments } from './application/assignments.js';
export { type TeamPlanItem, TeamPlanPort, type TeamProjectContext, TeamProjectPort } from './application/team-ports.js';

const ENTITIES = [ProjectMember, ProjectMemberRole, ApprovalRoute, WbsAssignmentHistory];
export const TEAM_ENTITIES = ENTITIES;
export const TEAM_TENANT_ENTITIES = ENTITIES;
