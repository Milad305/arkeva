import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { MspImportController } from './api/msp-import.controller.js';
import { MspSyncController } from './api/msp-sync.controller.js';
import { ImportBuild } from './application/import-build.js';
import { ImportSessions } from './application/import-sessions.js';
import { ImportViews } from './application/import-views.js';
import { MspAccess } from './application/msp-access.js';
import { ProgressExport, ProgressExportConsumer } from './application/progress-export.js';
import { SyncSessions } from './application/sync-sessions.js';
import { SyncViews } from './application/sync-views.js';

// F15 — یکپارچه‌سازی MS Project (msp-integration.md): ورود (W34، W35، W49؛ ۱۷الف)، همگام‌سازی W36 و خروجی (۱۷ب).
// سراسری چون قواعد هشدار (AL-INT-02) شمار منتظر ارسال را از ProgressExport می‌خوانند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [MspImportController, MspSyncController],
  providers: [MspAccess, ImportViews, ImportSessions, ImportBuild, SyncViews, SyncSessions, ProgressExport, ProgressExportConsumer],
  exports: [ProgressExport],
})
export class MspModule {}
