import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// نسخه‌های برنامه و WBS (F04 + F03؛ برش ۳). دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.
//   • plan_version: حداکثر یک draft و یک baseline (غیرکنارگذاشته) برای هر پروژه؛ شمارهٔ اعمال‌شده یکتا.
//   • wbs_item: جدول جاری (آینهٔ آخرین نسخهٔ اعمال‌شده؛ در پروژهٔ پیش‌نویس، مبنای کاری). حذف نرم پس از اعمال.
//   • wbs_item_plan: عکس هر نسخه؛ پس از اعمال تغییرناپذیر (AC-PV-01 با تریگر).

export class Migration20261118000000_planning extends Migration {
  override name = 'Migration20261118000000_planning';

  override up(): void {
    this.addSql(`
create table plan_version (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  kind text not null check (kind in ('baseline', 'revision')),
  number integer check (number >= 0),
  status text not null default 'draft' check (status in ('draft', 'applied', 'discarded')),
  source text not null check (source in ('wizard', 'template', 'manual_edit', 'msp_import', 'msp_sync', 'budget_revision')),
  note text,
  draft_revision integer not null default 0,
  change_count integer not null default 0,
  last_saved_at timestamptz,
  last_saved_by_user_id uuid,
  applied_by_user_id uuid,
  applied_at timestamptz,
  discarded_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint plan_version_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint plan_version_org_id_uq unique (org_id, id),
  constraint plan_version_applied_number check (status <> 'applied' or number is not null)
);
create unique index plan_version_one_draft_uq on plan_version (project_id) where status = 'draft';
create unique index plan_version_one_baseline_uq on plan_version (project_id) where kind = 'baseline' and status <> 'discarded';
create unique index plan_version_number_uq on plan_version (project_id, number) where status = 'applied';

-- نسخهٔ اعمال‌شده یا کنارگذاشته دیگر تغییر نمی‌کند (F04 ۴)
create function plan_version_immutable() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' then
    raise exception 'نسخهٔ % برنامه % است و تغییر نمی‌کند', old.id, old.status using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger plan_version_immutable before update on plan_version for each row execute function plan_version_immutable();`);

    this.addSql(`
create table wbs_item (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  parent_id uuid,
  code text not null,
  code_mode text not null default 'auto' check (code_mode in ('auto', 'custom')),
  title text not null,
  sort_order integer not null default 0,
  is_leaf boolean not null default true,
  is_milestone boolean not null default false,
  weight_in_parent numeric(7,4) not null default 0 check (weight_in_parent >= 0 and weight_in_parent <= 100),
  planned_start date,
  planned_finish date,
  unit text,
  total_quantity numeric(18,4),
  measurement_method text check (measurement_method in ('quantity', 'percent', 'steps', 'time_based')),
  steps jsonb,
  supervisor_user_id uuid,
  status_note text,
  is_critical boolean,
  total_float_days numeric(10,2),
  removed_at timestamptz,
  removed_in_version_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint wbs_item_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint wbs_item_org_id_uq unique (org_id, id)
);
create index wbs_item_project_idx on wbs_item (org_id, project_id) where removed_at is null;

create table wbs_item_plan (
  plan_version_id uuid not null,
  wbs_item_id uuid not null,
  org_id uuid not null,
  project_id uuid not null,
  parent_id uuid,
  code text not null,
  code_mode text not null check (code_mode in ('auto', 'custom')),
  title text not null,
  sort_order integer not null,
  is_leaf boolean not null,
  is_milestone boolean not null,
  weight_in_parent numeric(7,4) not null check (weight_in_parent >= 0 and weight_in_parent <= 100),
  planned_start date,
  planned_finish date,
  unit text,
  total_quantity numeric(18,4),
  measurement_method text check (measurement_method in ('quantity', 'percent', 'steps', 'time_based')),
  steps jsonb,
  is_critical boolean,
  total_float_days numeric(10,2),
  bac bigint not null default 0,
  primary key (plan_version_id, wbs_item_id),
  constraint wbs_item_plan_version_fk foreign key (org_id, plan_version_id) references plan_version (org_id, id) on delete cascade
);
create index wbs_item_plan_item_idx on wbs_item_plan (org_id, wbs_item_id);

-- عکس نسخهٔ اعمال‌شده تغییرناپذیر است (AC-PV-01). حذف آبشاری پروژه پس از حذف خود نسخه اجرا می‌شود و نسخه را نمی‌بیند.
create function wbs_item_plan_immutable() returns trigger language plpgsql as $$
begin
  if exists (select 1 from plan_version v where v.id = old.plan_version_id and v.status <> 'draft') then
    raise exception 'عکس نسخهٔ اعمال‌شدهٔ برنامه تغییر نمی‌کند' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger wbs_item_plan_immutable before update or delete on wbs_item_plan for each row execute function wbs_item_plan_immutable();`);

    // ── نسخه‌های پروژه (F04 ۵.۳ گام ۷؛ F02 مالک ستون‌ها) ──
    this.addSql(`
alter table project
  add column baseline_version_id uuid,
  add column current_version_id uuid,
  add column pv_reference_version_id uuid;`);

    for (const table of ['plan_version', 'wbs_item', 'wbs_item_plan']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update on plan_version to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, update, delete on wbs_item, wbs_item_plan to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(
      `alter table project drop column if exists baseline_version_id, drop column if exists current_version_id, drop column if exists pv_reference_version_id;`,
    );
    this.addSql(`drop table if exists wbs_item_plan, wbs_item, plan_version cascade;`);
    this.addSql(`drop function if exists wbs_item_plan_immutable(); drop function if exists plan_version_immutable();`);
  }
}
