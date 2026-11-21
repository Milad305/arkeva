// API عمومی ماژول projects (docs/backend/03 ۵).
import { OrgOfficialHoliday, ProjectCalendar, ProjectSettings, ProjectWizardDraft } from './domain/project-settings.entity.js';
import { Project, ProjectCodeRegister, ProjectType } from './domain/project.entity.js';

export { ProjectsModule } from './projects.module.js';
export { ProjectBasicsCatalog } from './application/project-catalog.js';
export { PortfolioSummary } from './application/portfolio-summary.js';
export { ProjectMspFlag } from './application/project-msp.js';
export {
  type ActivationItem,
  PlanActivation,
  ProjectPendingCounts,
  ProjectAlertRules,
  type AlertRuleView,
  PlanBootstrap,
  type PlanDraftSummaryView,
  type PlanVersionRefView,
  type ProjectPlanContext,
  ProjectPlanAccess,
  ProjectPlanState,
  type ProjectPlanStateView,
} from './application/plan-ports.js';
export { type KeyMilestone } from './domain/project.entity.js';
export {
  type BackupsView,
  type IntegrationCardView,
  type NotificationMatrixRowView,
  type PreparedTemplate,
  ProjectBackupsView,
  ProjectIntegrationCards,
  ProjectNotificationMatrix,
  ProjectRiskCounts,
  ProjectTemplates,
  type WizardTemplateView,
} from './application/settings-ports.js';

const ENTITIES = [Project, ProjectType, ProjectCodeRegister, ProjectSettings, ProjectCalendar, OrgOfficialHoliday, ProjectWizardDraft];
export const PROJECTS_ENTITIES = ENTITIES;
export const PROJECTS_TENANT_ENTITIES = ENTITIES;
export { ProjectRules, type ProjectRulesView } from './application/project-rules.js';
export { type CostCutoffView, ProjectCostCutoff } from './application/cost-cutoff.js';
