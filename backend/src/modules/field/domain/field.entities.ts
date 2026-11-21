import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, idColumn, mutableBase } from '../../../platform/database/base-properties.js';

// FieldReport، FieldReportItem و Photo (`02` ۶). مالک محتوا: field (F08)؛ وضعیت آیتم و Review مال approvals (F09) و
// فقط از راه FieldRecords.transition نوشته می‌شود (`03` ۲). واقعیت‌اند: حذف نمی‌شوند؛ اصلاح = آیتم تازه (D08).

export const REPORT_SOURCES = ['app', 'web_manual', 'import_opening', 'correction'] as const;
export const ITEM_STATUSES = ['submitted', 'stage1', 'stage2', 'approved', 'needs_revision', 'rejected', 'superseded', 'needs_resolution'] as const;
export const REPORT_METHODS = ['quantity', 'percent', 'steps'] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemMethod = (typeof REPORT_METHODS)[number];
export type Resolution = 'leaf_removed' | 'reassigned';

const FieldReportSchema = defineEntity({
  name: 'FieldReport',
  tableName: 'field_report',
  properties: {
    id: idColumn(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    source: p.enum(REPORT_SOURCES),
    authorUserId: p.uuid(),
    workDate: p.date(),
    reportNo: p.string(),
    deviceRecordedAt: p.datetime(),
    serverReceivedAt: p.datetime(),
    appVersion: p.string().nullable(),
    gpsLat: p.decimal('number').nullable(),
    gpsLng: p.decimal('number').nullable(),
    gpsAccuracyM: p.decimal('number').nullable(),
    distanceFromSiteM: p.integer().nullable(),
    weather: p.string().nullable(),
    temperatureC: p.integer().nullable(),
    note: p.text().nullable(),
    attestedAt: p.datetime().nullable(),
    flags: p.json<string[]>(),
    createdAt: createdAtColumn(),
  },
});

export class FieldReport extends FieldReportSchema.class {}
FieldReportSchema.setClass(FieldReport);

const FieldReportItemSchema = defineEntity({
  name: 'FieldReportItem',
  tableName: 'field_report_item',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    reportId: p.uuid(),
    wbsItemId: p.uuid(),
    method: p.enum(REPORT_METHODS),
    quantityToday: p.decimal('number').nullable(),
    reportedPercent: p.decimal('number').nullable(),
    reportedQuantityInfo: p.decimal('number').nullable(),
    stepsProgress: p.json<Record<string, number>>().nullable(),
    computedPercent: p.decimal('number').default(0),
    lastApprovedPercent: p.decimal('number').default(0),
    deltaPercent: p.decimal('number').default(0),
    plannedPercentAtDate: p.decimal('number').default(0),
    status: p.enum(ITEM_STATUSES),
    currentStage: p.integer().nullable(),
    requiresStage2: p.boolean().default(false),
    autoApproved: p.boolean().default(false),
    flags: p.json<string[]>(),
    resolution: p.enum(['leaf_removed', 'reassigned'] as const).nullable(),
    revisionCount: p.integer().default(0),
    supersedesItemId: p.uuid().nullable(),
    crewCount: p.integer().nullable(),
    note: p.text().nullable(),
    approvedAt: p.datetime().nullable(),
  },
});

export class FieldReportItem extends FieldReportItemSchema.class {}
FieldReportItemSchema.setClass(FieldReportItem);

const FieldPhotoSchema = defineEntity({
  name: 'FieldPhoto',
  tableName: 'field_photo',
  properties: {
    id: idColumn(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    reportId: p.uuid(),
    itemId: p.uuid().nullable(),
    storageKey: p.string(),
    sha256: p.string(),
    takenAt: p.datetime(),
    lat: p.decimal('number').nullable(),
    lng: p.decimal('number').nullable(),
    accuracyM: p.decimal('number').nullable(),
    distanceM: p.integer().nullable(),
    caption: p.string().nullable(),
    uploadStatus: p.enum(['pending', 'complete'] as const).default('pending'),
    markedUnsuitable: p.boolean().default(false),
    /** پردازش پس‌زمینه (F20 ۷): بندانگشتی‌های ۳۲۰ و ۱۲۸۰ و EXIF؛ تهی تا پردازش. */
    thumbSmallKey: p.string().nullable(),
    thumbLargeKey: p.string().nullable(),
    exif: p.json<Record<string, unknown>>().nullable(),
    processedAt: p.datetime().nullable(),
    createdAt: createdAtColumn(),
  },
});

export class FieldPhoto extends FieldPhotoSchema.class {}
FieldPhotoSchema.setClass(FieldPhoto);

/** آخرین ضربان صف گوشی هر کاربر (field-app.md ۵.۲؛ G7) — عملیاتی؛ AL-FLD-04 و W23 از آن می‌خوانند. */
const DeviceQueueStateSchema = defineEntity({
  name: 'DeviceQueueState',
  tableName: 'device_queue_state',
  properties: {
    userId: p.uuid().primary(),
    orgId: p.uuid(),
    queuedReports: p.integer().default(0),
    queuedPhotos: p.integer().default(0),
    queuedBytes: p.bigint('number').default(0),
    oldestQueuedAt: p.datetime().nullable(),
    appVersion: p.string().nullable(),
    lastSyncAt: p.datetime().nullable(),
    wifiOnly: p.boolean().default(false),
    receivedAt: p.datetime(),
  },
});

export class DeviceQueueState extends DeviceQueueStateSchema.class {}
DeviceQueueStateSchema.setClass(DeviceQueueState);
