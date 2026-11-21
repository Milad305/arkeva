import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ChartsController } from './api/charts.controller.js';
import { ActivityFeed } from './application/activity-feed.js';
import { FieldTeamToday } from './application/field-team.js';
import { OrgDashboard } from './application/org-dashboard.js';
import { ProjectOverview } from './application/project-overview.js';
import { ChartContext } from './application/chart-access.js';
import { CostCharts } from './application/cost-charts.js';
import { ProgressCharts } from './application/progress-charts.js';
import { ResourceCharts } from './application/resource-charts.js';
import { RiskCharts } from './application/risk-charts.js';

// F17 — داشبورد و نمودارها: لایهٔ خواندن بی جدول مالک (charts.md ۵). اعداد از computation، هشدار از alerts، ریسک از risks،
// صف تأیید از approvals و فعالیت از outbox؛ هیچ ماژولی این را وارد نمی‌کند.
@Module({
  imports: [IdentityModule],
  controllers: [ChartsController],
  providers: [ProjectOverview, FieldTeamToday, OrgDashboard, ActivityFeed, ChartContext, ProgressCharts, CostCharts, ResourceCharts, RiskCharts],
})
export class ChartsModule {}
