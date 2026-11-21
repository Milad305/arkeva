import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { leafBacOf, PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { PlanVersionCurve } from '../domain/curve.entity.js';
import { type CurveRow, versionCurve } from '../domain/formulas/curve.js';
import { type ModelNode, rial } from '../domain/formulas/engine.js';

// ساخت و خواندن PlanVersionCurve (charts.md ۵). با PlanVersionApplied ساخته می‌شود؛ نسخه‌ای که پیش از این برش اعمال شده، در
// نخستین خواندن (همان تقویم فعلی). ساخته‌شده هرگز بازنویسی نمی‌شود.

@Injectable()
export class PlanCurves {
  constructor(
    private readonly em: EntityManager,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
  ) {}

  /** ردیف‌های روزانهٔ نسخه؛ نبود ← ساخت. */
  async rows(projectId: string, versionId: string): Promise<CurveRow[]> {
    const stored = await this.em.find(PlanVersionCurve, { planVersionId: versionId }, { orderBy: { date: 'asc' } });
    if (stored.length > 0) return stored.map(toRow);
    return this.em.transactional((tx) => this.ensure(tx, projectId, versionId));
  }

  /** درون تراکنش فراخوان؛ هم‌زمانی با قفل مشورتی نسخه. */
  async ensure(tx: EntityManager, projectId: string, versionId: string): Promise<CurveRow[]> {
    await tx.getConnection().execute('select pg_advisory_xact_lock(hashtext(?))', [`plan_curve:${versionId}`], 'all', tx.getTransactionContext());
    const existing = await tx.find(PlanVersionCurve, { planVersionId: versionId }, { orderBy: { date: 'asc' } });
    if (existing.length > 0) return existing.map(toRow);
    const [rules, content] = await Promise.all([this.rules.of(projectId, tx), this.planning.versionContent(versionId)]);
    const bac = leafBacOf(content);
    const nodes: ModelNode[] = content.wbs.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      isLeaf: node.isLeaf,
      isMilestone: node.isMilestone,
      weight: Number(node.weightInParent),
      plannedStart: node.plannedStart,
      plannedFinish: node.plannedFinish,
      bac: node.isLeaf ? (bac.get(node.id) ?? 0n) : 0n,
    }));
    const rows = versionCurve(nodes, rules.calendar);
    for (const row of rows) {
      tx.create(PlanVersionCurve, {
        planVersionId: versionId,
        date: row.date,
        orgId: rules.orgId,
        projectId,
        plannedPercent: Math.round(row.planned * 10_000) / 10_000,
        pv: rial(row.pv).toString(),
        cumulativeBac: rial(row.bac).toString(),
      });
    }
    return rows;
  }
}

function toRow(row: PlanVersionCurve): CurveRow {
  return { date: row.date, planned: Number(row.plannedPercent), pv: Number(row.pv), bac: Number(row.cumulativeBac) };
}

/** PlanVersionApplied ← منحنی همان نسخه با تقویم همین لحظه. */
@Injectable()
@OnEvents({ name: 'computation.on-plan-applied-curve', events: ['PlanVersionApplied'] })
export class PlanCurveOnApplied implements EventConsumer {
  constructor(private readonly curves: PlanCurves) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const versionId = event.payload['versionId'];
    if (typeof versionId !== 'string' || !event.projectId) return;
    await this.curves.ensure(tx, event.projectId, versionId);
  }
}
