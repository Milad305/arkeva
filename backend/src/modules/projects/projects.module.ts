import { Global, Module } from '@nestjs/common';
import { IdentityModule, OrganizationStats, ProjectCatalog } from '../identity/index.js';
import { ProjectLifecycleController } from './api/project-lifecycle.controller.js';
import { OfficialHolidaysController, ProjectSettingsController } from './api/project-settings.controller.js';
import { ProjectsController } from './api/projects.controller.js';
import { WizardController } from './api/wizard.controller.js';
import { OfficialHolidays } from './application/official-holidays.js';
import { ProjectActivation } from './application/project-activation.js';
import { ProjectBasicsCatalog } from './application/project-catalog.js';
import { ProjectCreation } from './application/project-creation.js';
import { ProjectMspFlag } from './application/project-msp.js';
import { PortfolioSummary } from './application/portfolio-summary.js';
import { ProjectDetailQuery } from './application/project-detail.js';
import { ProjectLifecycle } from './application/project-lifecycle.js';
import { ProjectPurge } from './application/project-purge.js';
import { ProjectQueries } from './application/project-queries.js';
import { ProjectRules } from './application/project-rules.js';
import { ProjectCostCutoff } from './application/cost-cutoff.js';
import { ProjectSettingsService } from './application/project-settings.js';
import { ProjectStats } from './application/project-stats.js';
import { ProjectPlanAccess } from './application/plan-ports.js';
import { ProjectTeamProvider } from './application/team-ports.provider.js';
import { TeamProjectPort } from '../team/index.js';
import { WizardDrafts } from './application/wizard-drafts.js';
import { WizardPreview } from './application/wizard-preview.js';

// F02 — ساخت و تنظیمات پروژه. سراسری فقط برای OrganizationStats (پیاده‌سازی قرارداد identity).
@Global()
@Module({
  imports: [IdentityModule],
  // WizardController پیش از ProjectsController: «/projects/code-available» نباید به «/projects/:projectId» برسد
  controllers: [WizardController, ProjectsController, ProjectLifecycleController, ProjectSettingsController, OfficialHolidaysController],
  providers: [
    ProjectMspFlag,
    ProjectQueries,
    ProjectDetailQuery,
    PortfolioSummary,
    ProjectLifecycle,
    ProjectActivation,
    ProjectRules,
    ProjectCostCutoff,
    ProjectPurge,
    ProjectStats,
    OfficialHolidays,
    WizardDrafts,
    WizardPreview,
    ProjectCreation,
    ProjectSettingsService,
    { provide: OrganizationStats, useExisting: ProjectStats },
    ProjectBasicsCatalog,
    { provide: ProjectCatalog, useExisting: ProjectBasicsCatalog },
    ProjectPlanAccess,
    ProjectTeamProvider,
    { provide: TeamProjectPort, useExisting: ProjectTeamProvider },
  ],
  exports: [ProjectMspFlag, OrganizationStats, ProjectCatalog, ProjectPlanAccess, TeamProjectPort, ProjectRules, ProjectCostCutoff, ProjectBasicsCatalog, PortfolioSummary],
})
export class ProjectsModule {}
