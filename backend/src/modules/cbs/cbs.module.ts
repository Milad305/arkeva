import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { PlanContentChecks, WbsModule } from '../wbs/index.js';
import { CbsController } from './api/cbs.controller.js';
import { LinksController } from './api/links.controller.js';
import { BudgetRevisions } from './application/budget-revisions.js';
import { CbsDraftService } from './application/cbs-draft.service.js';
import { CbsImport } from './application/cbs-import.js';
import { CbsPlanChecks } from './application/cbs-plan-checks.js';
import { CbsReads } from './application/cbs-reads.js';
import { LinksImport } from './application/links-import.js';
import { LinksService } from './application/links.service.js';

// F05 — CBS و اتصال WBS ↔ CBS (docs/backend/01 ۴). جدول‌های CBS و اتصال مال planning‌اند (D05) و فقط از راه
// PlanningService نوشته می‌شوند؛ cbs مالک BudgetRevisionRequest است. سراسری چون بخش CBS اعتبارسنجی نسخه
// (PlanContentChecks) را به wbs می‌دهد (وارونگی وابستگی).
@Global()
@Module({
  imports: [IdentityModule, WbsModule],
  controllers: [CbsController, LinksController],
  providers: [
    CbsPlanChecks,
    { provide: PlanContentChecks, useExisting: CbsPlanChecks },
    CbsReads,
    CbsDraftService,
    CbsImport,
    LinksService,
    LinksImport,
    BudgetRevisions,
  ],
  exports: [PlanContentChecks],
})
export class CbsModule {}
