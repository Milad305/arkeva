import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۶ — قالب‌ها (F16؛ templates.md ۴، ۵.۴؛ `02` ۱۲). مالک: templates.
//   • template: سربرگ و چرخهٔ عمر؛ `draft_content` پیش‌نویس منتشرنشده (نسخهٔ بعد)؛ پیش‌فرض نوع یکتا در سازمان.
//   • template_version: محتوای تغییرناپذیر هر انتشار (فقط درج).
//   • project.template_id/template_version: `Project.templateRef` فقط برای آمار (۴)؛ مالک projects.

export class Migration20261203000000_templates extends Migration {
  override name = 'Migration20261203000000_templates';

  override up(): void {
    this.addSql(`
create table template (
  id uuid primary key,
  org_id uuid not null,
  name text not null,
  icon text not null default 'layout-template',
  project_type text not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  is_default_for_type boolean not null default false,
  origin_note text,
  maintainer_user_id uuid,
  draft_content jsonb,
  last_changed_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  unique (org_id, id)
);
create unique index template_name_uq on template (org_id, name);
create unique index template_default_uq on template (org_id, project_type) where is_default_for_type;

create table template_version (
  id uuid primary key,
  org_id uuid not null,
  template_id uuid not null,
  number int not null,
  content jsonb not null,
  note text not null,
  author_user_id uuid,
  wbs_count int not null,
  cbs_count int not null,
  published_at timestamptz not null,
  created_at timestamptz not null,
  constraint template_version_template_fk foreign key (org_id, template_id) references template (org_id, id) on delete cascade
);
create unique index template_version_uq on template_version (template_id, number);

alter table project add column template_id uuid, add column template_version int;
create index project_template_idx on project (org_id, template_id) where template_id is not null;`);

    for (const table of ['template', 'template_version']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on template to ${APP_DB_ROLE};`);
    // نسخه‌ها تغییرناپذیرند؛ حذف فقط با حذف قالبِ هرگز استفاده‌نشده (cascade)
    this.addSql(`grant select, insert, delete on template_version to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`alter table project drop column if exists template_id, drop column if exists template_version;`);
    this.addSql(`drop table if exists template_version, template cascade;`);
  }
}
