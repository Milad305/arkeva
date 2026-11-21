import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// ساخت و تنظیمات پروژه (F02 ۴–۷؛ `02` ۳). دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.

const WORK_WEEK = JSON.stringify([
  { day: 'sat', mode: 'full' },
  { day: 'sun', mode: 'full' },
  { day: 'mon', mode: 'full' },
  { day: 'tue', mode: 'full' },
  { day: 'wed', mode: 'full' },
  { day: 'thu', mode: 'half' },
  { day: 'fri', mode: 'off' },
]);

export class Migration20261115000000_project_setup extends Migration {
  override name = 'Migration20261115000000_project_setup';

  override up(): void {
    // ── افزوده‌های Project (F02 ۴؛ `02` ۳: موقعیت کارگاه روی خود پروژه) ──
    this.addSql(`
alter table project
  add column location text,
  add column image_key text,
  add column planned_total_budget bigint check (planned_total_budget is null or planned_total_budget > 0),
  add column contingency_pct numeric(7,4) check (contingency_pct is null or contingency_pct between 0 and 20),
  add column site_lat numeric(9,6),
  add column site_lng numeric(9,6),
  add column gps_radius_m integer not null default 300 check (gps_radius_m between 50 and 5000),
  add column key_milestones jsonb not null default '[]',
  add column created_by_user_id uuid,
  add constraint project_site_pair check ((site_lat is null) = (site_lng is null));`);

    // ── ProjectSettings (`02` ۳: یک ردیف برای هر پروژه با طرح نوع‌دار) ──
    this.addSql(`
create table project_settings (
  project_id uuid primary key,
  org_id uuid not null,
  warning_threshold numeric(7,4) not null default 5,
  critical_threshold numeric(7,4) not null default 15,
  weight_generator text not null default 'manual' check (weight_generator in ('manual', 'cost', 'duration', 'equal')),
  show_financial_progress boolean not null default false,
  eac_method text not null default 'cpi' check (eac_method in ('cpi', 'remaining', 'composite')),
  min_photos integer not null default 2 check (min_photos between 0 and 10),
  max_jump_pct numeric(7,4) not null default 20 check (max_jump_pct between 5 and 100),
  allow_decrease boolean not null default false,
  offline_enabled boolean not null default true,
  late_after_hours integer not null default 72 check (late_after_hours between 1 and 720),
  daily_reminder_enabled boolean not null default true,
  daily_reminder_time text not null default '17:00' check (daily_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  gps_mode text not null default 'flag_only' check (gps_mode in ('flag_only', 'block')),
  approval_mode text not null default 'two_stage' check (approval_mode in ('single_stage', 'two_stage')),
  stage2_on_critical boolean not null default true,
  stage2_on_jump boolean not null default true,
  stage2_on_gps_out boolean not null default true,
  stage2_on_critical_path boolean not null default false,
  review_deadline_hours integer not null default 24 check (review_deadline_hours between 1 and 168),
  on_deadline text not null default 'escalate' check (on_deadline in ('remind_only', 'escalate')),
  alternate_reviewer_user_id uuid,
  auto_approve_enabled boolean not null default true,
  auto_approve_max_delta numeric(7,4) not null default 2 check (auto_approve_max_delta between 0 and 10),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint project_settings_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint project_settings_thresholds check (warning_threshold > 0 and critical_threshold > warning_threshold and critical_threshold <= 100)
);

create table project_calendar (
  project_id uuid primary key,
  org_id uuid not null,
  work_week jsonb not null,
  day_start text not null default '07:00',
  day_end text not null default '16:00',
  half_day_end text not null default '12:00',
  holidays jsonb not null default '[]',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint project_calendar_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);`);

    // ── تعطیلات رسمی افزودهٔ سازمان (قمری و ناگهانی؛ تصمیم کاربر 1405/08/22). ثابت‌های خورشیدی در کد ──
    this.addSql(`
create table org_official_holiday (
  id uuid primary key,
  org_id uuid not null references organization (id),
  date date not null,
  title text not null check (length(trim(title)) > 0),
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  constraint org_official_holiday_org_id_date_uq unique (org_id, date)
);`);

    // ── پیش‌نویس ویزارد (F02 ۵.۵): فقط برای سازنده؛ کد رزرو نمی‌شود ──
    this.addSql(`
create table project_wizard_draft (
  id uuid primary key,
  org_id uuid not null,
  created_by_user_id uuid not null,
  state jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint project_wizard_draft_user_fk foreign key (org_id, created_by_user_id) references app_user (org_id, id)
);
create index project_wizard_draft_owner_idx on project_wizard_draft (org_id, created_by_user_id);
create index project_wizard_draft_updated_at_idx on project_wizard_draft (updated_at);`);

    // ── دفتر کدها (F02 ۸.۴: کد پس از حذف دوباره استفاده نمی‌شود) — بی کلید خارجی تا پاک‌سازی پروژه بماند ──
    this.addSql(`
create table project_code_register (
  org_id uuid not null references organization (id),
  code text not null,
  project_id uuid not null,
  created_at timestamptz not null,
  primary key (org_id, code)
);
create trigger project_code_register_immutable before update or delete on project_code_register
  for each row execute function reject_mutation();
insert into project_code_register (org_id, code, project_id, created_at) select org_id, code, id, created_at from project;`);

    // ── پیش‌فرض برای پروژه‌های موجود ──
    this.addSql(`
insert into project_settings (project_id, org_id, alternate_reviewer_user_id, created_at, updated_at)
  select id, org_id, manager_user_id, now(), now() from project;
insert into project_calendar (project_id, org_id, work_week, created_at, updated_at)
  select id, org_id, '${WORK_WEEK}'::jsonb, now(), now() from project;`);

    // ── پاک‌سازی پیش‌نویس‌های بی‌فعالیت (F02 ۵.۵: ۹۰ روز) در PurgeTick؛ داده نیست، فقط پیش‌نویس ──
    this.addSql(`
create function purge_stale_wizard_drafts(p_before timestamptz) returns integer
language sql volatile security definer set search_path = public as $$
  with deleted as (delete from project_wizard_draft where updated_at < p_before returning 1)
  select count(*)::integer from deleted
$$;
revoke all on function purge_stale_wizard_drafts(timestamptz) from public;
grant execute on function purge_stale_wizard_drafts(timestamptz) to ${APP_DB_ROLE};`);

    for (const table of ['project_settings', 'project_calendar', 'org_official_holiday', 'project_wizard_draft', 'project_code_register']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on project_settings, project_calendar, org_official_holiday, project_wizard_draft to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert on project_code_register to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists purge_stale_wizard_drafts(timestamptz);`);
    this.addSql(`drop table if exists project_code_register, project_wizard_draft, org_official_holiday, project_calendar, project_settings;`);
    this.addSql(`
alter table project
  drop constraint if exists project_site_pair,
  drop column if exists location, drop column if exists image_key, drop column if exists planned_total_budget,
  drop column if exists contingency_pct, drop column if exists site_lat, drop column if exists site_lng,
  drop column if exists gps_radius_m, drop column if exists key_milestones, drop column if exists created_by_user_id;`);
  }
}
