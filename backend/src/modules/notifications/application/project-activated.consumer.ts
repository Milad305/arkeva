import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { MembershipPort, ProjectCatalog } from '../../identity/index.js';
import { Notifier } from './notifier.js';

/** NT-PRJ-01 «پروژه فعال شد» به اعضای پروژه، نه فعال‌کننده (ماتریس ج `03` ۵، ProjectActivated `[تأییدشده]`). */
@Injectable()
@OnEvents({ name: 'notifications.on-project-activated', events: ['ProjectActivated'] })
export class ProjectActivatedNotifications implements EventConsumer {
  constructor(
    private readonly notifier: Notifier,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (!event.projectId) return;
    const projectId = event.projectId;
    const [members, projects] = await Promise.all([this.memberships.memberships(), this.projects.list()]);
    const recipients = members
      .filter((entry) => entry.projectId === projectId)
      .map((entry) => entry.userId)
      .filter((userId) => userId !== event.actorUserId);
    const name = projects.find((project) => project.id === projectId)?.name ?? '';
    await this.notifier.notify(tx, {
      orgId: event.orgId,
      code: 'NT-PRJ-01',
      projectId,
      recipients,
      subjectId: projectId,
      title: `پروژهٔ ${name} فعال شد و گزارش‌گیری شروع شد.`,
      body: 'برنامهٔ مبنا ثبت شد.',
      link: `/projects/${projectId}`,
      eventId: event.id,
    });
  }
}
