import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { RETENTION_DAYS } from '../domain/rules/notification-rules.js';

/**
 * نگه‌داری ۱۸۰ روزه (notifications.md ۷ `[تأییدشده]`). تیک سازمان ندارد؛ تابع SECURITY DEFINER همهٔ سازمان‌ها را
 * با یک دستور پاک می‌کند (همان الگوی پیش‌نویس ویزارد).
 */
@Injectable()
@OnTick('PurgeTick')
export class NotificationRetention implements TickHandler {
  constructor(
    private readonly orm: MikroORM,
    private readonly clock: Clock,
  ) {}

  async onTick(): Promise<number> {
    const before = new Date(this.clock.now().getTime() - RETENTION_DAYS * 86_400_000);
    const [row] = await this.orm.em.fork().getConnection().execute<{ purged: number }[]>('select purge_old_notifications(?) as purged', [before]);
    return row?.purged ?? 0;
  }
}
