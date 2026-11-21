import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { txSql } from '../../../platform/database/tx-sql.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { CostEntries } from '../../cost-ledger/index.js';
import { FieldReads } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectRules } from '../../projects/index.js';
import { monthsBetween } from '../domain/formulas/periods.js';
import { type ClosePreview, PeriodSnapshot, ReportingPeriod } from '../domain/period.entities.js';
import { ProjectDailySnapshot, WbsItemDailySnapshot } from '../domain/progress.entities.js';
import { PeriodReads, type PeriodView, periodViews } from './period-reads.js';
import { RecomputeProject } from './recompute-project.js';

// دوره‌های گزارش (progress-calculation.md ۵.۸؛ OD-06؛ تصمیم‌های 1405/08/23): ساخت ماه‌های شمسی از ماه شروع برنامه تا یک سال
// جلوتر، پیش‌نمایش و بستن دستی به ترتیب. بستن عکس اعداد پایان دوره را در PeriodSnapshot ثابت می‌کند و PeriodClosed می‌دهد.

const notClosable = (reason: string) => new ConflictError('PERIOD_NOT_CLOSABLE', { reason });

@Injectable()
export class Periods {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly rules: ProjectRules,
    private readonly field: FieldReads,
    private readonly costs: CostEntries,
    private readonly identity: IdentityService,
    private readonly reads: PeriodReads,
    private readonly recompute: RecomputeProject,
  ) {}

  private today(): string {
    return tehranClock(this.clock.now()).date;
  }

  /** ماه‌های نبوده را می‌سازد (تکرارپذیر)؛ پروژهٔ پیش‌نویس دوره ندارد. */
  async ensure(tx: EntityManager, projectId: string): Promise<number> {
    const rules = await this.rules.of(projectId, tx);
    if (rules.status === 'draft') return 0;
    const today = this.today();
    const activated = rules.progress.activatedAt ? tehranClock(rules.progress.activatedAt).date : today;
    const start = rules.progress.plannedStart ?? activated;
    const until = addDays(activated > today ? activated : today, 365);
    const months = monthsBetween(start < until ? start : until, until);
    if (months.length === 0) return 0;
    const values: unknown[] = [];
    const rows = months.map((month, index) => {
      values.push(newId(), rules.orgId, projectId, month.startDate, month.endDate);
      const base = index * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'open', now())`;
    });
    const result = await txSql(tx).executeSql(
      `insert into reporting_period (id, org_id, project_id, start_date, end_date, status, created_at) values ${rows.join(', ')}
       on conflict (project_id, start_date) do nothing`,
      values,
    );
    return result.rowCount;
  }

  /** `GET /projects/:pid/periods` */
  async list(projectId: string): Promise<PeriodView[]> {
    await this.rules.of(projectId);
    const periods = await this.reads.list(projectId);
    const closers = [...new Set(periods.flatMap((period) => (period.closedByUserId ? [period.closedByUserId] : [])))];
    const people = await this.identity.personRefs(closers);
    return periodViews(periods, this.today(), new Map([...people].map(([id, person]) => [id, person.fullName])));
  }

  /** `GET /projects/:pid/periods/:id/close-preview` (دیالوگ G2): در انتظارها، پیش‌نویس‌های هزینه، تاریخ کامل بودن. */
  async preview(
    projectId: string,
    periodId: string,
    em: EntityManager = this.em,
  ): Promise<ClosePreview & { readonly period: { id: string; startDate: string; endDate: string } }> {
    const period = await this.find(em, projectId, periodId);
    const [facts, drafts, rules] = await Promise.all([
      this.field.progressFacts(em, projectId),
      this.costs.draftCount(projectId, period.startDate, period.endDate, em),
      this.rules.of(projectId, em),
    ]);
    const through = rules.progress.costsCompleteThrough;
    return {
      period: { id: period.id, startDate: period.startDate, endDate: period.endDate },
      pendingItems: facts.pending.filter((entry) => entry.workDate >= period.startDate && entry.workDate <= period.endDate).length,
      draftCostEntries: drafts,
      costsCompleteThrough: through,
      costsComplete: through !== null && through >= period.endDate,
    };
  }

  /** `POST /projects/:pid/periods/:id/close` — فقط اولین دورهٔ باز گذشته؛ با آیتم در انتظار مجاز (۵.۸). */
  async close(projectId: string, periodId: string): Promise<PeriodView[]> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const period = await this.find(this.em, projectId, periodId);
    this.assertClosable(period, await this.reads.list(projectId));
    // عکس روز پایان دوره باید ساخته شده باشد (تصمیم 1405/08/23: اعداد پایان دوره)
    if (!(await this.em.count(ProjectDailySnapshot, { projectId, date: period.endDate }))) await this.recompute.recompute(projectId, null);

    await this.em.transactional(async (tx) => {
      const locked = await tx.findOne(ReportingPeriod, { id: periodId, projectId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!locked) throw new NotFoundError('PERIOD_NOT_FOUND');
      this.assertClosable(locked, await this.reads.list(projectId, tx));
      const preview = await this.preview(projectId, periodId, tx);
      const [project] = await tx.find(ProjectDailySnapshot, { projectId, date: locked.endDate });
      const items = await tx.find(WbsItemDailySnapshot, { projectId, date: locked.endDate }, { orderBy: { wbsItemId: 'asc' } });
      const now = this.clock.now();
      tx.create(PeriodSnapshot, {
        periodId,
        orgId: locked.orgId,
        projectId,
        date: locked.endDate,
        project: project ? plain(project) : {},
        items: items.map(plain),
        createdAt: now,
      });
      Object.assign(locked, {
        status: 'closed',
        closedAt: now,
        closedByUserId: actor.userId,
        closedWithPendingCount: preview.pendingItems,
        closePreview: {
          pendingItems: preview.pendingItems,
          draftCostEntries: preview.draftCostEntries,
          costsCompleteThrough: preview.costsCompleteThrough,
          costsComplete: preview.costsComplete,
        },
      });
      this.audit.record(tx, {
        action: 'period.closed',
        entityType: 'ReportingPeriod',
        entityId: periodId,
        projectId,
        after: { startDate: locked.startDate, endDate: locked.endDate, pendingItems: preview.pendingItems, draftCostEntries: preview.draftCostEntries },
      });
      await this.outbox.emit(tx, {
        type: 'PeriodClosed',
        projectId,
        payload: { v: 1, periodId, startDate: locked.startDate, endDate: locked.endDate, pendingCount: preview.pendingItems },
      });
    });
    return this.list(projectId);
  }

  private async find(em: EntityManager, projectId: string, periodId: string): Promise<ReportingPeriod> {
    const period = await em.findOne(ReportingPeriod, { id: periodId, projectId });
    if (!period) throw new NotFoundError('PERIOD_NOT_FOUND');
    return period;
  }

  private assertClosable(period: ReportingPeriod, all: readonly ReportingPeriod[]): void {
    if (period.status === 'closed') throw notClosable('این دوره از پیش بسته است.');
    if (period.endDate >= this.today()) throw notClosable('دورهٔ جاری پس از پایانش بسته می‌شود.');
    const firstOpen = all.find((entry) => entry.status === 'open');
    if (firstOpen?.id !== period.id) throw notClosable('دوره‌ها به ترتیب بسته می‌شوند؛ اول دورهٔ باز قبلی را ببندید.');
  }
}

/** ردیف snapshot ← json بی نوع Entity (مبالغ رشته). */
function plain(row: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'function'));
}
