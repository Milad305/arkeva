import { ALERTS_ENTITIES, ALERTS_TENANT_ENTITIES } from '../modules/alerts/index.js';
import { APPROVALS_ENTITIES, APPROVALS_TENANT_ENTITIES } from '../modules/approvals/index.js';
import { CBS_ENTITIES, CBS_TENANT_ENTITIES } from '../modules/cbs/index.js';
import { COMPUTATION_ENTITIES, COMPUTATION_TENANT_ENTITIES } from '../modules/computation/index.js';
import { COST_LEDGER_ENTITIES, COST_LEDGER_TENANT_ENTITIES } from '../modules/cost-ledger/index.js';
import { RISKS_ENTITIES, RISKS_TENANT_ENTITIES } from '../modules/risks/index.js';
import { TEMPLATES_ENTITIES, TEMPLATES_TENANT_ENTITIES } from '../modules/templates/index.js';
import { MSP_ENTITIES, MSP_TENANT_ENTITIES } from '../modules/msp/index.js';
import { REPORTS_ENTITIES, REPORTS_TENANT_ENTITIES } from '../modules/reports/index.js';
import { BACKUPS_ENTITIES, BACKUPS_TENANT_ENTITIES } from '../modules/backups/index.js';
import { INTEGRATIONS_ENTITIES, INTEGRATIONS_TENANT_ENTITIES } from '../modules/integrations/index.js';
import { FIELD_ENTITIES, FIELD_TENANT_ENTITIES } from '../modules/field/index.js';
import { IDENTITY_ENTITIES, IDENTITY_TENANT_ENTITIES } from '../modules/identity/index.js';
import { NOTIFICATIONS_ENTITIES, NOTIFICATIONS_TENANT_ENTITIES } from '../modules/notifications/index.js';
import { PLANNING_ENTITIES, PLANNING_TENANT_ENTITIES } from '../modules/planning/index.js';
import { PROJECTS_ENTITIES, PROJECTS_TENANT_ENTITIES } from '../modules/projects/index.js';
import { TEAM_ENTITIES, TEAM_TENANT_ENTITIES } from '../modules/team/index.js';
import type { DatabaseOptions } from '../platform/database/database.module.js';
import { PLATFORM_ENTITIES, PLATFORM_TENANT_ENTITIES } from '../platform/events.module.js';
import { Migration20261112000000_init } from './migrations/Migration20261112000000_init.js';
import { Migration20261113000000_platform_events } from './migrations/Migration20261113000000_platform_events.js';
import { Migration20261114000000_project_lifecycle } from './migrations/Migration20261114000000_project_lifecycle.js';
import { Migration20261115000000_project_setup } from './migrations/Migration20261115000000_project_setup.js';
import { Migration20261116000000_users_roles } from './migrations/Migration20261116000000_users_roles.js';
import { Migration20261117000000_notifications } from './migrations/Migration20261117000000_notifications.js';
import { Migration20261118000000_planning } from './migrations/Migration20261118000000_planning.js';
import { Migration20261119000000_cbs } from './migrations/Migration20261119000000_cbs.js';
import { Migration20261120000000_team } from './migrations/Migration20261120000000_team.js';
import { Migration20261121000000_field_reports } from './migrations/Migration20261121000000_field_reports.js';
import { Migration20261122000000_cost_ledger } from './migrations/Migration20261122000000_cost_ledger.js';
import { Migration20261123000000_computation } from './migrations/Migration20261123000000_computation.js';
import { Migration20261124000000_periods } from './migrations/Migration20261124000000_periods.js';
import { Migration20261125000000_storage } from './migrations/Migration20261125000000_storage.js';
import { Migration20261126000000_field_app } from './migrations/Migration20261126000000_field_app.js';
import { Migration20261127000000_alerts } from './migrations/Migration20261127000000_alerts.js';
import { Migration20261128000000_notification_delivery } from './migrations/Migration20261128000000_notification_delivery.js';
import { Migration20261129000000_risks } from './migrations/Migration20261129000000_risks.js';
import { Migration20261130000000_site_issues } from './migrations/Migration20261130000000_site_issues.js';
import { Migration20261201000000_charts } from './migrations/Migration20261201000000_charts.js';
import { Migration20261202000000_search } from './migrations/Migration20261202000000_search.js';
import { Migration20261203000000_templates } from './migrations/Migration20261203000000_templates.js';
import { Migration20261204000000_msp } from './migrations/Migration20261204000000_msp.js';
import { Migration20261205000000_msp_sync } from './migrations/Migration20261205000000_msp_sync.js';
import { Migration20261206000000_reports } from './migrations/Migration20261206000000_reports.js';
import { Migration20261207000000_report_schedules } from './migrations/Migration20261207000000_report_schedules.js';
import { Migration20261208000000_backups } from './migrations/Migration20261208000000_backups.js';
import { Migration20261209000000_invite_code } from './migrations/Migration20261209000000_invite_code.js';
import { Migration20261210000000_org_signup } from './migrations/Migration20261210000000_org_signup.js';

// ریشهٔ ترکیب پایگاه داده: Entityها، Entityهای مستأجر و migrationها از همهٔ ماژول‌ها.
// migration تازه فقط اینجا ثبت می‌شود (کشف خودکار پوشه در ESM و dist نه؛ 05 ۶).

export const DATABASE: DatabaseOptions = {
  entities: [
    ...PLATFORM_ENTITIES,
    ...IDENTITY_ENTITIES,
    ...TEAM_ENTITIES,
    ...PROJECTS_ENTITIES,
    ...NOTIFICATIONS_ENTITIES,
    ...PLANNING_ENTITIES,
    ...CBS_ENTITIES,
    ...COST_LEDGER_ENTITIES,
    ...FIELD_ENTITIES,
    ...APPROVALS_ENTITIES,
    ...COMPUTATION_ENTITIES,
    ...ALERTS_ENTITIES,
    ...RISKS_ENTITIES,
    ...TEMPLATES_ENTITIES,
    ...MSP_ENTITIES,
    ...REPORTS_ENTITIES,
    ...BACKUPS_ENTITIES,
    ...INTEGRATIONS_ENTITIES,
  ],
  tenantEntities: [
    ...PLATFORM_TENANT_ENTITIES,
    ...IDENTITY_TENANT_ENTITIES,
    ...TEAM_TENANT_ENTITIES,
    ...PROJECTS_TENANT_ENTITIES,
    ...NOTIFICATIONS_TENANT_ENTITIES,
    ...PLANNING_TENANT_ENTITIES,
    ...CBS_TENANT_ENTITIES,
    ...COST_LEDGER_TENANT_ENTITIES,
    ...FIELD_TENANT_ENTITIES,
    ...APPROVALS_TENANT_ENTITIES,
    ...COMPUTATION_TENANT_ENTITIES,
    ...ALERTS_TENANT_ENTITIES,
    ...RISKS_TENANT_ENTITIES,
    ...TEMPLATES_TENANT_ENTITIES,
    ...MSP_TENANT_ENTITIES,
    ...REPORTS_TENANT_ENTITIES,
    ...BACKUPS_TENANT_ENTITIES,
    ...INTEGRATIONS_TENANT_ENTITIES,
  ],
  migrations: [
    { name: 'Migration20261112000000_init', class: Migration20261112000000_init },
    { name: 'Migration20261113000000_platform_events', class: Migration20261113000000_platform_events },
    { name: 'Migration20261114000000_project_lifecycle', class: Migration20261114000000_project_lifecycle },
    { name: 'Migration20261115000000_project_setup', class: Migration20261115000000_project_setup },
    { name: 'Migration20261116000000_users_roles', class: Migration20261116000000_users_roles },
    { name: 'Migration20261117000000_notifications', class: Migration20261117000000_notifications },
    { name: 'Migration20261118000000_planning', class: Migration20261118000000_planning },
    { name: 'Migration20261119000000_cbs', class: Migration20261119000000_cbs },
    { name: 'Migration20261120000000_team', class: Migration20261120000000_team },
    { name: 'Migration20261121000000_field_reports', class: Migration20261121000000_field_reports },
    { name: 'Migration20261122000000_cost_ledger', class: Migration20261122000000_cost_ledger },
    { name: 'Migration20261123000000_computation', class: Migration20261123000000_computation },
    { name: 'Migration20261124000000_periods', class: Migration20261124000000_periods },
    { name: 'Migration20261125000000_storage', class: Migration20261125000000_storage },
    { name: 'Migration20261126000000_field_app', class: Migration20261126000000_field_app },
    { name: 'Migration20261127000000_alerts', class: Migration20261127000000_alerts },
    { name: 'Migration20261128000000_notification_delivery', class: Migration20261128000000_notification_delivery },
    { name: 'Migration20261129000000_risks', class: Migration20261129000000_risks },
    { name: 'Migration20261130000000_site_issues', class: Migration20261130000000_site_issues },
    { name: 'Migration20261201000000_charts', class: Migration20261201000000_charts },
    { name: 'Migration20261202000000_search', class: Migration20261202000000_search },
    { name: 'Migration20261203000000_templates', class: Migration20261203000000_templates },
    { name: 'Migration20261204000000_msp', class: Migration20261204000000_msp },
    { name: 'Migration20261205000000_msp_sync', class: Migration20261205000000_msp_sync },
    { name: 'Migration20261206000000_reports', class: Migration20261206000000_reports },
    { name: 'Migration20261207000000_report_schedules', class: Migration20261207000000_report_schedules },
    { name: 'Migration20261208000000_backups', class: Migration20261208000000_backups },
    { name: 'Migration20261209000000_invite_code', class: Migration20261209000000_invite_code },
    { name: 'Migration20261210000000_org_signup', class: Migration20261210000000_org_signup },
  ],
};
