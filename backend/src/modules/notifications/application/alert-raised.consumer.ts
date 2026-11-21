import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { AccessResolver } from '../../../platform/security/access.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { AlertTexts } from '../../alerts/reads.js';
import { Notifier } from './notifier.js';

// هشدار تازه یا ارتقایافته ← اعلان (04-alert-engine ۵؛ notifications.md ۵.۲). گیرندگان را قاعده ساخته (مخاطب ۲.۵)؛ کسی که در
// پروژه `cbs.view_amounts` ندارد متن بی مبلغ می‌گیرد (AC-AL-07، AC-NT-07). کلید dedupe شدت را دارد، پس ارتقا اعلان تازه است
// و تکرار نه (AC-NT-03). کانال‌های ایمیل، پیامک و پوش با برش ۱۲ب.

@Injectable()
@OnEvents({ name: 'notifications.on-alert-raised', events: ['AlertRaised'] })
export class AlertRaisedNotifications implements EventConsumer {
  constructor(
    private readonly notifier: Notifier,
    private readonly texts: AlertTexts,
    private readonly access: AccessResolver,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const alertId = event.payload['alertId'];
    const recipients = event.payload['recipients'];
    if (typeof alertId !== 'string' || !Array.isArray(recipients)) return;
    const alert = await this.texts.get(alertId, tx);
    if (!alert) return;
    const withAmounts: string[] = [];
    const without: string[] = [];
    for (const userId of recipients.filter((entry): entry is string => typeof entry === 'string')) {
      const access = await this.access.resolve({ userId, orgId: event.orgId, sessionId: '00000000-0000-7000-8000-000000000000', client: 'web' });
      const sees = access.isOrgAdmin || (!!alert.projectId && (access.projects.get(alert.projectId)?.has('cbs.view_amounts') ?? false));
      (sees ? withAmounts : without).push(userId);
    }
    const base = {
      orgId: event.orgId,
      code: alert.ruleCode,
      projectId: alert.projectId,
      subjectId: alert.id,
      title: alert.title,
      link: alert.link,
      severity: alert.severity,
      alertId: alert.id,
      eventId: event.id,
    };
    if (withAmounts.length > 0) await this.notifier.notify(tx, { ...base, recipients: withAmounts, body: alert.guidance });
    if (without.length > 0) await this.notifier.notify(tx, { ...base, recipients: without, body: alert.guidanceSafe });
  }
}
