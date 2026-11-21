import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۲ب — ارسال اعلان (F13؛ notifications.md ۴–۵؛ تصمیم‌های 1405/08/24).
//   • notification.scheduled_at: زمان ارسال (ساعت آرام و تلاش دوباره).
//   • notification_channel_setting: ماتریس W30؛ project_id تهی = پیش‌فرض سازمان.
//   • notification_preference: ترجیح کاهندهٔ کاربر به ازای گروه W32.
//   • notification_user_setting: ساعت آرام کاربر.
//   • device_token: توکن پوش هر دستگاه (F01؛ `POST /me/devices`).

export class Migration20261128000000_notification_delivery extends Migration {
  override name = 'Migration20261128000000_notification_delivery';

  override up(): void {
    this.addSql(`
alter table notification add column scheduled_at timestamptz;
create index notification_pending_idx on notification (scheduled_at) where status = 'pending';

create table notification_channel_setting (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  code text not null,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  enabled boolean not null,
  updated_by_user_id uuid,
  updated_at timestamptz not null,
  constraint notification_channel_setting_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create unique index notification_channel_setting_uq
  on notification_channel_setting (org_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), code, channel);

create table notification_preference (
  user_id uuid not null,
  group_key text not null,
  org_id uuid not null,
  channels jsonb not null default '{}',
  updated_at timestamptz not null,
  primary key (user_id, group_key)
);

create table notification_user_setting (
  user_id uuid primary key,
  org_id uuid not null,
  quiet_enabled boolean not null default true,
  quiet_from text not null default '21:00',
  quiet_to text not null default '07:00',
  updated_at timestamptz not null
);

create table device_token (
  id uuid primary key,
  org_id uuid not null,
  user_id uuid not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  token text not null,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  revoked_at timestamptz,
  constraint device_token_user_fk foreign key (org_id, user_id) references app_user (org_id, id) on delete cascade
);
create unique index device_token_uq on device_token (org_id, token);`);

    const tables = ['notification_channel_setting', 'notification_preference', 'notification_user_setting', 'device_token'];
    for (const table of tables) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on ${tables.join(', ')} to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists notification_channel_setting, notification_preference, notification_user_setting, device_token cascade;`);
    this.addSql(`drop index if exists notification_pending_idx;`);
    this.addSql(`alter table notification drop column if exists scheduled_at;`);
  }
}
