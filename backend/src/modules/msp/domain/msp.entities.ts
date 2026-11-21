import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase, tenantBase, versionedColumns } from '../../../platform/database/base-properties.js';
import type { PlanContentSnapshot } from './snapshot.js';
import type { ImportCheck } from './checks.js';
import type { MappingRow, TemplateMappings } from './mapping.js';
import type { MspFile } from './mspdi.js';

// موجودیت‌های F15 (`02` ۱۱؛ msp-integration.md ۵). مالک: msp.

export const IMPORT_STATUSES = ['validated', 'built', 'rolled_back', 'failed'] as const;
export const WEIGHT_GENERATORS = ['duration', 'cost', 'equal'] as const;

export interface ImportOptions {
  buildCbs: boolean;
  importBaseline: boolean;
  importProgress: boolean;
}

export interface ResourceRow {
  id: string;
  name: string;
  taskCount: number;
  userId: string | null;
  action: 'match' | 'invite' | 'skip';
}

const ImportSessionSchema = defineEntity({
  name: 'MspImportSession',
  tableName: 'msp_import_session',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    fileName: p.text(),
    storageKey: p.text(),
    fileSize: p.integer(),
    format: p.enum(['xml', 'mpp', 'xlsx'] as const),
    status: p.enum(IMPORT_STATUSES),
    analysis: p.json<MspFile>(),
    checks: p.json<ImportCheck[]>(),
    options: p.json<ImportOptions>(),
    mapping: p.json<MappingRow[]>(),
    resourceMapping: p.json<ResourceRow[]>(),
    weightGenerator: p.enum(WEIGHT_GENERATORS),
    saveTemplate: p.boolean().default(true),
    builtVersionId: p.uuid().nullable(),
    builtAt: p.datetime().nullable(),
    rollbackDeadline: p.datetime().nullable(),
    /** محتوای مبنای پیش از ساخت؛ بازگردانی همین را برمی‌گرداند (تصمیم کاربر 1405/08/26). */
    previousContent: p.json<PlanContentSnapshot>().nullable(),
    openingReportId: p.uuid().nullable(),
    createdByUserId: p.uuid(),
  },
});
export class MspImportSession extends ImportSessionSchema.class {}
ImportSessionSchema.setClass(MspImportSession);

const MappingTemplateSchema = defineEntity({
  name: 'FieldMappingTemplate',
  tableName: 'field_mapping_template',
  properties: {
    ...mutableBase(),
    name: p.text(),
    mappings: p.json<TemplateMappings>(),
    isDefault: p.boolean().default(false),
  },
});
export class FieldMappingTemplate extends MappingTemplateSchema.class {}
MappingTemplateSchema.setClass(FieldMappingTemplate);

const MspLinkSchema = defineEntity({
  name: 'MspLink',
  tableName: 'msp_link',
  properties: {
    projectId: p.uuid().primary(),
    orgId: p.uuid(),
    status: p.enum(['connected', 'error'] as const),
    lastFileName: p.text(),
    lastStorageKey: p.text().nullable(),
    lastSyncAt: p.datetime().nullable(),
    mappingTemplateId: p.uuid().nullable(),
    /** فایل آخرین ورود یا همگام‌سازی (تشخیص تغییر سمت MSP؛ ۷.۳). */
    lastAnalysis: p.json<MspFile>().nullable(),
    /** نسخهٔ برنامهٔ آخرین همگام‌سازی (تشخیص تغییر سمت پروژه‌یار). */
    lastSyncedVersionId: p.uuid().nullable(),
    ...versionedColumns(),
  },
});
export class MspLink extends MspLinkSchema.class {}
MspLinkSchema.setClass(MspLink);

const ExternalIdSchema = defineEntity({
  name: 'ExternalIdMap',
  tableName: 'external_id_map',
  properties: {
    ...tenantBase(),
    system: p.enum(['msp', 'erp', 'accounting', 'p6'] as const),
    entityType: p.string(),
    entityId: p.uuid(),
    projectId: p.uuid().nullable(),
    externalId: p.text(),
  },
});
export class ExternalIdMap extends ExternalIdSchema.class {}
ExternalIdSchema.setClass(ExternalIdMap);

export const SYNC_STATUSES = ['review', 'blocked', 'applied', 'cancelled'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

const SyncSessionSchema = defineEntity({
  name: 'MspSyncSession',
  tableName: 'msp_sync_session',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    fileName: p.text(),
    storageKey: p.text(),
    fileSize: p.integer(),
    status: p.enum(SYNC_STATUSES),
    blockedReason: p.text().nullable(),
    analysis: p.json<MspFile>(),
    baseVersionId: p.uuid().nullable(),
    resultVersionId: p.uuid().nullable(),
    appliedAt: p.datetime().nullable(),
    createdByUserId: p.uuid(),
  },
});
export class MspSyncSession extends SyncSessionSchema.class {}
SyncSessionSchema.setClass(MspSyncSession);

const SyncChangeSchema = defineEntity({
  name: 'MspSyncChange',
  tableName: 'msp_sync_change',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    sessionId: p.uuid(),
    sortOrder: p.integer(),
    direction: p.enum(['inbound', 'outbound'] as const),
    changeType: p.enum(['add', 'update', 'delete', 'move', 'conflict'] as const),
    wbsItemId: p.uuid().nullable(),
    mspUid: p.text().nullable(),
    code: p.text(),
    title: p.text(),
    field: p.string(),
    projeyarValue: p.json<unknown>().nullable(),
    mspValue: p.json<unknown>().nullable(),
    selected: p.boolean(),
    resolution: p.enum(['keep_projeyar', 'accept_msp'] as const).nullable(),
    hasApprovedReports: p.boolean().default(false),
  },
});
export class MspSyncChange extends SyncChangeSchema.class {}
SyncChangeSchema.setClass(MspSyncChange);

const ProgressExportSchema = defineEntity({
  name: 'ProgressExportItem',
  tableName: 'progress_export_item',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    wbsItemId: p.uuid(),
    /** درصد لحظهٔ آخرین خروجی؛ درصد زنده از محاسبات (F10) خوانده می‌شود. */
    percent: p.decimal('number').nullable(),
    asOfDate: p.date(),
    actualStart: p.date().nullable(),
    actualFinish: p.date().nullable(),
    status: p.enum(['pending', 'exported', 'withdrawn'] as const),
    exportedAt: p.datetime().nullable(),
    updatedAt: p.datetime(),
  },
});
export class ProgressExportItem extends ProgressExportSchema.class {}
ProgressExportSchema.setClass(ProgressExportItem);
