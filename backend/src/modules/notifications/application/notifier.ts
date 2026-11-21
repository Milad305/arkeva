import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { DeviceTokens, IdentityService, MembershipPort, ProjectCatalog } from '../../identity/index.js';
import { type Channel, channelsFor, deliveryTime } from '../domain/rules/channels.js';
import { Notification, type NotificationSeverity } from '../domain/notification.entity.js';
import { categoryOf, DEDUPE_WINDOW_MS, dedupeKeyOf, groupKeyOf, MERGE_WINDOW_MS, mergeDecision } from '../domain/rules/notification-rules.js';
import { NotificationDelivery } from './notification-delivery.js';
import { NotificationSettings } from './notification-settings.js';

// تنها مسیر ساخت اعلان (notifications.md ۱، ۵.۲؛ D09). ویژگی‌ها از مصرف‌کنندهٔ رویداد یا قاعدهٔ هشدار در همان
// تراکنش این را صدا می‌زنند. هر گیرنده × کانال یک ردیف: in_app همان لحظه (با dedupe و ادغام)، ایمیل، پیامک و پوش `pending` با
// زمان ارسال (ساعت آرام) و کار صف پس از commit (برش ۱۲ب؛ ماتریس، ترجیح کاهنده، فوری بودن پیامک و کاربر اپ بودن پوش).

export interface NotifyInput {
  /** کد رویداد یا قاعده: `NT-APR-01`، `AL-PRG-01`… */
  readonly code: string;
  readonly projectId: string | null;
  /** گیرندگان را فراخواننده با نقش و دامنهٔ دیدن موضوع انتخاب کرده است (۵.۲ بند ۲). */
  readonly recipients: readonly string[];
  /** موضوع برای dedupe: شناسهٔ گزارش، آیتم، ریسک… */
  readonly subjectId: string;
  readonly title: string;
  readonly body: string;
  /** مسیر داخلی صفحهٔ موضوع. */
  readonly link: string;
  readonly severity?: NotificationSeverity | null;
  readonly alertId?: string | null;
  readonly eventId?: string | null;
  /** فقط وقتی زمینه سازمان ندارد (مصرف‌کننده، تیک). */
  readonly orgId?: string;
  /** پنجرهٔ dedupe جز پیش‌فرض یک ساعت (۵.۳)؛ خلاصه و یادآوری روزانه ۲۴ ساعت. */
  readonly dedupeWindowMs?: number;
}

export interface NotifyResult {
  readonly created: number;
  readonly merged: number;
  readonly skipped: number;
}

@Injectable()
export class Notifier {
  constructor(
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly identity: IdentityService,
    private readonly projects: ProjectCatalog,
    private readonly devices: DeviceTokens,
    private readonly moduleRef: ModuleRef,
    private readonly settings: NotificationSettings,
    private readonly delivery: NotificationDelivery,
  ) {}

  /** team (پیاده‌سازی MembershipPort) خودش Notifier را صدا می‌زند؛ گرفتن تنبل چرخهٔ DI را می‌شکند. */
  private memberships(): MembershipPort {
    return this.moduleRef.get(MembershipPort, { strict: false });
  }

  async notify(tx: EntityManager, input: NotifyInput): Promise<NotifyResult> {
    if (!tx.isInTransaction()) throw new Error('اعلان فقط درون تراکنش تغییر اصلی ساخته می‌شود (D07)');
    const orgId = input.orgId ?? this.context.orgId;
    if (!orgId) throw new Error(`اعلان ${input.code} سازمان ندارد`);
    const result = { created: 0, merged: 0, skipped: 0 };

    // پروژهٔ بایگانی‌شده اعلان نمی‌سازد (۱۰)
    if (input.projectId) {
      const project = (await this.projects.list()).find((entry) => entry.id === input.projectId);
      if (!project || project.status === 'archived') return { ...result, skipped: input.recipients.length };
    }
    const recipients = [...new Set(input.recipients)];
    const active = await this.identity.activeUserIds(recipients);
    const now = this.clock.now();
    const severity = input.severity ?? null;
    const groupKey = groupKeyOf(input.code, input.projectId);
    const live = recipients.filter((userId) => active.has(userId));
    result.skipped += recipients.length - live.length;
    const [contacts, prefs, matrix, roles] = await Promise.all([
      this.devices.contacts(live),
      this.settings.recipientSettings(live, input.code, tx),
      this.settings.matrixFor(input.projectId, [input.code], tx),
      this.memberships().memberships(live),
    ]);

    for (const userId of live) {
      const contact = contacts.get(userId);
      const pref = prefs.get(userId);
      const projectRoles = roles.filter((entry) => entry.userId === userId && entry.projectId === input.projectId).flatMap((entry) => entry.roles);
      const channels = channelsFor(
        input.code,
        severity,
        {
          pmOrFinance: projectRoles.includes('project_manager') || projectRoles.includes('finance'),
          hasEmail: !!contact?.email,
          appUser: (contact?.pushTokens.length ?? 0) > 0,
          off: pref?.off ?? new Set(),
        },
        matrix.get(input.code) ?? null,
      );
      for (const channel of channels) {
        if (channel !== 'in_app') await this.external(tx, { orgId, userId, channel, input, severity, groupKey, now, quiet: pref?.quiet ?? null });
      }
      if (!channels.includes('in_app')) continue;
      // دو رویداد هم‌زمان برای یک کاربر: dedupe و ادغام پشت سر هم
      await tx.getConnection().execute('select pg_advisory_xact_lock(hashtext(?))', [`notification:${userId}`], 'all', tx.getTransactionContext());
      const dedupeKey = dedupeKeyOf({ userId, code: input.code, subjectId: input.subjectId, severity, channel: 'in_app' });
      const duplicate = await tx.count(Notification, {
        userId,
        dedupeKey,
        createdAt: { $gt: new Date(now.getTime() - (input.dedupeWindowMs ?? DEDUPE_WINDOW_MS)) },
      });
      if (duplicate > 0) {
        result.skipped += 1;
        continue;
      }
      const since = new Date(now.getTime() - MERGE_WINDOW_MS);
      const recent = await tx.find(Notification, { userId, groupKey, channel: 'in_app', createdAt: { $gt: since } }, { fields: ['id', 'mergedCount'] });
      const decision = mergeDecision(recent);
      if (decision.kind === 'add_to_merged') {
        const merged = await tx.findOneOrFail(Notification, { id: decision.mergedId });
        merged.mergedCount += 1;
        merged.title = `${toFaDigits(merged.mergedCount)} اعلان تازه: ${input.title}`;
        merged.createdAt = now;
        merged.readAt = null;
        merged.status = 'sent';
        result.merged += 1;
        continue;
      }
      const opening = decision.kind === 'open_merged';
      tx.create(Notification, {
        id: newId(),
        orgId,
        userId,
        projectId: input.projectId,
        code: input.code,
        category: categoryOf(input.code),
        severity,
        channel: 'in_app',
        status: 'sent',
        title: opening ? `${toFaDigits(1)} اعلان تازه: ${input.title}` : input.title,
        body: opening ? 'چند اعلان هم‌نوع پشت سر هم رسید؛ برای جزئیات صفحهٔ موضوع را باز کنید.' : input.body,
        link: input.link,
        subjectId: input.subjectId,
        alertId: input.alertId ?? null,
        eventId: input.eventId ?? null,
        dedupeKey,
        groupKey,
        mergedCount: opening ? 1 : 0,
        attempts: 1,
        failureReason: null,
        sentAt: now,
        readAt: null,
        createdAt: now,
      });
      result.created += 1;
    }
    return result;
  }

  /** ردیف کانال بیرونی `pending` و کار ارسال پس از commit (۵.۲ بند ۴)؛ dedupe به ازای کانال (۵.۳). */
  private async external(
    tx: EntityManager,
    args: {
      readonly orgId: string;
      readonly userId: string;
      readonly channel: Channel;
      readonly input: NotifyInput;
      readonly severity: NotificationSeverity | null;
      readonly groupKey: string;
      readonly now: Date;
      readonly quiet: { readonly enabled: boolean; readonly from: string; readonly to: string } | null;
    },
  ): Promise<void> {
    const { userId, channel, input, severity, now } = args;
    const dedupeKey = dedupeKeyOf({ userId, code: input.code, subjectId: input.subjectId, severity, channel });
    if ((await tx.count(Notification, { userId, dedupeKey, createdAt: { $gt: new Date(now.getTime() - (input.dedupeWindowMs ?? DEDUPE_WINDOW_MS)) } })) > 0)
      return;
    const scheduledAt = deliveryTime(channel, severity, args.quiet ?? { enabled: true, from: '21:00', to: '07:00' }, now);
    const row = tx.create(Notification, {
      id: newId(),
      orgId: args.orgId,
      userId,
      projectId: input.projectId,
      code: input.code,
      category: categoryOf(input.code),
      severity,
      channel,
      status: 'pending',
      title: input.title,
      body: input.body,
      link: input.link,
      subjectId: input.subjectId,
      alertId: input.alertId ?? null,
      eventId: input.eventId ?? null,
      dedupeKey,
      groupKey: args.groupKey,
      mergedCount: 0,
      attempts: 0,
      failureReason: null,
      scheduledAt,
      sentAt: null,
      readAt: null,
      createdAt: now,
    });
    await this.delivery.schedule(tx, { orgId: args.orgId, notificationId: row.id }, scheduledAt, now);
  }
}
