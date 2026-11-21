import { Migration } from '@mikro-orm/migrations';
import { DEFAULT_ROLE_PERMISSIONS, EVERYONE_PERMISSIONS, type ProjectRoleCode } from '@projeyar/shared';
import { APP_DB_ROLE, SYSTEM_ROLE_IDS } from '../system-ids.js';

// اعلان درون‌برنامه (F13 پایه؛ برش ۲) و کدهای «همهٔ کاربران» (§۷.۳ ردیف ۱۴ گزینهٔ الف). دست‌نوشته؛ پس از
// اعمال ویرایش نمی‌شود.

/** همان فرمول migration اولیه: شناسهٔ قطعی ردیف دسترسی نقش سیستمی بر پایهٔ جایگاهش در فهرست. */
function systemPermissionId(roleId: string, index: number): string {
  return `01930000-0000-7000-8001-${roleId.slice(-3)}${index.toString(16).padStart(9, '0')}`;
}

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export class Migration20261117000000_notifications extends Migration {
  override name = 'Migration20261117000000_notifications';

  override up(): void {
    // ── Notification (02 ۱۰؛ notifications.md ۴.۱). فعلاً فقط in_app؛ ستون‌های کانال برای برش ۱۱ ──
    this.addSql(`
create table notification (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  project_id uuid,
  code text not null,
  category text not null check (category in ('approvals', 'risks', 'system')),
  severity text check (severity in ('info', 'warning', 'critical')),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'push')),
  status text not null default 'sent' check (status in ('pending', 'sent', 'failed', 'read')),
  title text not null,
  body text not null,
  link text not null,
  subject_id text,
  alert_id uuid,
  event_id uuid,
  dedupe_key text not null,
  group_key text not null,
  merged_count integer not null default 0 check (merged_count >= 0),
  attempts integer not null default 0,
  failure_reason text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint notification_user_fk foreign key (org_id, user_id) references app_user (org_id, id) on delete cascade
);
create index notification_inbox_idx on notification (org_id, user_id, created_at desc, id desc) where channel = 'in_app';
create index notification_unread_idx on notification (org_id, user_id) where channel = 'in_app' and read_at is null;
create index notification_dedupe_idx on notification (org_id, user_id, dedupe_key, created_at desc);
create index notification_group_idx on notification (org_id, user_id, group_key, created_at desc);
create index notification_created_brin on notification using brin (created_at);

alter table notification enable row level security;
create policy notification_tenant on notification using (org_id = app_current_org()) with check (org_id = app_current_org());
grant select, insert, update on notification to ${APP_DB_ROLE};`);

    // ── نگه‌داری ۱۸۰ روزه (notifications.md ۷) در PurgeTick؛ تیک سازمان ندارد ──
    this.addSql(`
create function purge_old_notifications(p_before timestamptz) returns integer
language sql volatile security definer set search_path = public as $$
  with deleted as (delete from notification where created_at < p_before returning 1)
  select count(*)::integer from deleted
$$;
revoke all on function purge_old_notifications(timestamptz) from public;
grant execute on function purge_old_notifications(timestamptz) to ${APP_DB_ROLE};`);

    // ── کدهای «همهٔ کاربران» برای نقش‌های سیستمی پایگاه دادهٔ موجود؛ پایگاه تازه آن‌ها را از migration اولیه دارد ──
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as ProjectRoleCode[]) {
      const roleId = SYSTEM_ROLE_IDS[role];
      const grants = DEFAULT_ROLE_PERMISSIONS[role];
      const rows = grants.flatMap((grant, index) =>
        EVERYONE_PERMISSIONS.includes(grant.code)
          ? [`(${sqlString(systemPermissionId(roleId, index))}, ${sqlString(roleId)}, ${sqlString(grant.code)}, ${sqlString(grant.scope)})`]
          : [],
      );
      if (rows.length > 0) {
        this.addSql(`insert into role_permission (id, role_id, permission_code, scope) values ${rows.join(', ')} on conflict do nothing;`);
      }
    }
  }

  override down(): void {
    this.addSql(`drop function if exists purge_old_notifications(timestamptz);`);
    this.addSql(`drop table if exists notification;`);
  }
}
