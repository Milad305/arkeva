import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiPropertyOptional, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ExplainMetrics } from '../application/explain.js';
import { EXPLAIN_METRICS, type ExplainMetric } from '../application/explain-format.js';
import { Periods } from '../application/periods.js';

// پیشرفت و دوره‌های گزارش (F10 ۹؛ charts.md ۴). جدول مشتق API نوشتنی ندارد (01 ۶)؛ تنها فرمان بستن دوره است.

const projectId = new ParseUUIDPipe();
const periodId = new ParseUUIDPipe();

export class ExplainQueryDto {
  @ApiProperty({ enum: EXPLAIN_METRICS })
  @IsIn(EXPLAIN_METRICS, { message: 'عدد را از فهرست انتخاب کنید.' })
  readonly metric!: ExplainMetric;

  @ApiPropertyOptional({ format: 'uuid', description: 'آیتم WBS یا قلم CBS؛ نبودن = کل پروژه' }) @IsOptional() @IsUUID() readonly itemId?: string;
  @ApiPropertyOptional({ format: 'date', description: 'پیش‌فرض تاریخ داده' }) @IsOptional() @IsDateString({ strict: true }) readonly date?: string;
}

@ApiTags('پیشرفت و دوره‌ها')
@Controller('projects/:projectId')
export class ProgressController {
  constructor(
    private readonly explainer: ExplainMetrics,
    private readonly periods: Periods,
  ) {}

  @Get('progress/explain')
  @Permission('progress.view')
  @ApiOperation({ summary: 'این عدد از کجا آمد؟', operationId: 'explainMetric', description: 'G9؛ فرمول با عدد، پنج منبع، تاریخ شاخص‌های هزینه، نسخهٔ مرجع' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  explain(@Param('projectId', projectId) id: string, @Query() query: ExplainQueryDto) {
    return this.explainer.explain(id, query);
  }

  @Get('periods')
  @Permission('period.view')
  @ApiOperation({ summary: 'دوره‌های گزارش', operationId: 'getPeriods', description: 'ماه شمسی (OD-06)؛ تازه‌ترین بالا' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  list(@Param('projectId', projectId) id: string) {
    return this.periods.list(id);
  }

  @Get('periods/:periodId/close-preview')
  @Permission('period.close')
  @ApiOperation({
    summary: 'پیش‌نمایش بستن دوره',
    operationId: 'getPeriodClosePreview',
    description: 'G2: در انتظارها، پیش‌نویس‌های هزینه، تاریخ کامل بودن (هشدار، نه مانع)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  preview(@Param('projectId', projectId) id: string, @Param('periodId', periodId) period: string) {
    return this.periods.preview(id, period);
  }

  @Post('periods/:periodId/close')
  @HttpCode(HttpStatus.OK)
  @Permission('period.close')
  @ApiOperation({
    summary: 'بستن دوره',
    operationId: 'closePeriod',
    description: 'به ترتیب و پس از پایان دوره؛ PeriodSnapshot و PeriodClosed؛ بازنمی‌شود (۵.۸)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  close(@Param('projectId', projectId) id: string, @Param('periodId', periodId) period: string) {
    return this.periods.close(id, period);
  }
}
