import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ActivityFeed } from '../application/activity-feed.js';
import { OrgDashboard } from '../application/org-dashboard.js';
import { ProjectOverview } from '../application/project-overview.js';
import { parseRange } from '../application/chart-access.js';
import { CostCharts } from '../application/cost-charts.js';
import { ProgressCharts } from '../application/progress-charts.js';
import { ResourceCharts } from '../application/resource-charts.js';
import { RiskCharts } from '../application/risk-charts.js';

// F17 — لایهٔ خواندن (charts.md ۹؛ platform.md ۱۰). همه فقط خواندن. نمای کلی با `project.view` و حالت خلاصه بی `charts.view`
// (ناظر کارفرما)؛ داشبورد و فید سازمان با `dashboard.view`.

const uuid = new ParseUUIDPipe();

class LimitQuery {
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Matches(/^\d{1,2}$/)
  readonly limit?: string;
}

class RangeQuery {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'all', 'closed_period'], default: 'all' })
  @IsOptional()
  @IsIn(['month', 'quarter', 'all', 'closed_period'])
  readonly range?: string;
}

const limitOf = (query: LimitQuery) => Math.min(Math.max(Number(query.limit ?? 10), 1), 50);

@ApiTags('داشبورد و نمودارها')
@Controller()
export class ChartsController {
  constructor(
    private readonly overview: ProjectOverview,
    private readonly dashboard: OrgDashboard,
    private readonly activity: ActivityFeed,
    private readonly progressCharts: ProgressCharts,
    private readonly costCharts: CostCharts,
    private readonly resourceCharts: ResourceCharts,
    private readonly riskCharts: RiskCharts,
  ) {}

  @Get('dashboard')
  @Permission('dashboard.view')
  @ApiOperation({ summary: 'داشبورد سازمان', operationId: 'getDashboard', description: 'W05' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  getDashboard() {
    return this.dashboard.get();
  }

  @Get('activity')
  @Permission('dashboard.view')
  @ApiOperation({ summary: 'فعالیت‌های اخیر پروژه‌های من', operationId: 'getMyActivity', description: 'platform.md ۱۰' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  mine(@Query() query: LimitQuery) {
    return this.activity.mine(limitOf(query));
  }

  @Get('projects/:projectId/overview')
  @Permission('project.view')
  @ApiOperation({ summary: 'نمای کلی پروژه', operationId: 'getProjectOverview', description: 'W10؛ حالت خلاصه بی charts.view' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  getOverview(@Param('projectId', uuid) projectId: string) {
    return this.overview.get(projectId);
  }

  @Get('projects/:projectId/activity')
  @Permission('project.view')
  @ApiOperation({ summary: 'فعالیت‌های اخیر پروژه', operationId: 'getProjectActivity' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  projectActivity(@Param('projectId', uuid) projectId: string, @Query() query: LimitQuery) {
    return this.activity.project(projectId, limitOf(query));
  }

  @Get('projects/:projectId/charts/progress')
  @Permission('charts.view')
  @ApiOperation({ summary: 'پیشرفت و زمان', operationId: 'getProgressCharts', description: 'W21: منحنی S چهارخطی، EVM ماهانه، گانت' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  progress(@Param('projectId', uuid) projectId: string, @Query() query: RangeQuery) {
    return this.progressCharts.get(projectId, parseRange(query.range));
  }

  @Get('projects/:projectId/charts/cost')
  @Permission('charts.view')
  @ApiOperation({ summary: 'هزینه و بودجه', operationId: 'getCostCharts', description: 'W22؛ نیازمند cbs.view_amounts (charts.view_cost)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  cost(@Param('projectId', uuid) projectId: string, @Query() query: RangeQuery) {
    return this.costCharts.get(projectId, parseRange(query.range));
  }

  @Get('projects/:projectId/charts/resources')
  @Permission('charts.view')
  @ApiOperation({ summary: 'منابع و سرپرستان', operationId: 'getResourceCharts', description: 'W23؛ نفرات = جمع crewCount' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  resources(@Param('projectId', uuid) projectId: string, @Query() query: RangeQuery) {
    return this.resourceCharts.get(projectId, parseRange(query.range));
  }

  @Get('projects/:projectId/charts/risk')
  @Permission('charts.view')
  @ApiOperation({ summary: 'ریسک و انحراف', operationId: 'getRiskCharts', description: 'W24؛ همیشه در تاریخ داده' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  risk(@Param('projectId', uuid) projectId: string) {
    return this.riskCharts.get(projectId);
  }
}
