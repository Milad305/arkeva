import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { computeProject, type ComputeOutput } from '../domain/compute-project.js';
import { CbsItemProgress, ComputeRun, ProjectDailySnapshot, ProjectProgress, WbsItemDailySnapshot, WbsItemProgress } from '../domain/progress.entities.js';
import { type ComputeFacts, ComputeFactsLoader } from './compute-facts.js';
import { PeriodReads } from './period-reads.js';

// اجرای بازمحاسبهٔ یک پروژه (progress-calculation.md ۵.۱، ۵.۷؛ D07): واقعیت‌ها ← فرمول‌ها ← جدول‌های مشتق از نو، در یک
// تراکنش؛ سپس ComputeFinished. اجرای ناموفق مقدار قبلی را نگه می‌دارد و `computeState = failed` می‌گذارد (۱۰).

const CHUNK = 1000;

@Injectable()
export class RecomputeProject {
  private readonly logger = new Logger('RecomputeProject');

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly facts: ComputeFactsLoader,
    private readonly periods: PeriodReads,
  ) {}

  /** اجرای در صف پروژه را برمی‌دارد و انجام می‌دهد؛ بی اجرای در صف کاری نیست (رویدادها تجمیع شده‌اند). */
  async runQueued(projectId: string): Promise<boolean> {
    const run = await this.em.transactional(async (tx) => {
      const queued = await tx.findOne(ComputeRun, { projectId, status: 'queued' });
      if (!queued) return null;
      Object.assign(queued, { status: 'running', startedAt: this.clock.now() });
      return { id: queued.id, fromDate: queued.fromDate ?? null };
    });
    if (!run) return false;
    try {
      await this.recompute(projectId, run.fromDate, run.id);
      await this.em.nativeUpdate(ComputeRun, { id: run.id }, { status: 'done', finishedAt: this.clock.now() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ err: error, projectId, runId: run.id }, 'recompute failed');
      await this.em.nativeUpdate(ComputeRun, { id: run.id }, { status: 'failed', finishedAt: this.clock.now(), error: message.slice(0, 2000) });
      await this.em.nativeUpdate(ProjectProgress, { projectId }, { computeState: 'failed', lastError: message.slice(0, 2000) });
    }
    return true;
  }

  /** بازمحاسبهٔ کامل؛ snapshotها از `fromDate` (یا اولین روز جاافتاده) تا تاریخ داده. */
  async recompute(projectId: string, fromDate: string | null, runId: string | null = null): Promise<ComputeOutput | null> {
    return this.em.transactional(async (tx) => {
      const facts = await this.facts.load(tx, projectId);
      if (!facts) return null;
      const dataDate = tehranClock(this.clock.now()).date;
      const from = await this.snapshotFrom(tx, projectId, fromDate);
      const output = computeProject({
        model: facts.model,
        dataDate,
        fromDate: from,
        thresholds: { warning: facts.rules.progress.warningThreshold, critical: facts.rules.progress.criticalThreshold },
        eacMethod: facts.rules.progress.eacMethod,
        costsCompleteThrough: facts.rules.progress.costsCompleteThrough,
        currentCbs: facts.currentCbs,
        currentLinks: facts.currentLinks,
        referenceCbs: facts.referenceCbs,
        referenceLinks: facts.referenceLinks,
        costs: facts.costs,
        pendingPercent: facts.pendingPercent,
        lastApprovedAt: facts.lastApprovedAt,
      });
      await this.write(tx, facts, output, dataDate, from);
      await this.outbox.emit(tx, {
        type: 'ComputeFinished',
        projectId,
        payload: { v: 1, runId, dataDate, fromDate: output.snapshots[0]?.date ?? null },
      });
      return output;
    });
  }

  /** ردیف‌های قبلی تا روز پیش از `fromDate` دست نمی‌خورند (AC-PC-04)؛ روز جاافتاده (تیک از دست‌رفته) هم پر می‌شود. */
  private async snapshotFrom(tx: EntityManager, projectId: string, fromDate: string | null): Promise<string | null> {
    // ردیف‌های دورهٔ بسته هرگز نوشته نمی‌شوند؛ اثر از اولین روز دورهٔ باز (۵.۷؛ AC-PC-05)
    const closedEnd = await this.periods.lastClosedEnd(projectId, tx);
    const floor = closedEnd ? addDays(closedEnd, 1) : null;
    const clamp = (date: string | null) => (floor && (date === null || date < floor) ? floor : date);
    if (fromDate === null) return clamp(null);
    const [latest] = await tx.find(ProjectDailySnapshot, { projectId }, { orderBy: { date: 'desc' }, limit: 1, fields: ['date'] });
    if (!latest) return clamp(null);
    const next = addDays(latest.date, 1);
    return clamp(next < fromDate ? next : fromDate);
  }

  private async write(tx: EntityManager, facts: ComputeFacts, output: ComputeOutput, dataDate: string, from: string | null): Promise<void> {
    const projectId = facts.rules.id;
    const orgId = facts.rules.orgId;
    const now = this.clock.now();
    const scope = { orgId, projectId };

    await tx.nativeDelete(WbsItemProgress, { projectId });
    await insertChunks(
      tx,
      WbsItemProgress,
      output.items.map((row) => ({
        ...scope,
        ...row,
        bac: row.bac.toString(),
        pv: row.pv.toString(),
        ev: row.ev.toString(),
        dataDate,
        lastApprovedAt: row.lastApprovedAt ? new Date(row.lastApprovedAt) : null,
        computedAt: now,
      })),
    );

    const p = output.project;
    const values = {
      dataDate,
      plannedPercent: p.plannedPercent,
      actualPercent: p.actualPercent,
      financialPercent: p.financialPercent,
      bac: p.bac.toString(),
      pv: p.pv.toString(),
      ev: p.ev.toString(),
      ac: p.ac.toString(),
      cv: p.cv.toString(),
      sv: p.sv.toString(),
      eac: p.eac.toString(),
      vac: p.vac.toString(),
      cpi: p.cpi,
      spi: p.spi,
      tcpi: p.tcpi,
      eacLowConfidence: p.eacLowConfidence,
      forecastFinish: p.forecastFinish,
      delayDays: p.delayDays,
      costIndicesDate: p.costIndicesDate,
      unallocatedBudget: p.unallocatedBudget.toString(),
      leafCounts: p.leafCounts,
      outOfReference: p.outOfReference,
      computeState: 'fresh' as const,
      pendingCount: facts.pendingCount,
      lastError: null,
      computedAt: now,
    };
    await tx.upsert(ProjectProgress, { projectId, orgId, ...values }, { onConflictFields: ['projectId'], onConflictAction: 'merge' });

    await tx.nativeDelete(CbsItemProgress, { projectId });
    await insertChunks(
      tx,
      CbsItemProgress,
      [...output.cbs].map(([cbsItemId, row]) => ({
        ...scope,
        cbsItemId,
        dataDate,
        costIndicesDate: p.costIndicesDate,
        ac: row.ac.toString(),
        consumedPercent: row.consumedPercent,
        ev: row.ev.toString(),
        cpi: row.cpi,
        eac: row.eac.toString(),
        eacVariancePercent: row.eacVariancePercent,
        eacLowConfidence: row.eacLowConfidence,
        consumedQuantity: row.consumedQuantity,
        earnedQuantity: row.earnedQuantity,
        excessQuantity: row.excessQuantity,
        computedAt: now,
      })),
    );

    // فقط از `from` به بعد (بازسازی کامل بی دورهٔ بسته: همه)؛ ردیف‌های دورهٔ بسته دست نمی‌خورند
    await tx.nativeDelete(WbsItemDailySnapshot, from ? { projectId, date: { $gte: from } } : { projectId });
    await tx.nativeDelete(ProjectDailySnapshot, from ? { projectId, date: { $gte: from } } : { projectId });
    await insertChunks(
      tx,
      ProjectDailySnapshot,
      output.snapshots.map((day) => ({
        ...scope,
        date: day.date,
        ...day.project,
        bac: day.project.bac.toString(),
        pv: day.project.pv.toString(),
        ev: day.project.ev.toString(),
        ac: day.project.ac.toString(),
        eac: day.project.eac.toString(),
      })),
    );
    await insertChunks(
      tx,
      WbsItemDailySnapshot,
      output.snapshots.flatMap((day) =>
        day.items.map((row) => ({ ...scope, date: day.date, ...row, bac: row.bac.toString(), pv: row.pv.toString(), ev: row.ev.toString() })),
      ),
    );
  }
}

async function insertChunks<T extends object>(tx: EntityManager, entity: new () => T, rows: readonly Record<string, unknown>[]): Promise<void> {
  for (let index = 0; index < rows.length; index += CHUNK) {
    const chunk = rows.slice(index, index + CHUNK);
    if (chunk.length > 0) await tx.insertMany(entity, chunk);
  }
}
