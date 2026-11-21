import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// CBS، اتصال WBS↔CBS و درخواست بازنگری بودجه (F05 + F04؛ برش ۴). دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.
//   • cbs_item و wbs_cbs_link جاری (مالک planning، 01 ۴)؛ عکس هر نسخه در *_plan و تغییرناپذیر پس از اعمال.
//   • budget_revision_request مال cbs (F05 ۷.۳).
//   • نوع هزینه همان کدهای تأییدشدهٔ cbs.md ۴.۲ (تصمیم کاربر 1405/08/23).

const COST_TYPES = `('materials', 'labor', 'equipment', 'transport', 'subcontract', 'overhead', 'other')`;

export class Migration20261119000000_cbs extends Migration {
  override name = 'Migration20261119000000_cbs';

  override up(): void {
    const itemColumns = `
  parent_id uuid,
  code text not null,
  title text not null,
  sort_order integer not null default 0,
  is_leaf boolean not null default true,
  cost_type text not null check (cost_type in ${COST_TYPES}),
  unit text,
  estimated_quantity numeric(18,4) check (estimated_quantity > 0),
  pricing_mode text check (pricing_mode in ('unit_rate', 'lump_sum')),
  unit_rate bigint check (unit_rate > 0),
  lump_sum_amount bigint check (lump_sum_amount > 0),
  supplier_note text`;

    this.addSql(`
create table cbs_item (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,${itemColumns},
  removed_at timestamptz,
  removed_in_version_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint cbs_item_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade,
  constraint cbs_item_org_id_uq unique (org_id, id)
);
create index cbs_item_project_idx on cbs_item (org_id, project_id) where removed_at is null;

create table cbs_item_plan (
  plan_version_id uuid not null,
  cbs_item_id uuid not null,
  org_id uuid not null,
  project_id uuid not null,${itemColumns},
  primary key (plan_version_id, cbs_item_id),
  constraint cbs_item_plan_version_fk foreign key (org_id, plan_version_id) references plan_version (org_id, id) on delete cascade
);
create index cbs_item_plan_item_idx on cbs_item_plan (org_id, cbs_item_id);

create table wbs_cbs_link (
  org_id uuid not null,
  project_id uuid not null,
  wbs_item_id uuid not null,
  cbs_item_id uuid not null,
  quantity numeric(18,4) check (quantity > 0),
  allocated_amount bigint check (allocated_amount > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (wbs_item_id, cbs_item_id),
  constraint wbs_cbs_link_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index wbs_cbs_link_project_idx on wbs_cbs_link (org_id, project_id);
create index wbs_cbs_link_cbs_idx on wbs_cbs_link (org_id, cbs_item_id);

create table wbs_cbs_link_plan (
  plan_version_id uuid not null,
  wbs_item_id uuid not null,
  cbs_item_id uuid not null,
  org_id uuid not null,
  project_id uuid not null,
  quantity numeric(18,4) check (quantity > 0),
  allocated_amount bigint check (allocated_amount > 0),
  sub_budget bigint not null default 0,
  primary key (plan_version_id, wbs_item_id, cbs_item_id),
  constraint wbs_cbs_link_plan_version_fk foreign key (org_id, plan_version_id) references plan_version (org_id, id) on delete cascade
);

-- عکس نسخهٔ اعمال‌شده تغییرناپذیر است (AC-PV-01)؛ همان تابع wbs_item_plan
create trigger cbs_item_plan_immutable before update or delete on cbs_item_plan for each row execute function wbs_item_plan_immutable();
create trigger wbs_cbs_link_plan_immutable before update or delete on wbs_cbs_link_plan for each row execute function wbs_item_plan_immutable();`);

    // ── درخواست بازنگری بودجه (cbs.md ۷.۳؛ OD-11) ──
    this.addSql(`
create table budget_revision_request (
  id uuid primary key,
  org_id uuid not null,
  project_id uuid not null,
  requested_by_user_id uuid not null,
  reason text not null,
  changes jsonb not null,
  impact jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied', 'withdrawn')),
  decided_by_user_id uuid,
  decided_at timestamptz,
  decision_note text,
  result_version_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint budget_revision_request_project_fk foreign key (org_id, project_id) references project (org_id, id) on delete cascade
);
create index budget_revision_request_pending_idx on budget_revision_request (org_id, project_id) where status = 'pending';`);

    for (const table of ['cbs_item', 'cbs_item_plan', 'wbs_cbs_link', 'wbs_cbs_link_plan', 'budget_revision_request']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }
    this.addSql(`grant select, insert, update, delete on cbs_item, cbs_item_plan, wbs_cbs_link, wbs_cbs_link_plan to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, update on budget_revision_request to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists budget_revision_request, wbs_cbs_link_plan, wbs_cbs_link, cbs_item_plan, cbs_item cascade;`);
  }
}
