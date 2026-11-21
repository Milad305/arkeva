import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۹ب — دوره‌های گزارش (F10 ۵.۸؛ OD-06؛ `02` ۸).
//   • reporting_period: ماه شمسی، پیوسته، یکتا بر (پروژه، شروع). دورهٔ بسته بازنمی‌شود (تریگر).
//   • period_snapshot: کپی اعداد پایان دوره؛ ویرایش ممنوع (تریگر)، حذف فقط با پاک‌سازی پروژه (cascade).

export class Migration20261124000000_periods extends Migration {
  override name = 'Migration20261124000000_periods';

  override up(): void {
    this.addSql(`
create table reporting_period (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_by_user_id uuid,
  closed_at timestamptz,
  closed_with_pending_count integer,
  close_preview jsonb,
  created_at timestamptz not null,
  constraint reporting_period_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint reporting_period_dates check (end_date >= start_date),
  constraint reporting_period_closed check (status = 'open' or (closed_at is not null and closed_by_user_id is not null)),
  constraint reporting_period_start_uq unique (project_id, start_date)
);
create index reporting_period_project_idx on reporting_period (org_id, project_id, start_date);

-- دورهٔ بسته بازنمی‌شود (۵.۸؛ تصمیم تأییدشده)
create function reporting_period_closed_final() returns trigger language plpgsql as $$
begin
  if old.status = 'closed' then
    raise exception 'دورهٔ بستهٔ % بازنمی‌شود و تغییر نمی‌کند', old.id using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger reporting_period_closed_final before update on reporting_period for each row execute function reporting_period_closed_final();

create table period_snapshot (
  period_id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  date date not null,
  project jsonb not null,
  items jsonb not null,
  created_at timestamptz not null,
  constraint period_snapshot_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);

create function period_snapshot_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'عکس دورهٔ % تغییر نمی‌کند', old.period_id using errcode = 'P0001';
end $$;
create trigger period_snapshot_immutable before update on period_snapshot for each row execute function period_snapshot_immutable();`);

    for (const table of ['reporting_period', 'period_snapshot']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on reporting_period, period_snapshot to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists reporting_period, period_snapshot cascade;`);
    this.addSql(`drop function if exists reporting_period_closed_final(); drop function if exists period_snapshot_immutable();`);
  }
}
