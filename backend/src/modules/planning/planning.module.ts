import { BaselineReplacer } from './application/baseline-replacer.js';
import { ScheduleProposals } from './application/schedule-proposals.js';
import { PlanSearch } from './application/plan-search.js';
import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { PlanBootstrap, ProjectPlanState } from '../projects/index.js';
import { PlanBootstrapProvider, PlanStateProvider } from './application/plan-state.js';
import { PlanApplyStep } from './application/plan-apply.js';
import { PlanContentStore } from './application/plan-content.store.js';
import { PlanningService } from './application/planning.service.js';
import { TeamPlanProvider } from './application/team-plan.provider.js';
import { TeamPlanPort } from '../team/index.js';

// F04 — نسخه‌های برنامه (docs/backend/01 ۴). مالک PlanVersion، همهٔ *Plan و جدول‌های جاری WbsItem (بعد CbsItem،
// WbsCbsLink). سراسری چون قراردادهای projects (PlanBootstrap، ProjectPlanState) را پیاده می‌کند.
@Global()
@Module({
  imports: [IdentityModule],
  providers: [
    PlanSearch,
    PlanningService,
    BaselineReplacer,
    ScheduleProposals,
    PlanContentStore,
    PlanApplyStep,
    PlanStateProvider,
    PlanBootstrapProvider,
    { provide: ProjectPlanState, useExisting: PlanStateProvider },
    { provide: PlanBootstrap, useExisting: PlanBootstrapProvider },
    TeamPlanProvider,
    { provide: TeamPlanPort, useExisting: TeamPlanProvider },
  ],
  exports: [PlanningService, BaselineReplacer, ScheduleProposals, ProjectPlanState, PlanBootstrap, TeamPlanPort, PlanSearch],
})
export class PlanningModule {}
