import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۱ — API اپ کارگاه (F08 سمت سرور؛ D10).
//   • otp_challenge.purpose: «app_login» برای کد ۵ رقمی اپ (07 ۲.۲).
//   • device_queue_state: آخرین ضربان صف گوشی هر کاربر (field-app.md ۵.۲؛ AL-FLD-04 و W23).
//   • field_photo: بندانگشتی ۳۲۰ و ۱۲۸۰ و EXIF پس از پردازش پس‌زمینه (F20 ۷؛ تصمیم 1405/08/24).

export class Migration20261126000000_field_app extends Migration {
  override name = 'Migration20261126000000_field_app';

  override up(): void {
    this.addSql(`
alter table otp_challenge drop constraint if exists otp_challenge_purpose_check;
alter table otp_challenge add constraint otp_challenge_purpose_check check (purpose in ('login', 'password_reset', 'password_expired', 'app_login'));
create index otp_challenge_app_rate_idx on otp_challenge (user_id, created_at) where purpose = 'app_login';

create table device_queue_state (
  user_id uuid primary key,
  org_id uuid not null,
  queued_reports integer not null default 0,
  queued_photos integer not null default 0,
  queued_bytes bigint not null default 0,
  oldest_queued_at timestamptz,
  app_version text,
  last_sync_at timestamptz,
  wifi_only boolean not null default false,
  received_at timestamptz not null
);

alter table field_photo
  add column thumb_small_key text,
  add column thumb_large_key text,
  add column exif jsonb,
  add column processed_at timestamptz;`);

    this.addSql(`alter table device_queue_state enable row level security;`);
    this.addSql(`create policy device_queue_state_tenant on device_queue_state using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    this.addSql(`grant select, insert, update, delete on device_queue_state to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists device_queue_state;`);
    this.addSql(
      `alter table field_photo drop column if exists thumb_small_key, drop column if exists thumb_large_key, drop column if exists exif, drop column if exists processed_at;`,
    );
    this.addSql(`drop index if exists otp_challenge_app_rate_idx;`);
    this.addSql(`alter table otp_challenge drop constraint if exists otp_challenge_purpose_check;`);
    this.addSql(`alter table otp_challenge add constraint otp_challenge_purpose_check check (purpose in ('login', 'password_reset', 'password_expired'));`);
  }
}
