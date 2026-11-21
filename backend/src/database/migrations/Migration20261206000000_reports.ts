import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۸الف — گزارش‌های مدیریتی (F18؛ management-reports.md ۶؛ `02` ۱۲). مالک: reports.
//   • report_template: قالب‌های سفارشی سازمان (قالب‌های سیستمی در کد، با شناسهٔ ثابت متنی).
//   • generated_report: هر خروجی PDF یا Excel با منبع (live یا period_snapshot)، مبلغ، واترمارک و وضعیت صف.

export class Migration20261206000000_reports extends Migration {
  override name = 'Migration20261206000000_reports';

  override up(): void {
    this.addSql(`
create table report_template (
  id uuid primary key,
  org_id uuid not null,
  name text not null,
  description text not null,
  category text not null check (category in ('project', 'financial', 'resources', 'risk', 'integration', 'internal')),
  audience text not null check (audience in ('internal', 'client')),
  scope text not null check (scope in ('project', 'portfolio')),
  sections jsonb not null,
  formats jsonb not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1
);
create unique index report_template_name_uq on report_template (org_id, name);

create table generated_report (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  template_id text not null,
  template_name text not null,
  scope_label text not null,
  range_id text not null,
  range_label text not null,
  range_from date not null,
  range_to date not null,
  format text not null check (format in ('pdf', 'xlsx')),
  source_kind text not null check (source_kind in ('live', 'period_snapshot')),
  includes_amounts boolean not null,
  watermark text not null check (watermark in ('none', 'open_period')),
  disabled_sections jsonb not null default '[]',
  project_ids jsonb not null default '[]',
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  error text,
  attempts int not null default 0,
  requested_by_user_id uuid,
  storage_key text,
  size_bytes int,
  page_count int not null default 0,
  created_at timestamptz not null,
  finished_at timestamptz,
  constraint generated_report_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index generated_report_org_idx on generated_report (org_id, created_at desc);
create index generated_report_project_idx on generated_report (org_id, project_id, created_at desc);`);

    for (const table of ['report_template', 'generated_report']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
      this.addSql(`grant select, insert, update, delete on ${table} to ${APP_DB_ROLE};`);
    }
  }

  override down(): void {
    this.addSql(`drop table if exists generated_report, report_template cascade;`);
  }
}
