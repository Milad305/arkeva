import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۹الف — موتور محاسبه (F10، F11؛ `02` ۷؛ progress-calculation.md ۴).
//   • جدول‌های مشتق «لحظهٔ فعلی»: wbs_item_progress، project_progress، cbs_item_progress — فقط computation می‌نویسد.
//   • snapshot روزانه با کلید (موضوع، تاریخ) و ایندکس (پروژه، تاریخ) (۱۰).
//   • compute_run عملیاتی؛ یک ردیف queued برای هر پروژه رویدادهای نزدیک را تجمیع می‌کند.
//   • active_projects_for_compute: تیک روزانه پروژه‌های فعال همهٔ سازمان‌ها را بی RLS پیدا می‌کند (همان الگوی due_field_reviews).

export class Migration20261123000000_computation extends Migration {
  override name = 'Migration20261123000000_computation';

  override up(): void {
    this.addSql(`
create table wbs_item_progress (
  wbs_item_id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  data_date date not null,
  planned_percent numeric(7,4) not null,
  actual_percent numeric(7,4) not null,
  actual_quantity numeric(18,4),
  pending_percent numeric(7,4),
  deviation numeric(7,4) not null,
  status text not null check (status in ('not_started', 'on_track', 'ahead', 'warning', 'critical', 'completed')),
  bac bigint not null,
  pv bigint not null,
  ev bigint not null,
  forecast_finish date,
  last_approved_at timestamptz,
  in_reference boolean not null,
  weight_in_project numeric(7,4) not null,
  over_total_quantity boolean not null default false,
  computed_at timestamptz not null,
  constraint wbs_item_progress_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index wbs_item_progress_project_idx on wbs_item_progress (org_id, project_id);

create table project_progress (
  project_id uuid primary key,
  org_id uuid not null,
  data_date date,
  planned_percent numeric(7,4) not null default 0,
  actual_percent numeric(7,4) not null default 0,
  financial_percent numeric(7,4) not null default 0,
  bac bigint not null default 0,
  pv bigint not null default 0,
  ev bigint not null default 0,
  ac bigint not null default 0,
  cv bigint not null default 0,
  sv bigint not null default 0,
  eac bigint not null default 0,
  vac bigint not null default 0,
  cpi double precision,
  spi double precision,
  tcpi double precision,
  eac_low_confidence boolean not null default false,
  forecast_finish date,
  delay_days integer,
  cost_indices_date date,
  unallocated_budget bigint not null default 0,
  leaf_counts jsonb,
  out_of_reference jsonb,
  compute_state text not null default 'updating' check (compute_state in ('fresh', 'updating', 'failed')),
  pending_count integer not null default 0,
  last_error text,
  computed_at timestamptz,
  constraint project_progress_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create table cbs_item_progress (
  cbs_item_id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  data_date date not null,
  cost_indices_date date not null,
  ac bigint not null,
  consumed_percent double precision,
  ev bigint not null,
  cpi double precision,
  eac bigint not null,
  eac_variance_percent double precision,
  eac_low_confidence boolean not null,
  consumed_quantity numeric(18,4),
  earned_quantity numeric(18,4),
  excess_quantity numeric(18,4),
  computed_at timestamptz not null,
  constraint cbs_item_progress_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index cbs_item_progress_project_idx on cbs_item_progress (org_id, project_id);

create table wbs_item_daily_snapshot (
  wbs_item_id uuid not null,
  date date not null,
  org_id uuid not null,
  project_id uuid not null,
  planned_percent numeric(7,4) not null,
  actual_percent numeric(7,4) not null,
  actual_quantity numeric(18,4),
  deviation numeric(7,4) not null,
  status text not null,
  bac bigint not null,
  pv bigint not null,
  ev bigint not null,
  in_reference boolean not null,
  primary key (wbs_item_id, date),
  constraint wbs_item_daily_snapshot_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index wbs_item_daily_snapshot_project_idx on wbs_item_daily_snapshot (org_id, project_id, date);

create table project_daily_snapshot (
  project_id uuid not null,
  date date not null,
  org_id uuid not null,
  planned_percent numeric(7,4) not null,
  actual_percent numeric(7,4) not null,
  financial_percent numeric(7,4) not null,
  bac bigint not null,
  pv bigint not null,
  ev bigint not null,
  ac bigint not null,
  eac bigint not null,
  cpi double precision,
  spi double precision,
  cost_indices_date date not null,
  primary key (project_id, date),
  constraint project_daily_snapshot_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create table compute_run (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  from_date date,
  trigger_event_ids jsonb not null default '[]',
  scope text not null default 'project' check (scope in ('item', 'project')),
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null,
  constraint compute_run_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
-- حداکثر یک اجرای در صف برای هر پروژه (تجمیع؛ ۵.۱)
create unique index compute_run_queued_uq on compute_run (project_id) where status = 'queued';
create index compute_run_project_idx on compute_run (org_id, project_id, created_at desc);

create function active_projects_for_compute() returns table (org_id uuid, project_id uuid)
  language sql stable security definer set search_path = public as $$
  select p.org_id, p.id from project p where p.status = 'active' and p.deletion_requested_at is null
$$;
revoke all on function active_projects_for_compute() from public;
grant execute on function active_projects_for_compute() to ${APP_DB_ROLE};`);

    const tables = ['wbs_item_progress', 'project_progress', 'cbs_item_progress', 'wbs_item_daily_snapshot', 'project_daily_snapshot', 'compute_run'];
    for (const table of tables) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on ${tables.join(', ')} to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists active_projects_for_compute();`);
    this.addSql(
      `drop table if exists wbs_item_progress, project_progress, cbs_item_progress, wbs_item_daily_snapshot, project_daily_snapshot, compute_run cascade;`,
    );
  }
}
