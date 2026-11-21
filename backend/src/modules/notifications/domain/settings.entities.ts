import { defineEntity, p } from '@mikro-orm/postgresql';

// تنظیم کانال‌ها (notifications.md ۴.۱، ۵.۱): ماتریس سازمان و پروژه، ترجیح کاهندهٔ کاربر به ازای گروه، ساعت آرام کاربر.

const NotificationChannelSettingSchema = defineEntity({
  name: 'NotificationChannelSetting',
  tableName: 'notification_channel_setting',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    /** تهی = پیش‌فرض سازمان (تصمیم 1405/08/24). */
    projectId: p.uuid().nullable(),
    code: p.string(),
    channel: p.enum(['in_app', 'email', 'sms', 'push'] as const),
    enabled: p.boolean(),
    updatedByUserId: p.uuid().nullable(),
    updatedAt: p.datetime(),
  },
});
export class NotificationChannelSetting extends NotificationChannelSettingSchema.class {}
NotificationChannelSettingSchema.setClass(NotificationChannelSetting);

const NotificationPreferenceSchema = defineEntity({
  name: 'NotificationPreference',
  tableName: 'notification_preference',
  properties: {
    userId: p.uuid().primary(),
    groupKey: p.string().primary(),
    orgId: p.uuid(),
    /** فقط کانال‌های خاموش‌شده (کاهنده). */
    channels: p.json<Record<string, boolean>>(),
    updatedAt: p.datetime(),
  },
});
export class NotificationPreference extends NotificationPreferenceSchema.class {}
NotificationPreferenceSchema.setClass(NotificationPreference);

const NotificationUserSettingSchema = defineEntity({
  name: 'NotificationUserSetting',
  tableName: 'notification_user_setting',
  properties: {
    userId: p.uuid().primary(),
    orgId: p.uuid(),
    quietEnabled: p.boolean().default(true),
    quietFrom: p.string().default('21:00'),
    quietTo: p.string().default('07:00'),
    updatedAt: p.datetime(),
  },
});
export class NotificationUserSetting extends NotificationUserSettingSchema.class {}
NotificationUserSettingSchema.setClass(NotificationUserSetting);
