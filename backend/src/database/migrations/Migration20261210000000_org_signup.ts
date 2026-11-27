import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// ثبت‌نام خودکار سازمان جدید (Self-Signup؛ F01 ۵.۱، تصمیم کاربر 1405/09/06):
//   • signup_challenge: چالش کد پیامکی ۶ رقمی پیش از ساخت سازمان و کاربر.
//   • مجوز INSERT روی organization برای نقش اپ، مقید به سیاست RLS `id = app_current_org()`.

export class Migration20261210000000_org_signup extends Migration {
  override name = 'Migration20261210000000_org_signup';

  override up(): void {
    this.addSql(`
create table signup_challenge (
  id uuid primary key,
  mobile text not null check (mobile ~ '^09[0-9]{9}$'),
  token_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1
);
create index signup_challenge_mobile_rate_idx on signup_challenge (mobile, created_at desc);

drop policy if exists organization_self on organization;
create policy organization_self on organization
  using (id = app_current_org())
  with check (id = app_current_org());`);

    this.addSql(`grant insert on organization to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, update, delete on signup_challenge to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`revoke insert on organization from ${APP_DB_ROLE};`);
    this.addSql(`drop policy if exists organization_self on organization;`);
    this.addSql(`create policy organization_self on organization using (id = app_current_org());`);
    this.addSql(`drop table if exists signup_challenge;`);
  }
}
