import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { AlertQueries } from '../application/alert-queries.js';
import { AlertRulesConfig } from '../application/alert-rules-config.js';

// هشدارها (04-alert-engine ۸). هر مسیر یک کد؛ دامنهٔ پروژه در سرویس.

const uuid = new ParseUUIDPipe();

export class MyAlertsQuery {
  @ApiPropertyOptional({ example: 'open,seen' }) @IsOptional() @IsString() @MaxLength(60) readonly status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) readonly limit?: number;
}

export class ProjectAlertsQuery {
  @ApiPropertyOptional({ example: 'open,seen' }) @IsOptional() @IsString() @MaxLength(60) readonly status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) readonly severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) readonly subjectType?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsString() @MaxLength(40) readonly subjectId?: string;
}

export class DismissDto {
  @ApiProperty({ description: 'دلیل رد (الزامی)' }) @IsString() @MaxLength(1000) readonly reason!: string;
}

export class AlertRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly enabled?: boolean;
  @ApiPropertyOptional({ description: 'کلید پارامتر ← مقدار' }) @IsOptional() @IsObject() readonly params?: Record<string, number>;
}

@ApiTags('هشدارها')
@Controller()
export class AlertsController {
  constructor(
    private readonly queries: AlertQueries,
    private readonly config: AlertRulesConfig,
  ) {}

  @Get('alerts/mine')
  @Permission('alerts.view')
  @ApiOperation({ summary: 'هشدارهای من', operationId: 'getMyAlerts', description: 'W05 «نیاز به توجه»: open و seen همهٔ پروژه‌ها، مرتب بر شدت' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  mine(@Query() query: MyAlertsQuery) {
    return this.queries.mine(query);
  }

  @Get('projects/:projectId/alerts')
  @Permission('alerts.view')
  @ApiOperation({ summary: 'هشدارهای پروژه', operationId: 'getProjectAlerts' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  forProject(@Param('projectId', uuid) projectId: string, @Query() query: ProjectAlertsQuery) {
    return this.queries.forProject(projectId, query);
  }

  @Post('alerts/:alertId/seen')
  @HttpCode(HttpStatus.OK)
  @Permission('alerts.view')
  @ApiOperation({ summary: 'دیدن هشدار', operationId: 'markAlertSeen' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  seen(@Param('alertId', uuid) alertId: string) {
    return this.queries.seen(alertId);
  }

  @Post('alerts/:alertId/dismiss')
  @HttpCode(HttpStatus.OK)
  @Permission('alerts.dismiss')
  @ApiOperation({ summary: 'رد هشدار', operationId: 'dismissAlert', description: 'فقط مدیر پروژه، با دلیل؛ بحرانی نه (AC-AL-06)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  dismiss(@Param('alertId', uuid) alertId: string, @Body() body: DismissDto) {
    return this.queries.dismiss(alertId, body.reason);
  }

  @Get('projects/:projectId/alert-rules')
  @Permission('alerts.view')
  @ApiOperation({ summary: 'قواعد هشدار پروژه', operationId: 'getAlertRules' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  rules(@Param('projectId', uuid) projectId: string) {
    return this.config.list(projectId);
  }

  @Patch('projects/:projectId/alert-rules/:code')
  @Permission('alerts.configure')
  @ApiOperation({ summary: 'تنظیم قاعدهٔ هشدار', operationId: 'saveAlertRule', description: 'روشن/خاموش و پارامتر؛ AL-INT-01 و AL-STR-06 غیرقابل‌خاموش' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  saveRule(@Param('projectId', uuid) projectId: string, @Param('code') code: string, @Body() body: AlertRuleDto) {
    return this.config.update(projectId, code, body);
  }
}
