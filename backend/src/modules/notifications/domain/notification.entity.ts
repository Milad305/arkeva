import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase } from '../../../platform/database/base-properties.js';

export const NOTIFICATION_CATEGORIES = ['approvals', 'risks', 'system'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

/**
 * Notification — عملیاتی (`02` ۱۰؛ notifications.md ۴.۱). هر گیرنده × کانال یک ردیف. در برش ۲ فقط `in_app`
 * ساخته می‌شود و همان لحظه `sent` است؛ ایمیل، پیامک و پوش با ارائه‌دهنده‌ها در برش ۱۱.
 * `mergedCount` > ۰ یعنی ردیف ادغامی «N اعلان تازه» (۵.۳).
 */
const NotificationSchema = defineEntity({
  name: 'Notification',
  tableName: 'notification',
  properties: {
    ...mutableBase(),
    userId: p.uuid(),
    projectId: p.uuid().nullable(),
    code: p.string(),
    category: p.enum(NOTIFICATION_CATEGORIES),
    severity: p.enum(NOTIFICATION_SEVERITIES).nullable(),
    channel: p.enum(['in_app', 'email', 'sms', 'push'] as const).default('in_app'),
    status: p.enum(['pending', 'sent', 'failed', 'read'] as const).default('sent'),
    title: p.string(),
    body: p.text(),
    link: p.string(),
    subjectId: p.string().nullable(),
    alertId: p.uuid().nullable(),
    eventId: p.uuid().nullable(),
    dedupeKey: p.string(),
    groupKey: p.string(),
    mergedCount: p.integer().default(0),
    attempts: p.integer().default(0),
    failureReason: p.text().nullable(),
    /** زمان ارسال کانال بیرونی: ساعت آرام و تلاش دوباره (۵.۴، ۵.۵). */
    scheduledAt: p.datetime().nullable(),
    sentAt: p.datetime().nullable(),
    readAt: p.datetime().nullable(),
  },
});

export class Notification extends NotificationSchema.class {}
NotificationSchema.setClass(Notification);
