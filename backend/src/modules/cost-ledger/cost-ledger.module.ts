import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { CostLedgerController } from './api/cost-ledger.controller.js';
import { CostCorrections } from './application/cost-corrections.js';
import { CostEntries } from './application/cost-entries.js';
import { CostImport } from './application/cost-import.js';

// F06 — دفتر هزینه (docs/backend/01 ۴): CostEntry، CostImportBatch و ستون‌های تاریخ کامل بودن هزینه‌های پروژه. سراسری
// چون cbs (قفل‌های «هزینهٔ ثبت‌شده»، W14) و بعد computation (AC) از CostEntries می‌خوانند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [CostLedgerController],
  providers: [CostEntries, CostImport, CostCorrections],
  exports: [CostEntries],
})
export class CostLedgerModule {}
