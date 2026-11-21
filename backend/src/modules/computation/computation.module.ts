import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ProgressController } from './api/progress.controller.js';
import { ComputeFactsLoader } from './application/compute-facts.js';
import { ExplainMetrics } from './application/explain.js';
import { PeriodReads } from './application/period-reads.js';
import { Periods } from './application/periods.js';
import { ComputeQueue, DailyCompute, DailyComputeWorker, FactsChangedConsumer } from './application/compute-trigger.js';
import { ProgressReads } from './application/progress-reads.js';
import { RecomputeProject } from './application/recompute-project.js';
import { PortfolioTrend } from './application/portfolio-trend.js';
import { OverviewFigures } from './application/overview-figures.js';
import { PlanCurveOnApplied, PlanCurves } from './application/plan-curves.js';
import { ChartSeries } from './application/chart-series.js';

// F10 + F11 — موتور محاسبه (docs/backend/01 ۶). سراسری چون projects، wbs و cbs عددهای مشتق را از ProgressReads می‌خوانند.
// خودش فقط از سرویس‌های عمومی planning، field، cost-ledger و projects (همه سراسری) می‌خواند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [ProgressController],
  providers: [
    ComputeFactsLoader,
    RecomputeProject,
    ComputeQueue,
    FactsChangedConsumer,
    DailyCompute,
    DailyComputeWorker,
    ProgressReads,
    PeriodReads,
    Periods,
    ExplainMetrics,
    PlanCurves,
    PlanCurveOnApplied,
    OverviewFigures,
    PortfolioTrend,
    ChartSeries,
  ],
  exports: [ProgressReads, PeriodReads, RecomputeProject, PlanCurves, OverviewFigures, PortfolioTrend, ChartSeries],
})
export class ComputationModule {}
