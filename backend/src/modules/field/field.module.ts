import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { SiteIssues } from './application/site-issues.js';
import { FieldIntake } from './application/field-intake.js';
import { DeviceHeartbeats } from './application/device-heartbeats.js';
import { PhotoProcessing } from './application/photo-processing.js';
import { PhotoUploads } from './application/photo-uploads.js';
import { FieldPendingCounts, FieldReads } from './application/field-reads.js';
import { ProjectPendingCounts } from '../projects/index.js';
import { FieldRecords } from './application/field-records.js';
import { OpeningProgress } from './application/opening-progress.js';

// F08 (بخش داده) — گزارش کارگاه: FieldReport، FieldReportItem، Photo (docs/backend/01 ۴). API همگام‌سازی اپ با مرحلهٔ ۴؛
// تا آن موقع FieldIntake دریافت را به‌صورت سرویس می‌دهد (تصمیم کاربر 1405/08/23). سراسری تا approvals پیاده‌سازی
// ReportPipeline را بدهد.
@Global()
@Module({
  imports: [IdentityModule],
  providers: [
    SiteIssues,
    FieldRecords,
    FieldReads,
    FieldIntake,
    OpeningProgress,
    PhotoUploads,
    PhotoProcessing,
    DeviceHeartbeats,
    FieldPendingCounts,
    { provide: ProjectPendingCounts, useExisting: FieldPendingCounts },
  ],
  exports: [FieldRecords, FieldReads, FieldIntake, OpeningProgress, DeviceHeartbeats, ProjectPendingCounts, SiteIssues],
})
export class FieldModule {}
