import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۳الف — دفتر ریسک (F14؛ risk.md ۴؛ `02` ۹ و ۵). مالک همه: risks.
//   • risk: امتیاز و سطح مشتق و ذخیره‌شده (۵.۲)؛ کد RSK-NNN یکتا در پروژه (C05) با شمارندهٔ risk_counter.
//   • risk_note: تاریخچهٔ ویرایش‌ناپذیر — یادداشت کاربر و رخدادهای سیستمی (ثبت، امتیاز، وضعیت، اقدام، ذخیره) یک جدول.
//   • risk_score_history و contingency_allocation واقعیت‌اند (فقط درج)؛ تخصیص = جمع ردیف‌ها.
//   • risk_category: فهرست سازمانی؛ پیش‌فرض‌ها هنگام نخستین خواندن (تصمیم 1405/08/25).

export class Migration20261129000000_risks extends Migration {
  override name = 'Migration20261129000000_risks';

  override up(): void {
    this.addSql(`
create table risk_category (
  id uuid primary key,
  org_id uuid not null,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null
);
create unique index risk_category_uq on risk_category (org_id, name);

create table risk_counter (
  project_id uuid primary key,
  org_id uuid not null,
  last_value int not null,
  constraint risk_counter_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create table risk (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  code text not null,
  title text not null,
  category text not null,
  cause text,
  event text,
  consequence text,
  probability smallint check (probability between 1 and 5),
  impact smallint check (impact between 1 and 5),
  score smallint,
  level text check (level in ('low', 'medium', 'high', 'critical')),
  status text not null check (status in ('identified', 'assessed', 'in_action', 'occurred', 'closed')),
  response_strategy text check (response_strategy in ('avoid', 'mitigate', 'transfer', 'accept')),
  owner_user_id uuid not null,
  trigger_text text,
  next_review_date date,
  review_frequency text check (review_frequency in ('weekly', 'biweekly', 'monthly')),
  cost_impact bigint check (cost_impact >= 0),
  schedule_impact_days int check (schedule_impact_days >= 0),
  target_probability smallint check (target_probability between 1 and 5),
  target_impact smallint check (target_impact between 1 and 5),
  source text not null check (source in ('manual', 'field')),
  source_reported_by_user_id uuid,
  source_issue_type text,
  source_issue_effect text check (source_issue_effect in ('stop', 'slow', 'none')),
  close_reason text check (close_reason in ('mitigated', 'not_applicable', 'accepted', 'other')),
  closed_at timestamptz,
  closed_by_user_id uuid,
  occurred_at timestamptz,
  actual_cost bigint check (actual_cost >= 0),
  actual_delay_days int check (actual_delay_days >= 0),
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  constraint risk_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint risk_score_pair check ((probability is null) = (impact is null)),
  constraint risk_closed_reason check (status <> 'closed' or close_reason is not null),
  unique (org_id, id)
);
create unique index risk_code_uq on risk (project_id, code);
create index risk_project_idx on risk (org_id, project_id, status);

create table risk_action (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  risk_id uuid not null,
  title text not null,
  owner_user_id uuid not null,
  due_date date not null,
  status text not null check (status in ('open', 'in_progress', 'done', 'cancelled')),
  cost_note text,
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version int not null default 1,
  constraint risk_action_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);
create index risk_action_risk_idx on risk_action (org_id, risk_id);

create table risk_link (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  risk_id uuid not null,
  target_type text not null check (target_type in ('wbs_item', 'cbs_item', 'field_report')),
  target_id uuid not null,
  created_at timestamptz not null,
  constraint risk_link_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);
create unique index risk_link_uq on risk_link (risk_id, target_type, target_id);
create index risk_link_target_idx on risk_link (org_id, project_id, target_type, target_id);

create table risk_score_history (
  id uuid primary key,
  org_id uuid not null,
  risk_id uuid not null,
  probability smallint not null,
  impact smallint not null,
  score smallint not null,
  changed_by_user_id uuid not null,
  reason text,
  created_at timestamptz not null,
  constraint risk_score_history_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);
create index risk_score_history_idx on risk_score_history (org_id, risk_id, created_at);

create table risk_note (
  id uuid primary key,
  org_id uuid not null,
  risk_id uuid not null,
  kind text not null check (kind in ('note', 'score', 'status', 'created', 'action', 'contingency')),
  text text not null,
  author_user_id uuid not null,
  attachment_keys jsonb not null default '[]',
  mentioned_user_ids jsonb not null default '[]',
  created_at timestamptz not null,
  constraint risk_note_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);
create index risk_note_idx on risk_note (org_id, risk_id, created_at);

create table risk_follower (
  risk_id uuid not null,
  user_id uuid not null,
  org_id uuid not null,
  created_at timestamptz not null,
  primary key (risk_id, user_id),
  constraint risk_follower_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);

create table contingency_allocation (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  risk_id uuid not null,
  amount bigint not null,
  note text not null default '',
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  constraint contingency_allocation_risk_fk foreign key (org_id, risk_id) references risk (org_id, id) on delete cascade
);
create index contingency_allocation_idx on contingency_allocation (org_id, project_id, risk_id);`);

    const tables = [
      'risk_category',
      'risk_counter',
      'risk',
      'risk_action',
      'risk_link',
      'risk_score_history',
      'risk_note',
      'risk_follower',
      'contingency_allocation',
    ];
    for (const table of tables) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    // واقعیت‌ها فقط درج (CLAUDE.md ۳ بند ۸)
    this.addSql(`grant select, insert, update, delete on risk_category, risk_counter, risk, risk_action, risk_link, risk_follower to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert on risk_score_history, risk_note, contingency_allocation to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(
      `drop table if exists contingency_allocation, risk_follower, risk_note, risk_score_history, risk_link, risk_action, risk, risk_counter, risk_category cascade;`,
    );
  }
}
