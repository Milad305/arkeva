import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// کاربران، دعوت، نقش‌ها و حساب من (F01؛ تصمیم‌های کاربر 1405/08/22). دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.

export class Migration20261116000000_users_roles extends Migration {
  override name = 'Migration20261116000000_users_roles';

  override up(): void {
    // ── یکتایی سراسری موبایل و ایمیل (§۷.۳ ردیف ۱۶) — قید پایگاه داده بیرون از RLS هم برقرار است ──
    this.addSql(`
create unique index app_user_mobile_global_uq on app_user (mobile);
create unique index app_user_email_global_uq on app_user (lower(email)) where email is not null;

create function identity_taken(p_mobile text, p_email text, p_except uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_user u
    where (u.id is distinct from p_except)
      and ((p_mobile is not null and u.mobile = p_mobile) or (p_email is not null and lower(u.email) = lower(p_email)))
  )
$$;
revoke all on function identity_taken(text, text, uuid) from public;
grant execute on function identity_taken(text, text, uuid) to ${APP_DB_ROLE};`);

    // ── سیاست امنیتی سازمان (F01 ۴، ۵.۶) ──
    this.addSql(`
alter table organization
  add column password_rotation_days integer not null default 90 check (password_rotation_days >= 0),
  add column require_2fa boolean not null default false;

alter table app_user
  add column password_history jsonb not null default '[]';`);

    // ── نوع چالش کد: ورود یا بازیابی رمز؛ کد بازیابی هرگز در /otp/verify نشست نمی‌دهد ──
    this.addSql(`
alter table otp_challenge add column purpose text not null default 'login'
  check (purpose in ('login', 'password_reset', 'password_expired'));
alter table step_up_challenge drop constraint step_up_challenge_purpose_check;
alter table step_up_challenge add constraint step_up_challenge_purpose_check
  check (purpose in ('project.transfer_manager', 'project.delete', 'account.enable_2fa'));`);

    // ── کدهای پشتیبان ورود دومرحله‌ای (F01 ۴) ──
    this.addSql(`
create table backup_code (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null,
  constraint backup_code_user_fk foreign key (org_id, user_id) references app_user (org_id, id) on delete cascade
);
create index backup_code_user_idx on backup_code (org_id, user_id) where used_at is null;`);

    // ── «این دستگاه را ۳۰ روز به خاطر بسپار» (W03): فقط مرحلهٔ کد را می‌بخشد؛ تغییر رمز همه را باطل می‌کند ──
    this.addSql(`
create table trusted_device (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  secret_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null,
  constraint trusted_device_user_fk foreign key (org_id, user_id) references app_user (org_id, id) on delete cascade
);
create index trusted_device_user_idx on trusted_device (org_id, user_id) where revoked_at is null;`);

    // ── دعوت (02 ۲؛ F01 ۵.۶): کاربر invited هم‌زمان ساخته می‌شود؛ با «فراموشی رمز» فعال می‌شود ──
    this.addSql(`
create table invitation (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  project_id uuid not null,
  channel text not null check (channel in ('sms', 'email')),
  target text not null,
  role_codes text[] not null check (cardinality(role_codes) > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint invitation_user_fk foreign key (org_id, user_id) references app_user (org_id, id) on delete cascade,
  constraint invitation_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index invitation_pending_idx on invitation (org_id, user_id) where status = 'pending';`);

    // ── تنظیم نقش سیستمی برای هر سازمان (W27): نبود ردیف = پیش‌فرض سراسری؛ «بازگشت به پیش‌فرض» = حذف ──
    this.addSql(`
create table org_role_grant (
  org_id uuid not null references organization (id),
  role_id uuid not null references role (id),
  permission_code text not null,
  scope text not null check (scope in ('all', 'own_area', 'own_assigned', 'own_projects')),
  primary key (org_id, role_id, permission_code)
);
create table org_role_custom (
  org_id uuid not null references organization (id),
  role_id uuid not null references role (id),
  created_at timestamptz not null,
  primary key (org_id, role_id)
);`);

    for (const table of ['backup_code', 'trusted_device', 'invitation', 'org_role_grant', 'org_role_custom']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }

    // ── نقش سفارشی سازمان: نوشتن فقط روی ردیف‌های همین سازمان؛ نقش سیستمی خواندنی ──
    this.addSql(`
create policy role_custom_write on role for insert with check (org_id = app_current_org() and not is_system);
create policy role_custom_update on role for update using (org_id = app_current_org() and not is_system) with check (org_id = app_current_org());
create policy role_custom_delete on role for delete using (org_id = app_current_org() and not is_system);
create policy role_permission_custom_write on role_permission for insert
  with check (exists (select 1 from role r where r.id = role_id and r.org_id = app_current_org() and not r.is_system));
create policy role_permission_custom_delete on role_permission for delete
  using (exists (select 1 from role r where r.id = role_id and r.org_id = app_current_org() and not r.is_system));`);

    this.addSql(`grant select, insert, update on backup_code, trusted_device, invitation to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, delete on org_role_grant, org_role_custom to ${APP_DB_ROLE};`);
    this.addSql(`grant insert, update, delete on role to ${APP_DB_ROLE};`);
    this.addSql(`grant insert, delete on role_permission to ${APP_DB_ROLE};`);
    this.addSql(`grant delete on app_user to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`alter table otp_challenge drop column if exists purpose;`);
    this.addSql(
      `drop policy if exists role_custom_write on role; drop policy if exists role_custom_update on role; drop policy if exists role_custom_delete on role;`,
    );
    this.addSql(
      `drop policy if exists role_permission_custom_write on role_permission; drop policy if exists role_permission_custom_delete on role_permission;`,
    );
    this.addSql(`drop table if exists org_role_custom, org_role_grant, invitation, trusted_device, backup_code;`);
    this.addSql(`alter table app_user drop column if exists password_history;`);
    this.addSql(`alter table organization drop column if exists password_rotation_days, drop column if exists require_2fa;`);
    this.addSql(`drop function if exists identity_taken(text, text, uuid);`);
    this.addSql(`drop index if exists app_user_mobile_global_uq; drop index if exists app_user_email_global_uq;`);
  }
}
