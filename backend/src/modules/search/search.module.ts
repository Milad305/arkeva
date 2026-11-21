import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { SearchController } from './api/search.controller.js';
import { GlobalSearch } from './application/global-search.js';
import { ReportVisibility } from './application/report-visibility.js';

// F20 ۹ — جستجوی سراسری (W43): لایهٔ خواندن روی خواندن‌های مالک‌ها (planning، risks، field، identity، approvals)؛ جدول ندارد.
@Module({
  imports: [IdentityModule],
  controllers: [SearchController],
  providers: [GlobalSearch, ReportVisibility],
})
export class SearchModule {}
