import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { EmailSender, PushSender } from '../../../platform/messaging/channel-senders.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { DeviceTokens } from '../../identity/index.js';
import { Notification } from '../domain/notification.entity.js';

// ارسال کانال‌های بیرونی (notifications.md ۵.۲ بند ۴، ۵.۵): هر ردیف `pending` یک کار در زمان ارسالش (ساعت آرام). شکست ← تلاش
// دوباره پس از ۱، ۵ و ۳۰ دقیقه؛ پس از آن `failed` با دلیل (AC-NT-06). شکست پوش به پیامک تبدیل نمی‌شود. پیامک ۱۴۰ نویسه.

export const DELIVERY_QUEUE: QueueDef = {
  name: 'notifications.deliver',
  policy: 'standard',
  retryLimit: 0,
  retryDelaySec: 0,
  retryBackoff: false,
  expireInSeconds: 120,
  priority: 40,
  concurrency: 4,
};

/** فاصلهٔ تلاش‌های دوباره (۵.۵ `[تأییدشده]`). */
export const RETRY_MINUTES = [1, 5, 30] as const;
const SMS_MAX = 140;

interface DeliveryJob extends JobData {
  readonly orgId: string;
  readonly notificationId: string;
}

@Injectable()
export class NotificationDelivery implements OnModuleInit {
  private readonly logger = new Logger('NotificationDelivery');

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
    private readonly devices: DeviceTokens,
    private readonly sms: SmsSender,
    private readonly email: EmailSender,
    private readonly push: PushSender,
  ) {}

  onModuleInit(): void {
    this.jobs.work<DeliveryJob>(DELIVERY_QUEUE, (job) => this.deliver(job.data.notificationId).then(() => undefined));
  }

  /** درون تراکنش ساخت اعلان. */
  schedule(tx: EntityManager | null, data: { readonly orgId: string; readonly notificationId: string }, at: Date, now: Date): Promise<string | null> {
    const delaySec = Math.max(0, Math.ceil((at.getTime() - now.getTime()) / 1000));
    return this.jobs.send(tx, DELIVERY_QUEUE, data, delaySec > 0 ? { startAfterSec: delaySec } : {});
  }

  /** یک تلاش؛ نتیجه برای تست‌ها. */
  async deliver(notificationId: string): Promise<'sent' | 'retry' | 'failed' | 'skipped'> {
    const row = await this.em.findOne(Notification, { id: notificationId });
    if (!row || row.status !== 'pending') return 'skipped';
    const now = this.clock.now();
    try {
      await this.send(row);
      await this.em.nativeUpdate(
        Notification,
        { id: row.id, status: 'pending' },
        { status: 'sent', sentAt: now, attempts: row.attempts + 1, failureReason: null },
      );
      return 'sent';
    } catch (error) {
      const attempts = row.attempts + 1;
      const reason = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      const wait = RETRY_MINUTES[attempts - 1];
      if (wait === undefined) {
        this.logger.warn({ notificationId, channel: row.channel, reason }, 'notification failed permanently');
        await this.em.nativeUpdate(Notification, { id: row.id }, { status: 'failed', attempts, failureReason: reason });
        return 'failed';
      }
      const next = new Date(now.getTime() + wait * 60_000);
      await this.em.nativeUpdate(Notification, { id: row.id }, { attempts, failureReason: reason, scheduledAt: next });
      await this.schedule(null, { orgId: row.orgId, notificationId: row.id }, next, now);
      return 'retry';
    }
  }

  private async send(row: Notification): Promise<void> {
    const contact = (await this.devices.contacts([row.userId])).get(row.userId);
    if (!contact) throw new Error('گیرنده فعال نیست');
    if (row.channel === 'sms') {
      const text = `${row.title}${row.body ? `\n${row.body}` : ''}`;
      await this.sms.send({ to: contact.mobile, text: text.length > SMS_MAX ? `${text.slice(0, SMS_MAX - 1)}…` : text });
      return;
    }
    if (row.channel === 'email') {
      if (!contact.email) throw new Error('نشانی ایمیل ندارد');
      await this.email.send({ to: contact.email, subject: row.title, text: `${row.body}\n\n${row.link}` });
      return;
    }
    if (row.channel === 'push') {
      if (contact.pushTokens.length === 0) throw new Error('توکن پوش فعال ندارد');
      await this.push.send({ tokens: contact.pushTokens, title: row.title, body: row.body, link: row.link });
    }
  }
}
