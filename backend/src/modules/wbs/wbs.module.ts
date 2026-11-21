import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { WbsController } from './api/wbs.controller.js';
import { PlanActivation } from '../projects/index.js';
import { WbsPlanActivation } from './application/plan-activation.js';
import { WbsDraftService } from './application/wbs-draft.service.js';
import { WbsImport } from './application/wbs-import.js';
import { WbsReads } from './application/wbs-reads.js';

// F03 — WBS (docs/backend/01 ۴). جدول ندارد: ساختار را فقط از راه PlanningService (F04) می‌نویسد. موتور خالص
// عملیات، اعتبارسنجی و ورود فایل در domain/. سراسری چون پیش‌شرط‌های برنامهٔ فعال‌سازی (PlanActivation) را به
// projects می‌دهد (وارونگی وابستگی).
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [WbsController],
  providers: [WbsReads, WbsDraftService, WbsImport, WbsPlanActivation, { provide: PlanActivation, useExisting: WbsPlanActivation }],
  exports: [WbsDraftService, PlanActivation],
})
export class WbsModule {}
