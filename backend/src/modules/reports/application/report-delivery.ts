import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Clock } from '../../../platform/clock/clock.js';
import { EmailSender } from '../../../platform/messaging/channel-senders.js';
import { ObjectStorage } from '../../../platform/storage/object-storage.js';
import { Notifier } from '../../notifications/index.js';
import { type GeneratedReport, ReportSchedule } from '../domain/report.entities.js';

// تحویل گزارش ساخته‌شده (management-reports.md ۷.۴): کاربر داخلی NT-RPT-01 (درون‌برنامه و ایمیل با لینک نیازمند ورود؛ کانال‌ها
// با F13)؛ گیرندهٔ بیرونی ایمیل با لینک امضاشدهٔ ۷ روزه و پیوست اگر ≤ ۱۰ مگابایت. وضعیت آخرین اجرای زمان‌بندی همین‌جا.

const WEEK_SEC = 7 * 24 * 3600;
const MAX_ATTACHMENT = 10 * 1024 * 1024;
export const CONTENT_TYPE = { pdf: 'application/pdf', xlsx: 'application/vnd.ms-excel' } as const;
export const EXTENSION = { pdf: 'pdf', xlsx: 'xls' } as const;

@Injectable()
export class ReportDelivery {
  private readonly logger = new Logger(ReportDelivery.name);

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly config: AppConfig,
    private readonly storage: ObjectStorage,
    private readonly email: EmailSender,
    private readonly notifier: Notifier,
  ) {}

  fileName(row: GeneratedReport): string {
    return `${row.templateName} - ${row.rangeLabel}.${EXTENSION[row.format]}`;
  }

  /** درون تراکنش «آماده شد»: اعلان درخواست‌کننده و گیرندگان داخلی. */
  async notifyReady(tx: EntityManager, row: GeneratedReport): Promise<void> {
    const recipients = [...new Set([...(row.requestedByUserId ? [row.requestedByUserId] : []), ...row.deliveries.users])];
    if (recipients.length === 0) return;
    await this.notifier.notify(tx, {
      code: 'NT-RPT-01',
      projectId: row.projectId ?? null,
      recipients,
      subjectId: row.id,
      title: `گزارش «${row.templateName}» آماده است.`,
      body: `${row.scopeLabel} · ${row.rangeLabel}${row.includesAmounts ? '' : ' · نسخهٔ بی مبلغ'}`,
      link: '/reports',
    });
  }

  /** پس از commit: ایمیل گیرندگان بیرونی؛ نشانی‌های ناموفق را برمی‌گرداند. */
  async sendExternal(row: GeneratedReport): Promise<string[]> {
    if (row.deliveries.emails.length === 0 || !row.storageKey) return [];
    const fileName = this.fileName(row);
    const link = `${this.config.reports.publicBaseUrl}${await this.storage.signedUrl(row.storageKey, { ttlSec: WEEK_SEC, fileName, contentType: CONTENT_TYPE[row.format] })}`;
    const body = (row.sizeBytes ?? 0) <= MAX_ATTACHMENT ? await this.storage.get(row.storageKey) : null;
    const failed: string[] = [];
    for (const to of row.deliveries.emails) {
      try {
        await this.email.send({
          to,
          subject: `${row.templateName} — ${row.rangeLabel}`,
          text: `گزارش «${row.templateName}» (${row.scopeLabel}، ${row.rangeLabel}) آماده است.\nدریافت فایل تا ۷ روز: ${link}\nتولید خودکار در پروژه‌یار.`,
          ...(body ? { attachments: [{ fileName, contentType: CONTENT_TYPE[row.format], content: body }] } : {}),
        });
      } catch (error) {
        this.logger.warn({ err: error, reportId: row.id }, 'report email failed');
        failed.push(to);
      }
    }
    return failed;
  }

  /** نتیجهٔ اجرای زمان‌بندی (۷.۴؛ AC-MR-10): ناموفق ← یادداشت و اعلان به سازنده. */
  async scheduleOutcome(scheduleId: string | null, outcome: { readonly ok: boolean; readonly message: string | null }): Promise<void> {
    if (!scheduleId) return;
    await this.em.transactional(async (tx) => {
      const schedule = await tx.findOne(ReportSchedule, { id: scheduleId });
      if (!schedule) return;
      Object.assign(schedule, {
        lastRunAt: this.clock.now(),
        lastRunStatus: outcome.ok ? 'ok' : 'failed',
        note: outcome.message ? { text: outcome.message, tone: outcome.ok ? 'wrn' : 'err', icon: 'circle-alert' } : null,
        updatedAt: this.clock.now(),
      });
      if (!outcome.ok) {
        await this.notifier.notify(tx, {
          code: 'NT-RPT-01',
          projectId: schedule.projectId ?? null,
          recipients: [schedule.createdByUserId],
          subjectId: schedule.id,
          title: 'اجرای زمان‌بندی گزارش ناموفق بود.',
          body: outcome.message ?? '',
          link: '/reports',
        });
      }
    });
  }
}
