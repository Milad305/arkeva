import { Migration } from '@mikro-orm/migrations';
import { DEFAULT_ROLE_PERMISSIONS, INTEGRATION_ROLE_PERMISSIONS, type ProjectRoleCode } from '@projeyar/shared';
import { APP_DB_ROLE, SYSTEM_ROLE_IDS } from '../system-ids.js';

// برش ۱۹ — پشتیبان پروژه و مرز یکپارچه‌سازی (F20 ۱۲؛ F19 ۵، ۹؛ تصمیم‌های 1405/08/26). مالک: backups و integrations.
//   • backup_schedule: برنامهٔ هر پروژه (روزانه، هفتگی بامداد جمعه، غیرفعال)؛ نبود ردیف = روزانه (پیش‌فرض سند).
//   • project_backup: نسخهٔ رمزنگاری‌شده (دادهٔ پروژه + فهرست فایل‌ها)؛ ۳۰ خودکار و ۱۰ دستی آخر.
//   • project_export: ZIP کامل پروژه با لینک ۲۴ ساعته (`export.full`).
//   • integration_connection: مرز F19 (integrations.md ۵)؛ در نسخهٔ اول ردیفی ساخته نمی‌شود.
//   • due_project_backups و expire_project_exports: تیک بیرون از سازمان فقط شناسه می‌گیرد (الگوی due_report_schedules).
//   • کدهای integrations.* برای نقش‌های سیستمی پایگاه دادهٔ موجود.

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;
/** فضای شناسهٔ جدا (…-8003-) تا با ردیف‌های migrationهای پیشین برنخورد. */
const grantId = (roleId: string, index: number): string => `01930000-0000-7000-8003-${roleId.slice(-3)}${index.toString(16).padStart(9, '0')}`;

const TENANT_TABLES = ['backup_schedule', 'project_backup', 'project_export', 'integration_connection'];

export class Migration20261208000000_backups extends Migration {
  override name = 'Migration20261208000000_backups';

  override up(): void {
    this.addSql(`
create table backup_schedule (
  project_id uuid primary key,
  org_id uuid not null,
  schedule text not null check (schedule in ('daily', 'weekly', 'off')),
  updated_by_user_id uuid,
  updated_at timestamptz not null,
  constraint backup_schedule_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create table project_backup (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  kind text not null check (kind in ('auto', 'manual')),
  run_date date,
  note text,
  storage_key text not null,
  key_id text not null,
  size_bytes bigint not null,
  table_count int not null,
  row_count int not null,
  file_count int not null,
  file_bytes bigint not null,
  created_by_user_id uuid,
  created_at timestamptz not null,
  constraint project_backup_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index project_backup_project_idx on project_backup (org_id, project_id, kind, created_at desc);
create unique index project_backup_run_uq on project_backup (project_id, run_date) where kind = 'auto';

create table project_export (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  status text not null check (status in ('queued', 'running', 'done', 'failed', 'expired')),
  includes_amounts boolean not null,
  storage_key text,
  file_name text not null,
  size_bytes bigint,
  error text,
  requested_by_user_id uuid not null,
  created_at timestamptz not null,
  finished_at timestamptz,
  expires_at timestamptz,
  constraint project_export_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index project_export_project_idx on project_export (org_id, project_id, created_at desc);
create index project_export_expiry_idx on project_export (expires_at) where status = 'done';

create table integration_connection (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  system text not null check (system in ('erp', 'accounting', 'p6_export', 'custom')),
  name text not null,
  config bytea,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'not_configured' check (status in ('not_configured', 'connected', 'error', 'disabled')),
  schedule text,
  auto_post boolean not null default false,
  data_kinds jsonb not null default '[]',
  consecutive_failures int not null default 0,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint integration_connection_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index integration_connection_org_idx on integration_connection (org_id, project_id);`);
    for (const table of TENANT_TABLES) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
      this.addSql(`grant select, insert, update, delete on ${table} to ${APP_DB_ROLE};`);
    }
    this.addSql(`
create function due_project_backups(weekly boolean) returns table (org_id uuid, project_id uuid)
language sql security definer set search_path = public as $$
  select p.org_id, p.id from project p left join backup_schedule s on s.project_id = p.id
  where p.status <> 'archived' and p.deletion_requested_at is null
    and (coalesce(s.schedule, 'daily') = 'daily' or (weekly and s.schedule = 'weekly'));
$$;`);
    this.addSql(`
create function expire_project_exports(at timestamptz) returns table (org_id uuid, id uuid, storage_key text)
language sql security definer set search_path = public as $$
  update project_export set status = 'expired' where status = 'done' and expires_at <= at
  returning project_export.org_id, project_export.id, project_export.storage_key;
$$;`);
    for (const fn of ['due_project_backups(boolean)', 'expire_project_exports(timestamptz)']) {
      this.addSql(`revoke all on function ${fn} from public;`);
      this.addSql(`grant execute on function ${fn} to ${APP_DB_ROLE};`);
    }

    for (const role of Object.keys(INTEGRATION_ROLE_PERMISSIONS) as ProjectRoleCode[]) {
      const grants = DEFAULT_ROLE_PERMISSIONS[role];
      const roleId = SYSTEM_ROLE_IDS[role];
      for (const code of INTEGRATION_ROLE_PERMISSIONS[role] ?? []) {
        const index = grants.findIndex((grant) => grant.code === code);
        this.addSql(
          `insert into role_permission (id, role_id, permission_code, scope) values (${sqlString(grantId(roleId, index))}, ${sqlString(roleId)}, ${sqlString(code)}, 'all') on conflict do nothing;`,
        );
      }
    }
  }

  override down(): void {
    this.addSql(`delete from role_permission where permission_code like 'integrations.%';`);
    this.addSql(`drop function if exists expire_project_exports(timestamptz);`);
    this.addSql(`drop function if exists due_project_backups(boolean);`);
    for (const table of [...TENANT_TABLES].reverse()) this.addSql(`drop table if exists ${table} cascade;`);
  }
}
