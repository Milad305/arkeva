import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۷الف — ورود MSP (F15؛ msp-integration.md ۵، ۷.۱؛ `02` ۱۱). مالک: msp.
//   • msp_import_session: جلسهٔ ورود (تحلیل فایل، اعتبارسنجی، نگاشت، منابع، مولد وزن، ساخت و بازگردانی).
//   • field_mapping_template: الگوی سازمانی نگاشت ستون‌ها.
//   • msp_link: اتصال پروژه به فایل MSP (آخرین فایل برای همگام‌سازی و خروجی برش ۱۷ب).
//   • external_id_map: UID فایل ← آیتم WBS؛ یکتا روی (system, project_id, entity_type, external_id).
//   • delete_opening_report: تنها راه حذف واقعیت کارگاه — گزارش `import_opening` در بازگردانی ورود (۷.۱، AC-MS-04).

export class Migration20261204000000_msp extends Migration {
  override name = 'Migration20261204000000_msp';

  override up(): void {
    this.addSql(`
create table field_mapping_template (
  id uuid primary key,
  org_id uuid not null,
  name text not null,
  mappings jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  unique (org_id, id)
);
create unique index field_mapping_template_name_uq on field_mapping_template (org_id, name);
create unique index field_mapping_template_default_uq on field_mapping_template (org_id) where is_default;

create table msp_link (
  project_id uuid primary key,
  org_id uuid not null,
  status text not null check (status in ('connected', 'error')),
  last_file_name text not null,
  last_storage_key text,
  last_sync_at timestamptz,
  mapping_template_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  constraint msp_link_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create table msp_import_session (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  file_name text not null,
  storage_key text not null,
  file_size int not null,
  format text not null check (format in ('xml', 'mpp', 'xlsx')),
  status text not null check (status in ('validated', 'built', 'rolled_back', 'failed')),
  analysis jsonb not null,
  checks jsonb not null,
  options jsonb not null,
  mapping jsonb not null,
  resource_mapping jsonb not null,
  weight_generator text not null check (weight_generator in ('duration', 'cost', 'equal')),
  save_template boolean not null default true,
  built_version_id uuid,
  built_at timestamptz,
  rollback_deadline timestamptz,
  previous_content jsonb,
  opening_report_id uuid,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  constraint msp_import_session_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index msp_import_session_project_idx on msp_import_session (org_id, project_id, created_at desc);

create table external_id_map (
  id uuid primary key,
  org_id uuid not null,
  system text not null check (system in ('msp', 'erp', 'accounting', 'p6')),
  entity_type text not null,
  entity_id uuid not null,
  project_id uuid,
  external_id text not null,
  created_at timestamptz not null
);
create unique index external_id_map_uq on external_id_map (system, project_id, entity_type, external_id);
create index external_id_map_entity_idx on external_id_map (org_id, entity_type, entity_id);

create function delete_opening_report(report uuid) returns int
language sql security definer set search_path = public as $$
  with gone as (
    delete from field_report where id = report and source = 'import_opening' and org_id = app_current_org() returning 1
  ) select count(*)::int from gone;
$$;`);

    for (const table of ['field_mapping_template', 'msp_link', 'msp_import_session', 'external_id_map']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on field_mapping_template, msp_link, msp_import_session to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, delete on external_id_map to ${APP_DB_ROLE};`);
    this.addSql(`revoke all on function delete_opening_report(uuid) from public;`);
    this.addSql(`grant execute on function delete_opening_report(uuid) to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists delete_opening_report(uuid);`);
    this.addSql(`drop table if exists external_id_map, msp_import_session, msp_link, field_mapping_template cascade;`);
  }
}
