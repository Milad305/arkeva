import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۵ — تیم، حوزه‌های تأیید و تخصیص (F07؛ `02` ۳ و ۴؛ team-assignment.md ۵–۶).
//   • approval_route: نام حوزه، ریشه‌های زیردرخت WBS و تأییدکنندهٔ مرحلهٔ اول. هر ریشه حداکثر در یک حوزه (سرویس).
//   • wbs_assignment_history: واقعیت؛ هر تغییر سرپرست یک ردیف باز را می‌بندد و یکی باز می‌کند (یک باز برای هر برگ).
//   • ستون wbs_item.supervisor_user_id از برش ۳ هست؛ نویسنده‌اش team است.

export class Migration20261120000000_team extends Migration {
  override name = 'Migration20261120000000_team';

  override up(): void {
    this.addSql(`
create table approval_route (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  area_name text not null,
  root_item_ids jsonb not null default '[]',
  reviewer_user_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint approval_route_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index approval_route_project_idx on approval_route (org_id, project_id);

create table wbs_assignment_history (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  wbs_item_id uuid not null,
  supervisor_user_id uuid not null,
  from_at timestamptz not null,
  to_at timestamptz,
  assigned_by_user_id uuid,
  created_at timestamptz not null,
  constraint wbs_assignment_history_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint wbs_assignment_history_span check (to_at is null or to_at >= from_at)
);
create unique index wbs_assignment_history_open_uq on wbs_assignment_history (wbs_item_id) where to_at is null;
create index wbs_assignment_history_project_idx on wbs_assignment_history (org_id, project_id, wbs_item_id);`);

    for (const table of ['approval_route', 'wbs_assignment_history']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on approval_route to ${APP_DB_ROLE};`);
    // واقعیت: فقط بستن ردیف باز (to_at)، نه حذف
    this.addSql(`grant select, insert, update on wbs_assignment_history to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists wbs_assignment_history, approval_route cascade;`);
  }
}
