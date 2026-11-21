import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { MembershipPort, ProjectCatalog } from '../../identity/index.js';
import { Notifier } from './notifier.js';

/**
 * NT-PLN-01 «بازنگری اعمال شد» به مدیر پروژه و برنامه‌ریزهای پروژه (ماتریس ج `03` ۵، PlanVersionApplied؛
 * notifications.md ۶). in_app در برش ۲؛ ایمیل با کانال‌ها (برش ۱۱).
 */
@Injectable()
@OnEvents({ name: 'notifications.on-plan-applied', events: ['PlanVersionApplied'] })
export class PlanAppliedNotifications implements EventConsumer {
  constructor(
    private readonly notifier: Notifier,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (!event.projectId) return;
    const projectId = event.projectId;
    const payload = event.payload as { number?: number; added?: number; removed?: number; changed?: number; moved?: number };
    const [members, projects] = await Promise.all([this.memberships.memberships(), this.projects.list()]);
    const recipients = members
      .filter((entry) => entry.projectId === projectId && entry.roles.some((role) => role === 'project_manager' || role === 'planner'))
      .map((entry) => entry.userId)
      // اعمال‌کننده اعلان کار خودش را نمی‌گیرد
      .filter((userId) => userId !== event.actorUserId);
    const name = projects.find((project) => project.id === projectId)?.name ?? '';
    const parts = [
      payload.added ? `${toFaDigits(payload.added)} آیتم افزوده` : null,
      payload.removed ? `${toFaDigits(payload.removed)} حذف` : null,
      payload.moved ? `${toFaDigits(payload.moved)} جابه‌جا` : null,
      payload.changed ? `${toFaDigits(payload.changed)} تغییر` : null,
    ].filter(Boolean);
    await this.notifier.notify(tx, {
      orgId: event.orgId,
      code: 'NT-PLN-01',
      projectId,
      recipients,
      subjectId: typeof event.payload['versionId'] === 'string' ? event.payload['versionId'] : event.id,
      title: `بازنگری R${toFaDigits(payload.number ?? 0)} در ${name} اعمال شد.`,
      body: parts.length > 0 ? `${parts.join('، ')}.` : 'برنامهٔ پروژه به‌روز شد.',
      link: `/projects/${projectId}/wbs`,
      eventId: event.id,
    });
  }
}
