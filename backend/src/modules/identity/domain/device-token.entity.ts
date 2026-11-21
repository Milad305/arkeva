import { defineEntity, p } from '@mikro-orm/postgresql';

/** توکن پوش هر دستگاه (notifications.md ۴.۱ «DeviceToken را F01 نگه می‌دارد»). کاربر اپ = توکن فعال دارد. */
const DeviceTokenSchema = defineEntity({
  name: 'DeviceToken',
  tableName: 'device_token',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    userId: p.uuid(),
    platform: p.enum(['android', 'ios', 'web'] as const),
    token: p.string(),
    createdAt: p.datetime(),
    lastSeenAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
});

export class DeviceToken extends DeviceTokenSchema.class {}
DeviceTokenSchema.setClass(DeviceToken);
