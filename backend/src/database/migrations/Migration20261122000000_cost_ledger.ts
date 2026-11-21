import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۸ — دفتر هزینه (F06؛ `02` ۵؛ cost-ledger.md ۴؛ D02).
//   • cost_entry: واقعیت. ردیف posted هرگز ویرایش یا حذف نمی‌شود (تریگر؛ AC-CST-07)؛ اصلاح = ردیف برگشتی + ردیف تازه.
//   • یکتایی idempotency روی (پروژه، منبع، externalRef)؛ هر ردیف حداکثر یک برگشتی.
//   • cost_import_batch: عملیاتی؛ ردیف‌های پیش‌نمایش در خود دسته ذخیره می‌شوند (فایل نگه داشته نمی‌شود).
//   • project.costs_complete_*: مال cost-ledger (01 ۴)، نوشتن از راه projects (OD-19).

export class Migration20261122000000_cost_ledger extends Migration {
  override name = 'Migration20261122000000_cost_ledger';

  override up(): void {
    this.addSql(`
create table cost_import_batch (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  file_name text not null,
  status text not null check (status in ('previewed', 'imported', 'posted', 'cancelled')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  skipped_duplicate_count integer not null default 0,
  total_amount bigint not null default 0,
  rows jsonb not null default '[]',
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint cost_import_batch_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint cost_import_batch_org_id_uq unique (org_id, id)
);

create table cost_entry (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  cbs_item_id uuid not null,
  wbs_item_id uuid,
  cost_date date not null,
  amount bigint not null check (amount <> 0),
  quantity numeric(18,4) check (quantity > 0),
  source text not null check (source in ('manual', 'excel', 'subcontractor_statement', 'integration')),
  external_ref text,
  document_no text,
  description text,
  counterparty text,
  attachment_keys jsonb not null default '[]',
  status text not null check (status in ('draft', 'posted')),
  reverses_entry_id uuid,
  reversal_reason text,
  import_batch_id uuid,
  period_shifted boolean not null default false,
  posted_by_user_id uuid,
  posted_at timestamptz,
  created_by_user_id uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint cost_entry_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint cost_entry_org_id_uq unique (org_id, id),
  -- مبلغ منفی فقط در ردیف برگشتی (cost-ledger.md ۵.۲)
  constraint cost_entry_negative_only_reversal check (amount > 0 or reverses_entry_id is not null),
  constraint cost_entry_reversal_posted check (reverses_entry_id is null or status = 'posted')
);
create unique index cost_entry_external_ref_uq on cost_entry (org_id, project_id, source, external_ref) where external_ref is not null;
create unique index cost_entry_reversed_once on cost_entry (reverses_entry_id) where reverses_entry_id is not null;
create index cost_entry_project_idx on cost_entry (org_id, project_id, status, cost_date);
create index cost_entry_cbs_idx on cost_entry (org_id, cbs_item_id) where status = 'posted';

-- ردیف قطعی تغییرناپذیر است (D02؛ AC-CST-07): نه ویرایش، نه حذف
create function cost_entry_posted_immutable() returns trigger language plpgsql as $$
begin
  if old.status = 'posted' then
    raise exception 'ردیف هزینهٔ قطعی % تغییر نمی‌کند؛ اصلاح با ردیف برگشتی است', old.id using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger cost_entry_posted_immutable before update or delete on cost_entry for each row execute function cost_entry_posted_immutable();

alter table project
  add column costs_complete_through date,
  add column costs_complete_set_by uuid,
  add column costs_complete_set_at timestamptz;`);

    for (const table of ['cost_entry', 'cost_import_batch']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on cost_entry, cost_import_batch to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(
      `alter table project drop column if exists costs_complete_through, drop column if exists costs_complete_set_by, drop column if exists costs_complete_set_at;`,
    );
    this.addSql(`drop table if exists cost_entry, cost_import_batch cascade;`);
    this.addSql(`drop function if exists cost_entry_posted_immutable();`);
  }
}
