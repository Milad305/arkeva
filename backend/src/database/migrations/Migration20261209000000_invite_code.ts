import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// ورود اپ با کد دعوت (M01؛ OD-20 تأییدشده 1405/08/30؛ field-app.md ۷).
//   • invitation.invite_code_hash: فقط هش SHA-256 کد ۸ نویسه‌ای؛ یکتا میان همهٔ سازمان‌ها.
//   • otp_challenge.purpose: «app_invite» برای کد پیامکی پس از کد دعوت.
//   • auth_locate_invite: جست‌وجوی پیش از شناخت سازمان (مثل auth_locate_user)؛ فقط شناسه‌ها و فقط دعوت در انتظار.

export class Migration20261209000000_invite_code extends Migration {
  override name = 'Migration20261209000000_invite_code';

  override up(): void {
    this.addSql(`
alter table invitation add column invite_code_hash text;
create unique index invitation_code_idx on invitation (invite_code_hash) where invite_code_hash is not null;

alter table otp_challenge drop constraint if exists otp_challenge_purpose_check;
alter table otp_challenge add constraint otp_challenge_purpose_check check (purpose in ('login', 'password_reset', 'password_expired', 'app_login', 'app_invite'));
create index otp_challenge_invite_rate_idx on otp_challenge (user_id, created_at) where purpose = 'app_invite';

create function auth_locate_invite(p_code_hash text)
returns table (invitation_id uuid, user_id uuid, org_id uuid)
language sql stable security definer set search_path = public as $$
  select i.id, i.user_id, i.org_id from invitation i
  where i.invite_code_hash = p_code_hash and i.status = 'pending'
$$;
revoke all on function auth_locate_invite(text) from public;`);
    this.addSql(`grant execute on function auth_locate_invite(text) to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists auth_locate_invite(text);`);
    this.addSql(`drop index if exists otp_challenge_invite_rate_idx;`);
    this.addSql(`alter table otp_challenge drop constraint if exists otp_challenge_purpose_check;`);
    this.addSql(
      `alter table otp_challenge add constraint otp_challenge_purpose_check check (purpose in ('login', 'password_reset', 'password_expired', 'app_login'));`,
    );
    this.addSql(`drop index if exists invitation_code_idx;`);
    this.addSql(`alter table invitation drop column if exists invite_code_hash;`);
  }
}
