import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۸ب — زمان‌بندی و ارسال گزارش مدیریتی (F18؛ management-reports.md ۶، ۷.۳، ۷.۴؛ `02` ۱۲). مالک: reports.
//   • report_schedule: تکرار، گیرندگان (کاربر، نقش، ایمیل)، نوبت بعد و وضعیت آخرین اجرا.
//   • generated_report: زمان‌بندی سازنده و گیرندگان همین نسخه (با یا بی مبلغ؛ ۷.۳).

export class Migration20261207000000_report_schedules extends Migration {
  override name = 'Migration20261207000000_report_schedules';

  override up(): void {
    this.addSql(`
create table report_schedule (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid,
  template_id text not null,
  format text not null check (format in ('pdf', 'xlsx')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'on_period_close')),
  weekday int check (weekday between 0 and 6),
  day_of_month int check (day_of_month between 1 and 31),
  time_of_day text not null,
  timezone text not null default 'Asia/Tehran',
  working_days_only boolean not null default false,
  recipients jsonb not null,
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_status text not null default 'never' check (last_run_status in ('ok', 'failed', 'never', 'paused')),
  note jsonb,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  constraint report_schedule_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index report_schedule_due_idx on report_schedule (next_run_at) where enabled;
create index report_schedule_project_idx on report_schedule (org_id, project_id);

alter table generated_report add column schedule_id uuid, add column deliveries jsonb not null default '{"users": [], "emails": []}';`);
    this.addSql(`alter table report_schedule enable row level security;`);
    this.addSql(`create policy report_schedule_tenant on report_schedule using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    this.addSql(`grant select, insert, update, delete on report_schedule to ${APP_DB_ROLE};`);
    // تیک ساعتی بیرون از سازمان: فقط شناسه‌ها (همان الگوی due_field_reviews)
    this.addSql(`
create function due_report_schedules(at timestamptz) returns table (id uuid, org_id uuid)
language sql security definer set search_path = public as $$
  select id, org_id from report_schedule where enabled and frequency <> 'on_period_close' and next_run_at is not null and next_run_at <= at;
$$;`);
    this.addSql(`revoke all on function due_report_schedules(timestamptz) from public;`);
    this.addSql(`grant execute on function due_report_schedules(timestamptz) to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`alter table generated_report drop column if exists schedule_id, drop column if exists deliveries;`);
    this.addSql(`drop function if exists due_report_schedules(timestamptz);`);
    this.addSql(`drop table if exists report_schedule cascade;`);
  }
}
