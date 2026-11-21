import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۷ب — همگام‌سازی و خروجی MSP (F15؛ msp-integration.md ۵، ۷.۳، ۷.۴؛ `02` ۱۱).
//   • msp_sync_session و msp_sync_change: مقایسهٔ فایل تازه با برنامهٔ جاری (مالک msp).
//   • progress_export_item: پیشرفت تأییدشدهٔ منتظر ارسال به MSP (مالک msp؛ ۵.۱).
//   • schedule_change_proposal: پیشنهاد تغییر تاریخ در پروژهٔ متصل (مالک planning، F04؛ `03` ۲).
//   • msp_link: آخرین فایل تحلیل‌شده و نسخهٔ همگام‌شده برای تشخیص تعارض (۷.۳ بند ۲).

export class Migration20261205000000_msp_sync extends Migration {
  override name = 'Migration20261205000000_msp_sync';

  override up(): void {
    this.addSql(`
alter table msp_link add column last_analysis jsonb, add column last_synced_version_id uuid;

create table msp_sync_session (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  file_name text not null,
  storage_key text not null,
  file_size int not null,
  status text not null check (status in ('review', 'blocked', 'applied', 'cancelled')),
  blocked_reason text,
  analysis jsonb not null,
  base_version_id uuid,
  result_version_id uuid,
  applied_at timestamptz,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  unique (org_id, id),
  constraint msp_sync_session_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index msp_sync_session_project_idx on msp_sync_session (org_id, project_id, created_at desc);

create table msp_sync_change (
  id uuid primary key,
  org_id uuid not null,
  session_id uuid not null,
  sort_order int not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  change_type text not null check (change_type in ('add', 'update', 'delete', 'move', 'conflict')),
  wbs_item_id uuid,
  msp_uid text,
  code text not null,
  title text not null,
  field text not null,
  projeyar_value jsonb,
  msp_value jsonb,
  selected boolean not null,
  resolution text check (resolution in ('keep_projeyar', 'accept_msp')),
  has_approved_reports boolean not null default false,
  constraint msp_sync_change_session_fk foreign key (org_id, session_id) references msp_sync_session (org_id, id) on delete cascade
);
create index msp_sync_change_session_idx on msp_sync_change (session_id, sort_order);

create table progress_export_item (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  wbs_item_id uuid not null,
  percent numeric(7,4),
  as_of_date date not null,
  actual_start date,
  actual_finish date,
  status text not null check (status in ('pending', 'exported', 'withdrawn')),
  exported_at timestamptz,
  updated_at timestamptz not null,
  constraint progress_export_item_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create unique index progress_export_item_uq on progress_export_item (project_id, wbs_item_id);

create table schedule_change_proposal (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  wbs_item_id uuid not null,
  field text not null check (field in ('plannedStart', 'plannedFinish')),
  proposed_value jsonb not null,
  base_value jsonb,
  status text not null check (status in ('pending', 'exported', 'confirmed', 'superseded')),
  proposed_by_user_id uuid not null,
  exported_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null,
  constraint schedule_change_proposal_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index schedule_change_proposal_open_idx on schedule_change_proposal (org_id, project_id) where status in ('pending', 'exported');`);

    for (const table of ['msp_sync_session', 'msp_sync_change', 'progress_export_item', 'schedule_change_proposal']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
      this.addSql(`grant select, insert, update on ${table} to ${APP_DB_ROLE};`);
    }
  }

  override down(): void {
    this.addSql(`drop table if exists schedule_change_proposal, progress_export_item, msp_sync_change, msp_sync_session cascade;`);
    this.addSql(`alter table msp_link drop column if exists last_analysis, drop column if exists last_synced_version_id;`);
  }
}
