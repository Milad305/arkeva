import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۲الف — موتور هشدار (F12؛ 04-alert-engine؛ D09).
//   • alert: یکتایی dedupe_key میان open و seen (۲.۲)؛ متن راهنما با و بی مبلغ.
//   • alert_rule_setting: پیش‌فرض سازمان (project_id تهی) و تنظیم پروژه (۲.۴).

export class Migration20261127000000_alerts extends Migration {
  override name = 'Migration20261127000000_alerts';

  override up(): void {
    this.addSql(`
create table alert (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  rule_code text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  subject_type text not null,
  subject_id uuid not null,
  dedupe_key text not null,
  status text not null default 'open' check (status in ('open', 'seen', 'resolved', 'dismissed')),
  title text not null,
  guidance text not null,
  guidance_safe text not null,
  action_link text not null,
  payload jsonb not null default '{}',
  audience jsonb not null default '[]',
  first_triggered_at timestamptz not null,
  last_evaluated_at timestamptz not null,
  resolved_at timestamptz,
  resolve_reason text,
  dismissed_by_user_id uuid,
  dismiss_reason text,
  dismissed_at timestamptz,
  condition_cleared_at timestamptz,
  seen_at timestamptz,
  constraint alert_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint alert_dismiss_reason check (status <> 'dismissed' or (dismiss_reason is not null and length(dismiss_reason) > 0))
);
create unique index alert_active_uq on alert (org_id, dedupe_key) where status in ('open', 'seen');
create index alert_project_idx on alert (org_id, project_id, status);

create table alert_rule_setting (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  rule_code text not null,
  enabled boolean,
  params jsonb not null default '{}',
  updated_by_user_id uuid,
  updated_at timestamptz not null,
  constraint alert_rule_setting_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create unique index alert_rule_setting_uq on alert_rule_setting (org_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), rule_code);`);

    for (const table of ['alert', 'alert_rule_setting']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on alert, alert_rule_setting to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists alert, alert_rule_setting cascade;`);
  }
}
