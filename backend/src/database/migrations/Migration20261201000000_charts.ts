import { Migration } from '@mikro-orm/migrations';
import { DEFAULT_ROLE_PERMISSIONS, type ProjectRoleCode } from '@projeyar/shared';
import { APP_DB_ROLE, SYSTEM_ROLE_IDS } from '../system-ids.js';

// برش ۱۴الف — لایهٔ خواندن نمودارها (F17؛ charts.md ۵؛ تصمیم 1405/08/25).
//   • plan_version_curve: درصد برنامه‌ای و PV روزانهٔ هر نسخهٔ اعمال‌شده با تقویم لحظهٔ اعمال؛ واقعیت (فقط درج) تا خط «برنامهٔ
//     اولیه» منحنی S پس از بازنگری یا تغییر تقویم عوض نشود (AC-CH-03). مالک: computation.
//   • dashboard.view برای نقش‌های وب پایگاه دادهٔ موجود (access-control ۵.۴)؛ پایگاه تازه آن را از migration اولیه دارد.

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;
/** فضای شناسهٔ جدا (…-8002-) تا با ردیف‌های شماره‌دار migration اولیه برنخورد. */
const grantId = (roleId: string, index: number): string => `01930000-0000-7000-8002-${roleId.slice(-3)}${index.toString(16).padStart(9, '0')}`;

export class Migration20261201000000_charts extends Migration {
  override name = 'Migration20261201000000_charts';

  override up(): void {
    this.addSql(`
create table plan_version_curve (
  plan_version_id uuid not null,
  date date not null,
  org_id uuid not null,
  project_id uuid not null,
  planned_percent numeric(7,4) not null,
  pv bigint not null,
  cumulative_bac bigint not null,
  primary key (plan_version_id, date),
  constraint plan_version_curve_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index plan_version_curve_project_idx on plan_version_curve (org_id, project_id, plan_version_id);
alter table plan_version_curve enable row level security;
create policy plan_version_curve_tenant on plan_version_curve using (org_id = app_current_org()) with check (org_id = app_current_org());
grant select, insert on plan_version_curve to ${APP_DB_ROLE};`);

    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as ProjectRoleCode[]) {
      const grants = DEFAULT_ROLE_PERMISSIONS[role];
      const index = grants.findIndex((grant) => grant.code === 'dashboard.view');
      if (index < 0) continue;
      const roleId = SYSTEM_ROLE_IDS[role];
      this.addSql(
        `insert into role_permission (id, role_id, permission_code, scope) values (${sqlString(grantId(roleId, index))}, ${sqlString(roleId)}, 'dashboard.view', 'all') on conflict do nothing;`,
      );
    }
  }

  override down(): void {
    this.addSql(`drop table if exists plan_version_curve;`);
    this.addSql(`delete from role_permission where permission_code = 'dashboard.view';`);
  }
}
