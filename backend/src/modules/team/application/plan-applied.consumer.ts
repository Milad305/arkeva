import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { assignableReason } from '../domain/routing.js';
import { WbsAssignmentHistory } from '../domain/team.entities.js';
import { TeamPlanPort } from './team-ports.js';

/**
 * پس از اعمال نسخه (team-assignment.md ۷: F04 ←): تخصیص برگی که حذف شد، والد شد یا زمانی شد بسته می‌شود و ستون
 * سرپرستش پاک (D03-الف). برگ تازه بی‌سرپرست است. بی اعلان: کار تغییر ساختار است، نه تخصیص.
 */
@Injectable()
@OnEvents({ name: 'team.on-plan-applied', events: ['PlanVersionApplied'] })
export class PlanAppliedAssignments implements EventConsumer {
  constructor(
    private readonly clock: Clock,
    private readonly plan: TeamPlanPort,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (!event.projectId) return;
    const projectId = event.projectId;
    const items = new Map((await this.plan.items(projectId, tx)).map((item) => [item.id, item]));
    const open = await tx.find(WbsAssignmentHistory, { projectId, toAt: null });
    const stale = open.filter((row) => {
      const item = items.get(row.wbsItemId);
      return !item || assignableReason(item) !== null || item.supervisorUserId !== row.supervisorUserId;
    });
    if (stale.length === 0) return;
    const now = this.clock.now();
    for (const row of stale) row.toAt = now;
    const clear = stale
      .map((row) => items.get(row.wbsItemId))
      .filter((item) => !!item && !!item.supervisorUserId && assignableReason(item) !== null)
      .map((item) => item?.id as string);
    if (clear.length > 0) await this.plan.setSupervisor(tx, projectId, clear, null);
  }
}
