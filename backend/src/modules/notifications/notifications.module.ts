import { AlertRaisedNotifications } from './application/alert-raised.consumer.js';
import { Global, Module } from '@nestjs/common';
import { AccountNotifications, IdentityModule } from '../identity/index.js';
import { ProjectNotificationMatrix } from '../projects/application/settings-ports.js';
import { NotificationSettingsController } from './api/notification-settings.controller.js';
import { NotificationDelivery } from './application/notification-delivery.js';
import { NotificationSettings } from './application/notification-settings.js';
import { NotificationsController } from './api/notifications.controller.js';
import { DeadLetterNotifications } from './application/dead-letter.consumer.js';
import { MyNotifications } from './application/my-notifications.js';
import { NotificationRetention } from './application/notification-retention.js';
import { Notifier } from './application/notifier.js';
import { PlanAppliedNotifications } from './application/plan-applied.consumer.js';
import { ProjectActivatedNotifications } from './application/project-activated.consumer.js';

// F13 — اعلان‌ها (پایه: درون‌برنامه). مالک Notification. سراسری چون ویژگی‌های بالاتر (تیم، گزارش کارگاه،
// هشدار، ریسک) فقط از راه Notifier اعلان می‌سازند (notifications.md ۱: تنها مسیر ارسال).
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [
    Notifier,
    NotificationSettings,
    { provide: AccountNotifications, useExisting: NotificationSettings },
    { provide: ProjectNotificationMatrix, useExisting: NotificationSettings },
    NotificationDelivery,
    DeadLetterNotifications,
    MyNotifications,
    NotificationRetention,
    PlanAppliedNotifications,
    ProjectActivatedNotifications,
    AlertRaisedNotifications,
  ],
  exports: [Notifier, MyNotifications, NotificationSettings, AccountNotifications, ProjectNotificationMatrix, NotificationDelivery],
})
export class NotificationsModule {}
