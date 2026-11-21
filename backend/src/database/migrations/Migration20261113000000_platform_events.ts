import { Migration } from '@mikro-orm/migrations';
import { getConstructionPlans } from 'pg-boss';
import { APP_DB_ROLE, JOB_SCHEMA } from '../system-ids.js';

// زیرساخت رویداد F20 (docs/backend/08؛ 05 ۱۰): outbox، مصرف یک‌باره، ممیزی، اجرای تیک و صف pg-boss.
// دست‌نوشته؛ پس از اعمال ویرایش نمی‌شود.
//
// pg-boss: schema با نقش مالک ساخته می‌شود و اپ با `migrate: false` و `createSchema: false` بالا می‌آید؛
// نقش اپ فقط داده می‌خواند و می‌نویسد. ارتقای pg-boss = migration تازه با getMigrationPlans، نه در راه‌اندازی.
// SQL ساخت از نسخهٔ قفل‌شدهٔ 12.38.2 (pgboss.version = 46) است؛ BEGIN/COMMIT خودش برداشته می‌شود
// چون migration خودش در تراکنش است.

function pgBossInstall(): string {
  const plan = getConstructionPlans(JOB_SCHEMA);
  return plan.replace(/^\s*BEGIN;\s*$/m, '').replace(/^\s*COMMIT;\s*$/m, '');
}

export class Migration20261113000000_platform_events extends Migration {
  override name = 'Migration20261113000000_platform_events';

  override up(): void {
    this.addSql(pgBossInstall());
    this.addSql(`
grant usage on schema ${JOB_SCHEMA} to ${APP_DB_ROLE};
grant select, insert, update, delete on all tables in schema ${JOB_SCHEMA} to ${APP_DB_ROLE};
grant usage, select on all sequences in schema ${JOB_SCHEMA} to ${APP_DB_ROLE};
grant execute on all functions in schema ${JOB_SCHEMA} to ${APP_DB_ROLE};`);

    // ── رویداد دامنه (02 ۱۳؛ 08 ۲). فقط processed_at و attempts تغییرپذیرند ──
    this.addSql(`
create table domain_event (
  id uuid primary key,
  org_id uuid not null references organization (id),
  project_id uuid,
  type text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and (payload ? 'v')),
  actor_user_id uuid,
  trace_id text,
  occurred_at timestamptz not null,
  processed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  constraint domain_event_payload_size check (octet_length(payload::text) <= 65536)
);
create index domain_event_org_id_project_id_occurred_at_idx on domain_event (org_id, project_id, occurred_at desc);
create index domain_event_pending_idx on domain_event (occurred_at) where processed_at is null;
create index domain_event_occurred_at_brin on domain_event using brin (occurred_at);

create function domain_event_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'جدول domain_event فقط‌افزودنی است' using errcode = 'P0001';
  end if;
  if (new.id, new.org_id, new.project_id, new.type, new.payload, new.actor_user_id, new.trace_id, new.occurred_at)
     is distinct from
     (old.id, old.org_id, old.project_id, old.type, old.payload, old.actor_user_id, old.trace_id, old.occurred_at) then
    raise exception 'در domain_event فقط processed_at و attempts تغییرپذیرند' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger domain_event_immutable before update or delete on domain_event
  for each row execute function domain_event_guard();

create table consumed_event (
  consumer text not null,
  event_id uuid not null references domain_event (id),
  org_id uuid not null,
  consumed_at timestamptz not null,
  primary key (consumer, event_id)
);
create trigger consumed_event_immutable before update or delete on consumed_event
  for each row execute function reject_mutation();`);

    // ── ممیزی (F20 ۶؛ 05 ۱۰). بازیگر تهی = سیستم (تصمیم کاربر 1405/08/22) ──
    this.addSql(`
create table audit_log (
  id uuid primary key,
  org_id uuid not null references organization (id),
  project_id uuid,
  actor_kind text not null check (actor_kind in ('user', 'system')),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  reason text,
  ip text,
  trace_id text,
  occurred_at timestamptz not null,
  constraint audit_log_actor check ((actor_kind = 'user') = (actor_user_id is not null))
);
create index audit_log_org_id_project_id_occurred_at_idx on audit_log (org_id, project_id, occurred_at desc);
create index audit_log_org_id_entity_idx on audit_log (org_id, entity_type, entity_id);
create index audit_log_occurred_at_brin on audit_log using brin (occurred_at);
create trigger audit_log_immutable before update or delete on audit_log
  for each row execute function reject_mutation();`);

    // ── اجرای تیک‌ها (08 ۴): کلید یکتای (tick, run_date) جبران را تکرارناپذیر می‌کند. سراسری، بدون org ──
    this.addSql(`
create table tick_run (
  tick text not null,
  run_date date not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  projects_processed integer,
  primary key (tick, run_date)
);`);

    for (const table of ['domain_event', 'consumed_event', 'audit_log']) {
      this.addSql(`alter table ${table} enable row level security;`);
      this.addSql(`create policy ${table}_tenant on ${table} using (org_id = app_current_org()) with check (org_id = app_current_org());`);
    }

    this.addSql(`grant select, insert on domain_event, consumed_event, audit_log to ${APP_DB_ROLE};`);
    this.addSql(`grant update (processed_at, attempts) on domain_event to ${APP_DB_ROLE};`);
    this.addSql(`grant select, insert, update on tick_run to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop table if exists tick_run, audit_log, consumed_event, domain_event cascade;`);
    this.addSql(`drop function if exists domain_event_guard();`);
    this.addSql(`drop schema if exists ${JOB_SCHEMA} cascade;`);
  }
}
