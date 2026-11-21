import { Migration } from '@mikro-orm/migrations';
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES, type ProjectRoleCode } from '@projeyar/shared';
import { APP_DB_ROLE, SYSTEM_ROLE_IDS } from '../system-ids.js';

// برش اول: هویت، تیم، پروژه (docs/backend/05). دست‌نوشته و خوانده‌شده؛ هرگز پس از اعمال ویرایش نمی‌شود.
//
// RLS: هر جدول مستأجر سیاست «org_id = سازمان جاری» دارد. نقش اپ مالک جدول‌ها نیست و RLS را دور
// نمی‌زند؛ مالک (اجراکنندهٔ migration) چون FORCE نشده دور می‌زند — فقط migration با آن اجرا می‌شود.
// متغیر نشست app.org_id را MikroORM در هر تراکنش با set_config(…, true) می‌گذارد.

const TENANT_TABLES = [
  'app_user',
  'auth_session',
  'otp_challenge',
  'login_attempt',
  'project_type',
  'project',
  'project_member',
  'project_member_role',
] as const;

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export class Migration20261112000000_init extends Migration {
  override name = 'Migration20261112000000_init';

  override up(): void {
    this.addSql(`
do $$ begin
  if not exists (select from pg_roles where rolname = '${APP_DB_ROLE}') then
    raise exception 'نقش ${APP_DB_ROLE} نیست؛ اول db:bootstrap را اجرا کنید (docs/backend/10 ۳)';
  end if;
end $$;`);

    this.addSql(`
create function app_current_org() returns uuid language sql stable as $$
  select nullif(current_setting('app.org_id', true), '')::uuid
$$;`);

    this.addSql(`
create function reject_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'جدول % فقط‌افزودنی است', tg_table_name using errcode = 'P0001';
end $$;`);

    this.addSql(`
create table organization (
  id uuid primary key,
  name text not null,
  seat_limit integer not null default 60 check (seat_limit >= 0),
  created_at timestamptz not null default now()
);`);

    this.addSql(`
create table app_user (
  id uuid primary key,
  org_id uuid not null references organization (id),
  full_name text not null,
  mobile text not null check (mobile ~ '^09[0-9]{9}$'),
  email text,
  password_hash text,
  two_factor_enabled boolean not null default true,
  status text not null default 'active' check (status in ('invited', 'active', 'locked', 'disabled')),
  is_org_admin boolean not null default false,
  last_active_at timestamptz,
  job_title text,
  department text,
  password_changed_at timestamptz,
  locked_until timestamptz,
  failed_login_count integer not null default 0 check (failed_login_count >= 0),
  avatar_tone text not null default 'a1',
  preferences jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint app_user_org_id_id_uq unique (org_id, id),
  constraint app_user_org_id_mobile_uq unique (org_id, mobile)
);
create unique index app_user_org_id_email_uq on app_user (org_id, lower(email)) where email is not null;
create index app_user_mobile_idx on app_user (mobile);
create index app_user_email_idx on app_user (lower(email)) where email is not null;`);

    this.addSql(`
create table role (
  id uuid primary key,
  org_id uuid references organization (id),
  code text not null,
  name text not null,
  is_system boolean not null default false,
  based_on_role_id uuid references role (id),
  created_at timestamptz not null default now(),
  constraint role_org_id_code_uq unique nulls not distinct (org_id, code)
);
create table role_permission (
  id uuid primary key,
  role_id uuid not null references role (id) on delete cascade,
  permission_code text not null,
  scope text not null check (scope in ('all', 'own_area', 'own_assigned', 'own_projects')),
  constraint role_permission_role_id_code_uq unique (role_id, permission_code)
);`);

    this.addSql(`
create table auth_session (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  client text not null check (client in ('web', 'android')),
  device_name text not null,
  ip text,
  current_secret_hash text not null,
  previous_secret_hash text,
  last_used_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint auth_session_user_fk foreign key (org_id, user_id) references app_user (org_id, id)
);
create index auth_session_org_id_user_id_idx on auth_session (org_id, user_id) where revoked_at is null;

create table otp_challenge (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  token_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint otp_challenge_user_fk foreign key (org_id, user_id) references app_user (org_id, id)
);

create table login_attempt (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  result text not null check (result in ('success', 'bad_password', 'locked', 'otp_failed')),
  method text not null check (method in ('password', 'otp', 'backup_code')),
  ip text,
  user_agent text,
  created_at timestamptz not null,
  constraint login_attempt_user_fk foreign key (org_id, user_id) references app_user (org_id, id)
);
create index login_attempt_org_id_user_id_created_at_idx on login_attempt (org_id, user_id, created_at desc);
create trigger login_attempt_immutable before update or delete on login_attempt
  for each row execute function reject_mutation();`);

    this.addSql(`
create table project_type (
  id uuid primary key,
  org_id uuid not null references organization (id),
  key text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  constraint project_type_org_id_key_uq unique (org_id, key)
);

create table project (
  id uuid primary key,
  org_id uuid not null references organization (id),
  code text not null check (code ~ '^PRJ-[0-9]{4}-[0-9]{3}$'),
  name text not null,
  client_name text not null,
  project_type text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  manager_user_id uuid not null,
  planned_start date,
  planned_finish date,
  msp_linked boolean not null default false,
  activated_at timestamptz,
  contingency_reserve bigint not null default 0 check (contingency_reserve >= 0),
  display_currency_unit text not null default 'rial' check (display_currency_unit in ('rial', 'toman')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint project_org_id_id_uq unique (org_id, id),
  constraint project_org_id_code_uq unique (org_id, code),
  constraint project_manager_fk foreign key (org_id, manager_user_id) references app_user (org_id, id),
  constraint project_type_fk foreign key (org_id, project_type) references project_type (org_id, key)
);
create index project_org_id_status_idx on project (org_id, status);

create table project_member (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  user_id uuid not null,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint project_member_org_id_id_uq unique (org_id, id),
  constraint project_member_project_id_user_id_uq unique (project_id, user_id),
  constraint project_member_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint project_member_user_fk foreign key (org_id, user_id) references app_user (org_id, id)
);
create index project_member_org_id_user_id_idx on project_member (org_id, user_id) where status = 'active';

create table project_member_role (
  id uuid primary key,
  org_id uuid not null,
  member_id uuid not null,
  role_id uuid not null references role (id),
  created_at timestamptz not null,
  constraint project_member_role_member_id_role_id_uq unique (member_id, role_id),
  constraint project_member_role_member_fk foreign key (org_id, member_id) references project_member (org_id, id) on delete cascade
);`);

    // ── RLS (05 ۴.۳) ──
    for (const table of TENANT_TABLES) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`alter table organization enable row level security;`);
    this.addSql(`create policy organization_self on organization using (id = app_current_org());`);
    this.addSql(`alter table role enable row level security;`);
    this.addSql(`create policy role_visible on role for select using (org_id is null or org_id = app_current_org());`);
    this.addSql(`alter table role_permission enable row level security;`);
    this.addSql(`create policy role_permission_visible on role_permission for select using (exists (select 1 from role r where r.id = role_id));`);

    // ── تنها جست‌وجوی پیش از شناخت سازمان (ورود) — فقط شناسه‌ها را برمی‌گرداند ──
    this.addSql(`
create function auth_locate_user(p_mobile text, p_email text)
returns table (user_id uuid, org_id uuid)
language sql stable security definer set search_path = public as $$
  select u.id, u.org_id from app_user u
  where (p_mobile is not null and u.mobile = p_mobile)
     or (p_email is not null and lower(u.email) = lower(p_email))
$$;
revoke all on function auth_locate_user(text, text) from public;`);

    // ── مجوزهای نقش اپ ──
    this.addSql(`grant usage on schema public to ${APP_DB_ROLE};`);
    this.addSql(`grant execute on function auth_locate_user(text, text), app_current_org() to ${APP_DB_ROLE};`);
    this.addSql(`grant select, update on organization to ${APP_DB_ROLE};`);
    this.addSql(`grant select on role, role_permission to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert on login_attempt to ${APP_DB_ROLE};`);
    this.addSql(
      `grant select, insert, update, delete on app_user, auth_session, otp_challenge, project_type, project, project_member, project_member_role to ${APP_DB_ROLE};`,
    );

    // ── نقش‌های سیستمی از همان کاتالوگ مشترک (access-control.md ۵.۴) ──
    for (const code of Object.keys(DEFAULT_ROLE_PERMISSIONS) as ProjectRoleCode[]) {
      const roleId = SYSTEM_ROLE_IDS[code];
      this.addSql(
        `insert into role (id, org_id, code, name, is_system) values (${sqlString(roleId)}, null, ${sqlString(code)}, ${sqlString(SYSTEM_ROLES[code])}, true);`,
      );
      const rows = DEFAULT_ROLE_PERMISSIONS[code].map(
        (grant, index) => `(${sqlString(systemPermissionId(roleId, index))}, ${sqlString(roleId)}, ${sqlString(grant.code)}, ${sqlString(grant.scope)})`,
      );
      this.addSql(`insert into role_permission (id, role_id, permission_code, scope) values ${rows.join(', ')};`);
    }
  }

  override down(): void {
    this.addSql(`drop function if exists auth_locate_user(text, text);`);
    this.addSql(
      `drop table if exists project_member_role, project_member, project, project_type, login_attempt, otp_challenge, auth_session, role_permission, role, app_user, organization cascade;`,
    );
    this.addSql(`drop function if exists reject_mutation(); drop function if exists app_current_org();`);
  }
}

/** شناسهٔ قطعی هر ردیف دسترسی نقش سیستمی تا migration تکرارپذیر باشد. */
function systemPermissionId(roleId: string, index: number): string {
  // فضای جدا (…-8001-) + سه رقم آخر نقش + شمارهٔ ردیف: یکتا میان همهٔ نقش‌ها
  return `01930000-0000-7000-8001-${roleId.slice(-3)}${index.toString(16).padStart(9, '0')}`;
}
