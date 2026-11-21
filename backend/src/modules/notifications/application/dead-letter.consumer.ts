import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type DeadLetterFailure, Jobs } from '../../../platform/jobs/jobs.js';
import { DeviceTokens } from '../../identity/index.js';
import { Notifier } from './notifier.js';

// کار dead ← اعلان NT-SYS-01 به مدیران سازمان (12-implementation-plan برش ۱۲؛ §۷.۲ ردیف ۲۶؛ کد `[پیش‌فرض فنی]`). موضوع
// dedupe نام صف است تا شکست‌های پیاپی یک صف در پنجرهٔ dedupe یک اعلان بسازند. کار سراسری (تیک، بی orgId) سازمان ندارد و
// فقط در لاگ و /ready دیده می‌شود.

export const DEAD_LETTER_CODE = 'NT-SYS-01';

@Injectable()
export class DeadLetterNotifications implements OnModuleInit {
  private readonly logger = new Logger('DeadLetterNotifications');

  constructor(
    private readonly jobs: Jobs,
    private readonly em: EntityManager,
    private readonly devices: DeviceTokens,
    private readonly notifier: Notifier,
  ) {}

  onModuleInit(): void {
    this.jobs.onDeadLetter((failure) => this.handle(failure));
  }

  async handle(failure: DeadLetterFailure): Promise<void> {
    const orgId = failure.orgId;
    if (!orgId) {
      this.logger.warn({ queue: failure.queue, jobId: failure.jobId }, 'system job dead; no org to notify');
      return;
    }
    const admins = await this.devices.orgAdminIds();
    if (admins.length === 0) return;
    await this.em.fork().transactional((tx) =>
      this.notifier.notify(tx, {
        code: DEAD_LETTER_CODE,
        projectId: null,
        recipients: admins,
        subjectId: failure.queue,
        title: 'یک کار پس‌زمینه انجام نشد',
        body: `کار صف ${failure.queue} پس از همهٔ تلاش‌ها ناموفق ماند. وضعیت سامانه را بررسی کنید یا با پشتیبانی تماس بگیرید.`,
        link: '/dashboard', // صفحهٔ تنظیمات سازمان هنوز در پنل نیست
        severity: 'warning',
        orgId,
      }),
    );
  }
}
