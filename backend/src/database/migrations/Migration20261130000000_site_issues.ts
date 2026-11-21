import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۳ب — مشکل کارگاه (F08 M13؛ risk.md ۴ و ۵.۳؛ field-app.md ۴.۸). مالک: field.
//   • site_issue: واقعیت با شناسهٔ UUID گوشی (D10)؛ ارسال دوباره همان ردیف را برمی‌گرداند (AC-RK-05). risk_id پس از دریافت.
//   • site_issue_photo: عکس اختیاری با هش اعلام‌شدهٔ گوشی؛ فایل جدا با `/uploads` و نوع تازهٔ issue_photo.

export class Migration20261130000000_site_issues extends Migration {
  override name = 'Migration20261130000000_site_issues';

  override up(): void {
    this.addSql(`
create table site_issue (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  reporter_user_id uuid not null,
  wbs_item_id uuid,
  type text not null check (type in ('material', 'safety', 'equipment', 'design', 'weather', 'other')),
  title text not null,
  description text not null default '',
  effect text not null check (effect in ('stop', 'slow', 'none')),
  device_recorded_at timestamptz not null,
  server_received_at timestamptz not null,
  risk_id uuid,
  created_at timestamptz not null,
  constraint site_issue_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  unique (org_id, id)
);
create index site_issue_reporter_idx on site_issue (org_id, project_id, reporter_user_id);

create table site_issue_photo (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  issue_id uuid not null,
  sha256 text not null,
  storage_key text,
  upload_status text not null default 'pending' check (upload_status in ('pending', 'complete')),
  taken_at timestamptz not null,
  created_at timestamptz not null,
  constraint site_issue_photo_issue_fk foreign key (org_id, issue_id) references site_issue (org_id, id) on delete cascade
);
create index site_issue_photo_issue_idx on site_issue_photo (org_id, issue_id);

alter table upload_session drop constraint upload_session_kind_check;
alter table upload_session add constraint upload_session_kind_check check (kind in ('photo', 'issue_photo', 'attachment', 'import', 'export', 'report', 'backup'));
alter table stored_file drop constraint stored_file_kind_check;
alter table stored_file add constraint stored_file_kind_check check (kind in ('photo', 'issue_photo', 'attachment', 'import', 'export', 'report', 'backup'));`);

    for (const table of ['site_issue', 'site_issue_photo']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    // واقعیت: درج و فقط پیوند ریسک و وضعیت بارگذاری عکس به‌روز می‌شوند
    this.addSql(`grant select, insert, update on site_issue, site_issue_photo to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists site_issue_photo, site_issue cascade;`);
    this.addSql(`alter table upload_session drop constraint upload_session_kind_check;`);
    this.addSql(
      `alter table upload_session add constraint upload_session_kind_check check (kind in ('photo', 'attachment', 'import', 'export', 'report', 'backup'));`,
    );
    this.addSql(`alter table stored_file drop constraint stored_file_kind_check;`);
    this.addSql(
      `alter table stored_file add constraint stored_file_kind_check check (kind in ('photo', 'attachment', 'import', 'export', 'report', 'backup'));`,
    );
  }
}
