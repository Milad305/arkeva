import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE, SYSTEM_ROLE_IDS } from '../system-ids.js';

// چرخهٔ عمر پروژه و تأیید دوباره (F02 ۸؛ تصمیم‌های کاربر 1405/08/22). دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.

export class Migration20261114000000_project_lifecycle extends Migration {
  override name = 'Migration20261114000000_project_lifecycle';

  override up(): void {
    this.addSql(`
alter table project
  add column paused_at timestamptz,
  add column completed_at timestamptz,
  add column archived_at timestamptz,
  add column deletion_requested_at timestamptz,
  add column deletion_purge_at timestamptz,
  add constraint project_deletion_pair check ((deletion_requested_at is null) = (deletion_purge_at is null));
create index project_deletion_purge_at_idx on project (deletion_purge_at) where deletion_purge_at is not null;`);

    // ── تأیید دوباره با کد پیامکی (identity) ──
    this.addSql(`
create table step_up_challenge (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  purpose text not null check (purpose in ('project.transfer_manager', 'project.delete')),
  subject_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint step_up_challenge_user_fk foreign key (org_id, user_id) references app_user (org_id, id)
);
create index step_up_challenge_open_idx on step_up_challenge (org_id, user_id, purpose, subject_id) where consumed_at is null;
alter table step_up_challenge enable row level security;
create policy step_up_challenge_tenant on step_up_challenge using (org_id = app_current_org()) with check (org_id = app_current_org());
grant select, insert, update on step_up_challenge to ${APP_DB_ROLE};`);

    // ── پاک‌سازی پس از مهلت (PurgeTick): تنها نگاه بیرون از یک سازمان؛ فقط شناسه‌ها ──
    this.addSql(`
create function projects_due_for_purge(p_now timestamptz)
returns table (org_id uuid, project_id uuid)
language sql stable security definer set search_path = public as $$
  select p.org_id, p.id from project p where p.deletion_purge_at is not null and p.deletion_purge_at <= p_now
$$;
revoke all on function projects_due_for_purge(timestamptz) from public;
grant execute on function projects_due_for_purge(timestamptz) to ${APP_DB_ROLE};`);

    // ── مدیر پروژه پیش‌نویس را حذف می‌کند (F02 ۱۱؛ تصمیم کاربر 1405/08/22) ──
    this.addSql(
      `insert into role_permission (id, role_id, permission_code, scope)
       values ('01930000-0000-7000-8002-000000000001', '${SYSTEM_ROLE_IDS.project_manager}', 'project.delete', 'all')
       on conflict do nothing;`,
    );
  }

  override down(): void {
    this.addSql(`delete from role_permission where id = '01930000-0000-7000-8002-000000000001';`);
    this.addSql(`drop function if exists projects_due_for_purge(timestamptz);`);
    this.addSql(`drop table if exists step_up_challenge;`);
    this.addSql(`
alter table project
  drop constraint if exists project_deletion_pair,
  drop column if exists paused_at, drop column if exists completed_at, drop column if exists archived_at,
  drop column if exists deletion_requested_at, drop column if exists deletion_purge_at;`);
  }
}
