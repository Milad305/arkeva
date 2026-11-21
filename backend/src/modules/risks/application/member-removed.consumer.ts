import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { IdentityService } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { ProjectRules } from '../../projects/index.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Risk } from '../domain/risk.entities.js';
import { RiskStore } from './risk-store.js';

// حذف مالک ریسک از پروژه ← مالکیت ریسک‌های بسته‌نشده به مدیر پروژه (risk.md ۱۱). یادداشت تاریخچه و RiskChanged برای هر
// ریسک، و یک NT-RSK-05 درون‌برنامه برای کل جابه‌جایی به مدیر پروژه (تصمیم کاربر 1405/08/25).

@Injectable()
@OnEvents({ name: 'risks.on-member-removed', events: ['MemberChanged'] })
export class RiskOwnerOnMemberRemoved implements EventConsumer {
  constructor(
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly rules: ProjectRules,
    private readonly store: RiskStore,
    private readonly notifier: Notifier,
    private readonly identity: IdentityService,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const userId = event.payload['userId'];
    if (event.payload['change'] !== 'removed' || typeof userId !== 'string' || !event.projectId) return;
    const rules = await this.rules.of(event.projectId, tx);
    if (rules.managerUserId === userId) return;
    const owned = await tx.find(Risk, { projectId: event.projectId, ownerUserId: userId, status: { $ne: 'closed' } });
    for (const risk of owned) {
      Object.assign(risk, { ownerUserId: rules.managerUserId, updatedAt: this.clock.now() });
      this.store.note(tx, risk, 'status', 'مالک از پروژه حذف شد؛ مالکیت به مدیر پروژه رسید', rules.managerUserId);
      await this.store.follow(tx, risk, [rules.managerUserId]);
      await this.outbox.emit(tx, {
        type: 'RiskChanged',
        projectId: risk.projectId,
        payload: { v: 1, riskId: risk.id, change: 'owner', status: risk.status, score: risk.score ?? null },
      });
    }
    if (owned.length === 0) return;
    const removed = (await this.identity.personRefs([userId])).get(userId)?.fullName ?? 'عضو حذف‌شده';
    const [only] = owned;
    await this.notifier.notify(tx, {
      code: 'NT-RSK-05',
      projectId: event.projectId,
      recipients: [rules.managerUserId],
      orgId: event.orgId,
      subjectId: event.id,
      title:
        owned.length === 1 && only
          ? `مالکیت ریسک ${only.code} پس از حذف ${removed} از پروژه به شما رسید.`
          : `مالکیت ${toFaDigits(owned.length)} ریسک پس از حذف ${removed} از پروژه به شما رسید.`,
      body: owned.map((risk) => risk.code).join('، '),
      link: owned.length === 1 && only ? `/projects/${event.projectId}/risks/${only.id}` : `/projects/${event.projectId}/risks`,
    });
  }
}
