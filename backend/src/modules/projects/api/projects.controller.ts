import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { PortfolioSummary } from '../application/portfolio-summary.js';
import { ProjectDetailQuery } from '../application/project-detail.js';
import { ProjectQueries } from '../application/project-queries.js';
import { ProjectDetailResponse } from './dto/project-lifecycle.dto.js';
import { ListProjectsQuery, ProjectListItemResponse } from './dto/project-list.dto.js';

@ApiTags('پروژه‌ها')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly queries: ProjectQueries,
    private readonly detail: ProjectDetailQuery,
    private readonly portfolio: PortfolioSummary,
  ) {}

  @Get()
  @Permission('project.view')
  @ApiOperation({
    summary: 'فهرست پروژه‌های سازمان',
    operationId: 'getProjects',
    description: 'F02 ۱۲؛ W07. مدیر سازمان همه؛ بقیه پروژه‌هایی که project.view دارند.',
  })
  @ApiEnvelopedOk(ProjectListItemResponse, { isArray: true })
  @ApiStandardResponses()
  list(@Query() query: ListProjectsQuery): Promise<ProjectListItemResponse[]> {
    return this.queries.list(query);
  }

  // پیش از ':projectId' تا «summary» شناسه خوانده نشود
  @Get('summary')
  @Permission('project.view')
  @ApiOperation({
    summary: 'خلاصهٔ پرتفوی (کارت‌های W07)',
    operationId: 'getPortfolioSummary',
    description: 'تصمیم 1405/08/23: مسیر جدا از /dashboard؛ مقایسه با همان روز ماه شمسی قبل؛ مبالغ فقط با cbs.view_amounts',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  summary() {
    return this.portfolio.get();
  }

  @Get(':projectId')
  @Permission('project.view')
  @ApiOperation({ summary: 'جزئیات پروژه', operationId: 'getProject', description: 'F02 ۱۲؛ پوستهٔ پروژه W10' })
  @ApiEnvelopedOk(ProjectDetailResponse)
  @ApiStandardResponses()
  get(@Param('projectId', new ParseUUIDPipe()) projectId: string): Promise<ProjectDetailResponse> {
    return this.detail.get(projectId);
  }
}
