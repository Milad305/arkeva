import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ReportsController } from './api/reports.controller.js';
import { ReportAccess } from './application/report-access.js';
import { ReportData } from './application/report-data.js';
import { ReportGeneration } from './application/report-generation.js';
import { ReportLibrary } from './application/report-library.js';
import { ReportRanges } from './application/report-ranges.js';
import { ReportDelivery } from './application/report-delivery.js';
import { ReportOutputs } from './application/report-outputs.js';
import { ReportRecipients } from './application/report-recipients.js';
import { ReportPeriodClosed, ReportScheduleTick, ReportScheduleUpkeep } from './application/report-schedule-events.js';
import { ReportSchedules } from './application/report-schedules.js';
import { ReportSections } from './application/report-sections.js';
import { ChromiumPdfRenderer, PdfRenderer } from './infrastructure/pdf-renderer.js';

// F18 — گزارش‌های مدیریتی (management-reports.md). برش ۱۸الف: قالب‌ها، پیش‌نمایش، تولید فایل و خروجی‌ها؛ زمان‌بندی و ارسال با ۱۸ب.
@Module({
  imports: [IdentityModule],
  controllers: [ReportsController],
  providers: [
    ReportAccess,
    ReportRanges,
    ReportSections,
    ReportData,
    ReportLibrary,
    ReportRecipients,
    ReportDelivery,
    ReportGeneration,
    ReportOutputs,
    ReportSchedules,
    ReportScheduleTick,
    ReportPeriodClosed,
    ReportScheduleUpkeep,
    { provide: PdfRenderer, useClass: ChromiumPdfRenderer },
  ],
})
export class ReportsModule {}
