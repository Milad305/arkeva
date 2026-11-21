import { Global, Module } from '@nestjs/common';
import { ProjectBackupsView } from '../projects/index.js';
import { BackupsController } from './api/backups.controller.js';
import { BackupSettings } from './application/backup-settings.js';
import { BackupTick } from './application/backup-tick.js';
import { ExportBuilder } from './application/export-builder.js';
import { FullExports } from './application/full-exports.js';
import { ProjectBackups } from './application/project-backups.js';
import { ProjectDump } from './application/project-dump.js';

// F20 ۱۲ — پشتیبان پروژه و خروجی کامل (برش ۱۹). سراسری چون تنظیمات پروژه بخش «پشتیبان» را از درگاه ProjectBackupsView می‌خواند.
@Global()
@Module({
  controllers: [BackupsController],
  providers: [
    ProjectDump,
    ProjectBackups,
    BackupSettings,
    BackupTick,
    ExportBuilder,
    FullExports,
    { provide: ProjectBackupsView, useExisting: BackupSettings },
  ],
  exports: [ProjectBackupsView],
})
export class BackupsModule {}
