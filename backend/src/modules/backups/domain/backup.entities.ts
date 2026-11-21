import { defineEntity, p } from '@mikro-orm/postgresql';

// پشتیبان و خروجی کامل پروژه (F20 ۱۲؛ تصمیم‌های 1405/08/26). مالک: backups.

export const BACKUP_SCHEDULES = ['daily', 'weekly', 'off'] as const;
export type BackupScheduleKind = (typeof BACKUP_SCHEDULES)[number];

const ScheduleSchema = defineEntity({
  name: 'BackupSchedule',
  tableName: 'backup_schedule',
  properties: {
    projectId: p.uuid().primary(),
    orgId: p.uuid(),
    schedule: p.enum(BACKUP_SCHEDULES),
    updatedByUserId: p.uuid().nullable(),
    updatedAt: p.datetime(),
  },
});
export class BackupSchedule extends ScheduleSchema.class {}
ScheduleSchema.setClass(BackupSchedule);

export type BackupKind = 'auto' | 'manual';

const BackupSchema = defineEntity({
  name: 'ProjectBackup',
  tableName: 'project_backup',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    kind: p.enum(['auto', 'manual'] as const),
    /** روز تیک (تهران) برای خودکار؛ یکتا در پروژه. */
    runDate: p.date().nullable(),
    note: p.text().nullable(),
    storageKey: p.text(),
    keyId: p.text(),
    sizeBytes: p.bigint('number'),
    tableCount: p.integer(),
    rowCount: p.integer(),
    fileCount: p.integer(),
    fileBytes: p.bigint('number'),
    createdByUserId: p.uuid().nullable(),
    createdAt: p.datetime(),
  },
});
export class ProjectBackup extends BackupSchema.class {}
BackupSchema.setClass(ProjectBackup);

export const EXPORT_STATUSES = ['queued', 'running', 'done', 'failed', 'expired'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

const ExportSchema = defineEntity({
  name: 'ProjectExport',
  tableName: 'project_export',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    status: p.enum(EXPORT_STATUSES),
    includesAmounts: p.boolean(),
    storageKey: p.text().nullable(),
    fileName: p.text(),
    sizeBytes: p.bigint('number').nullable(),
    error: p.text().nullable(),
    requestedByUserId: p.uuid(),
    createdAt: p.datetime(),
    finishedAt: p.datetime().nullable(),
    expiresAt: p.datetime().nullable(),
  },
});
export class ProjectExport extends ExportSchema.class {}
ExportSchema.setClass(ProjectExport);
