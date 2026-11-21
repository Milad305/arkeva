import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { FieldRecords } from '../../field/index.js';

/**
 * پس از اعمال نسخه (approval-workflow.md ۶: F04 ←): آیتم‌های در گردشِ برگ‌های حذف‌شده `needs_resolution` با علت
 * «برگ حذف شده» می‌شوند؛ مرحلهٔ بازشان می‌ماند تا تأییدکننده تعیین تکلیف کند (۴.۸).
 */
@Injectable()
@OnEvents({ name: 'approvals.on-plan-applied', events: ['PlanVersionApplied'] })
export class PlanAppliedReports implements EventConsumer {
  constructor(private readonly records: FieldRecords) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const removed = event.payload['removedItemIds'];
    if (!event.projectId || !Array.isArray(removed) || removed.length === 0) return;
    const items = await this.records.items(tx, { projectId: event.projectId, wbsItemIds: removed as string[], statuses: ['stage1', 'stage2', 'submitted'] });
    for (const item of items)
      this.records.transition(item, { status: 'needs_resolution', currentStage: 1, flags: ['needs_resolution'], resolution: 'leaf_removed' });
  }
}
