import { defineEntity, p } from '@mikro-orm/postgresql';
import { INTEGRATION_SYSTEMS } from './connector.js';

// IntegrationConnection (integrations.md ۵). مالک: integrations (F19). `config` رمزنگاری‌شده است و هیچ‌گاه در پاسخ یا لاگ نمی‌آید
// (AC-IN-05)؛ در نسخهٔ اول ردیفی ساخته نمی‌شود و جدول فقط مرز فاز بعد است.

const ConnectionSchema = defineEntity({
  name: 'IntegrationConnection',
  tableName: 'integration_connection',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    system: p.enum(INTEGRATION_SYSTEMS),
    name: p.text(),
    config: p.blob().nullable().lazy(),
    direction: p.enum(['inbound', 'outbound'] as const),
    status: p.enum(['not_configured', 'connected', 'error', 'disabled'] as const),
    schedule: p.text().nullable(),
    autoPost: p.boolean(),
    dataKinds: p.json<string[]>(),
    consecutiveFailures: p.integer(),
    lastRunAt: p.datetime().nullable(),
    lastError: p.text().nullable(),
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  },
});
export class IntegrationConnection extends ConnectionSchema.class {}
ConnectionSchema.setClass(IntegrationConnection);
