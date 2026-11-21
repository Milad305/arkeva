import { Global, Module } from '@nestjs/common';
import { AccessResolver } from '../../platform/security/access.js';
import { IdentityModule, MembershipPort } from '../identity/index.js';
import { TeamController } from './api/team.controller.js';
import { ApprovalRoutes } from './application/approval-routes.js';
import { Assignments } from './application/assignments.js';
import { TeamMemberships } from './application/membership.port.js';
import { PlanAppliedAssignments } from './application/plan-applied.consumer.js';
import { TeamAccessResolver } from './application/team-access.resolver.js';
import { TeamMembers } from './application/team-members.js';
import { TeamService } from './application/team.service.js';

// F07 — تیم، تخصیص و حوزه‌های تأیید. سراسری چون پیاده‌سازی AccessResolver گارد دسترسی و MembershipPort را
// می‌دهد (07 ۱). پروژه و برگ‌های WBS را از درگاه‌های TeamProjectPort و TeamPlanPort می‌خواند که projects و
// planning (بالاتر از team) پیاده می‌کنند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [TeamController],
  providers: [
    TeamService,
    TeamAccessResolver,
    TeamMemberships,
    Assignments,
    ApprovalRoutes,
    TeamMembers,
    PlanAppliedAssignments,
    { provide: AccessResolver, useExisting: TeamAccessResolver },
    { provide: MembershipPort, useExisting: TeamMemberships },
  ],
  exports: [TeamService, AccessResolver, MembershipPort, ApprovalRoutes, Assignments],
})
export class TeamModule {}
