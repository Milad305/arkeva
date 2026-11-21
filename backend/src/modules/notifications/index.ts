// API عمومی ماژول notifications (docs/backend/03 ۵).
import { Notification } from './domain/notification.entity.js';
import { NotificationChannelSetting, NotificationPreference, NotificationUserSetting } from './domain/settings.entities.js';

export { NotificationsModule } from './notifications.module.js';
export { MyNotifications } from './application/my-notifications.js';
export { Notifier, type NotifyInput, type NotifyResult } from './application/notifier.js';

const ENTITIES = [Notification, NotificationChannelSetting, NotificationPreference, NotificationUserSetting];
export const NOTIFICATIONS_ENTITIES = ENTITIES;
export const NOTIFICATIONS_TENANT_ENTITIES = ENTITIES;
