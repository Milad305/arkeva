import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۷ — گزارش کارگاه و تأیید (F08 داده، F09؛ `02` ۶؛ D03، D08، D10).
//   • field_report، field_report_item، field_photo مال field: محتوا. وضعیت آیتم و field_review مال approvals.
//   • شمارهٔ خوانای گزارش FR-<سال شمسی>-<چهار رقم> (C05) با شمارندهٔ هر سازمان و سال.
//   • due_field_reviews: تیک ساعتی سراسری سررسیده‌ها را بی زمینهٔ سازمان پیدا می‌کند (همان الگوی projects_due_for_purge).

export class Migration20261121000000_field_reports extends Migration {
  override name = 'Migration20261121000000_field_reports';

  override up(): void {
    this.addSql(`
create table field_report (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  source text not null check (source in ('app', 'web_manual', 'import_opening', 'correction')),
  author_user_id uuid not null,
  work_date date not null,
  report_no text not null,
  device_recorded_at timestamptz not null,
  server_received_at timestamptz not null,
  app_version text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  gps_accuracy_m numeric(8,1),
  distance_from_site_m integer,
  weather text,
  temperature_c integer,
  note text,
  attested_at timestamptz,
  flags jsonb not null default '[]',
  created_at timestamptz not null,
  constraint field_report_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint field_report_org_id_uq unique (org_id, id),
  constraint field_report_no_uq unique (org_id, report_no)
);
create index field_report_project_idx on field_report (org_id, project_id, server_received_at desc);

create table field_report_item (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  report_id uuid not null,
  wbs_item_id uuid not null,
  method text not null check (method in ('quantity', 'percent', 'steps')),
  quantity_today numeric(18,4),
  reported_percent numeric(7,4),
  reported_quantity_info numeric(18,4),
  steps_progress jsonb,
  computed_percent numeric(9,4) not null default 0,
  last_approved_percent numeric(9,4) not null default 0,
  delta_percent numeric(9,4) not null default 0,
  planned_percent_at_date numeric(9,4) not null default 0,
  status text not null check (status in ('submitted', 'stage1', 'stage2', 'approved', 'needs_revision', 'rejected', 'superseded', 'needs_resolution')),
  current_stage integer check (current_stage in (1, 2)),
  requires_stage2 boolean not null default false,
  auto_approved boolean not null default false,
  flags jsonb not null default '[]',
  resolution text check (resolution in ('leaf_removed', 'reassigned')),
  revision_count integer not null default 0,
  supersedes_item_id uuid,
  crew_count integer,
  note text,
  approved_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint field_report_item_report_fk foreign key (org_id, report_id) references field_report (org_id, id) on delete cascade,
  constraint field_report_item_org_id_uq unique (org_id, id),
  constraint field_report_item_leaf_once unique (report_id, wbs_item_id)
);
create index field_report_item_leaf_idx on field_report_item (org_id, project_id, wbs_item_id, status);
create index field_report_item_open_idx on field_report_item (org_id, project_id, status) where status in ('submitted', 'stage1', 'stage2', 'needs_resolution');

create table field_photo (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  report_id uuid not null,
  item_id uuid,
  storage_key text not null,
  sha256 text not null,
  taken_at timestamptz not null,
  lat numeric(10,7),
  lng numeric(10,7),
  accuracy_m numeric(8,1),
  distance_m integer,
  caption text,
  upload_status text not null default 'pending' check (upload_status in ('pending', 'complete')),
  marked_unsuitable boolean not null default false,
  created_at timestamptz not null,
  constraint field_photo_report_fk foreign key (org_id, report_id) references field_report (org_id, id) on delete cascade
);
create index field_photo_report_idx on field_photo (org_id, report_id);

create table field_review (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  item_id uuid not null,
  stage integer not null check (stage in (1, 2)),
  assignee_user_id uuid,
  reviewer_user_id uuid,
  decision text check (decision in ('approve', 'request_revision', 'reject', 'auto_approve', 'revoke_auto', 'escalate', 'resolve_assignment')),
  note text,
  required_actions jsonb,
  due_at timestamptz not null,
  decided_at timestamptz,
  escalated_to_user_id uuid,
  created_at timestamptz not null,
  constraint field_review_item_fk foreign key (org_id, item_id) references field_report_item (org_id, id) on delete cascade
);
create index field_review_item_idx on field_review (org_id, item_id, created_at);
create index field_review_open_idx on field_review (due_at) where decided_at is null;

create table field_report_counter (
  org_id uuid not null,
  year integer not null,
  last_value integer not null,
  primary key (org_id, year)
);

-- سررسیده‌های باز همهٔ سازمان‌ها برای تیک ساعتی (approval-workflow.md ۴.۴)
create function due_field_reviews(at timestamptz) returns table (org_id uuid, project_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct r.org_id, r.project_id from field_review r where r.decided_at is null and r.due_at <= at
$$;`);

    for (const table of ['field_report', 'field_report_item', 'field_photo', 'field_review', 'field_report_counter']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    // واقعیت‌ها حذف نمی‌شوند (اصلاح = رکورد تازه؛ CLAUDE.md ۳ بند ۸)
    this.addSql(`grant select, insert, update on field_report, field_report_item, field_photo, field_review, field_report_counter to ${APP_DB_ROLE};`);
    this.addSql(`revoke all on function due_field_reviews(timestamptz) from public;`);
    this.addSql(`grant execute on function due_field_reviews(timestamptz) to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists due_field_reviews(timestamptz);`);
    this.addSql(`drop table if exists field_report_counter, field_review, field_photo, field_report_item, field_report cascade;`);
  }
}
