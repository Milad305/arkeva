import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۰ — ذخیره‌سازی فایل (F20 ۷؛ D10، D12).
//   • upload_session: بارگذاری قابل‌ادامه؛ پارچه‌های رسیده در received_parts؛ ناتمام پس از انقضا پاک می‌شود.
//   • stored_file: فهرست فایل‌های نهایی با کلید org/{orgId}/project/{projectId}/{kind}/{id} و SHA-256.
//   • purge_expired_uploads: PurgeTick سراسری نشست‌های منقضی را بی زمینهٔ سازمان حذف می‌کند و شناسه‌ها را برمی‌گرداند.

export class Migration20261125000000_storage extends Migration {
  override name = 'Migration20261125000000_storage';

  override up(): void {
    this.addSql(`
create table upload_session (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('photo', 'attachment', 'import', 'export', 'report', 'backup')),
  subject_id uuid,
  file_name text not null,
  content_type text not null,
  size integer not null check (size > 0),
  part_size integer not null check (part_size > 0),
  part_count integer not null check (part_count > 0),
  received_parts jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'complete')),
  file_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint upload_session_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index upload_session_expiry_idx on upload_session (expires_at) where status = 'open';

create table stored_file (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  kind text not null check (kind in ('photo', 'attachment', 'import', 'export', 'report', 'backup')),
  subject_id uuid,
  storage_key text not null unique,
  file_name text not null,
  content_type text not null,
  size integer not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by_user_id uuid not null,
  created_at timestamptz not null,
  constraint stored_file_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index stored_file_subject_idx on stored_file (org_id, kind, subject_id);

create function purge_expired_uploads(at timestamptz) returns table (id uuid, org_id uuid)
language sql volatile security definer set search_path = public as $$
  delete from upload_session s where s.status = 'open' and s.expires_at < at returning s.id, s.org_id
$$;`);

    for (const table of ['upload_session', 'stored_file']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on upload_session, stored_file to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists purge_expired_uploads(timestamptz);`);
    this.addSql(`drop table if exists upload_session, stored_file cascade;`);
  }
}
