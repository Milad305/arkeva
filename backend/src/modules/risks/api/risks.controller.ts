import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { RiskCommands } from '../application/risk-commands.js';
import { RiskInputs } from '../application/risk-input.js';
import { RiskMerge } from '../application/risk-merge.js';
import { RiskViews } from '../application/risk-views.js';
import { RiskWork } from '../application/risk-work.js';
import {
  ACTION_STATUSES,
  type ActionStatus,
  CLOSE_REASONS,
  type CloseReason,
  RESPONSE_STRATEGIES,
  type ResponseStrategy,
  REVIEW_FREQUENCIES,
  type ReviewFrequency,
} from '../domain/risk.entities.js';

// F14 — دفتر ریسک (risk.md ۱۰). مسیرهای `/risks/:id` پروژه را از خود ریسک می‌گیرند و کد را سرویس می‌سنجد (RiskAccess):
// ویرایش و اقدام = `risk.edit` یا مالک همان ریسک، پس روی مسیر کد پایهٔ `risk.view` است.

const uuid = new ParseUUIDPipe();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

class RiskLinkDto {
  @ApiProperty({ enum: ['wbs_item', 'cbs_item'] }) @IsIn(['wbs_item', 'cbs_item']) readonly kind!: 'wbs_item' | 'cbs_item';
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly targetId!: string;
}

class RiskInputDto {
  @ApiProperty() @IsString() @MaxLength(300) readonly title!: string;
  @ApiProperty() @IsString() @MaxLength(80) readonly category!: string;
  @ApiProperty({ nullable: true }) @IsOptional() @IsInt() @Min(1) @Max(5) readonly probability!: number | null;
  @ApiProperty({ nullable: true }) @IsOptional() @IsInt() @Min(1) @Max(5) readonly impact!: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) readonly cause?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) readonly event?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) readonly consequence?: string | null;
  @ApiProperty({ enum: RESPONSE_STRATEGIES, nullable: true }) @IsOptional() @IsIn(RESPONSE_STRATEGIES) readonly responseStrategy!: ResponseStrategy | null;
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly ownerUserId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) readonly triggerText?: string | null;
  @ApiPropertyOptional({ description: 'ریال' }) @IsOptional() @IsString() @MaxLength(30) readonly costImpact?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) readonly scheduleImpactDays?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) readonly targetProbability?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) readonly targetImpact?: number | null;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) readonly nextReviewDate?: string | null;
  @ApiPropertyOptional({ enum: REVIEW_FREQUENCIES }) @IsOptional() @IsIn(REVIEW_FREQUENCIES) readonly reviewFrequency?: ReviewFrequency | null;
  @ApiProperty({ type: [RiskLinkDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => RiskLinkDto) readonly links!: RiskLinkDto[];
}

class FirstActionDto {
  @ApiProperty() @IsString() @MaxLength(300) readonly title!: string;
  @ApiProperty({ nullable: true }) @IsOptional() @Matches(DATE) readonly dueDate!: string | null;
}

class CreateRiskDto extends RiskInputDto {
  @ApiPropertyOptional({ type: FirstActionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirstActionDto)
  readonly firstAction!: FirstActionDto | null;
  @ApiProperty() @IsBoolean() readonly notifyBelowThreshold!: boolean;
}

class StatusDto {
  @ApiProperty({ enum: ['occurred', 'closed', 'assessed'] }) @IsIn(['occurred', 'closed', 'assessed']) readonly status!: 'occurred' | 'closed' | 'assessed';
  @ApiPropertyOptional({ enum: CLOSE_REASONS }) @IsOptional() @IsIn(CLOSE_REASONS) readonly closeReason?: CloseReason;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) readonly actualCost?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) readonly actualDelayDays?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) readonly note?: string;
}

class ActionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) readonly title?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly ownerUserId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) readonly dueDate?: string | null;
  @ApiPropertyOptional({ enum: ACTION_STATUSES }) @IsOptional() @IsIn(ACTION_STATUSES) readonly status?: ActionStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) readonly completionNote?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) readonly costNote?: string | null;
}

class NoteDto {
  @ApiProperty() @IsString() @MaxLength(4000) readonly text!: string;
}

class ContingencyDto {
  @ApiProperty({ description: 'ریال' }) @IsString() @MaxLength(30) readonly amount!: string;
}

class MergeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly intoRiskId!: string;
  @ApiProperty() @IsBoolean() readonly propose!: boolean;
}

@ApiTags('ریسک')
@Controller()
export class RisksController {
  constructor(
    private readonly views: RiskViews,
    private readonly commands: RiskCommands,
    private readonly work: RiskWork,
    private readonly inputs: RiskInputs,
    private readonly merges: RiskMerge,
  ) {}

  @Get('risks')
  @Permission('risk.view')
  @ApiOperation({ summary: 'دفتر ریسک همهٔ پروژه‌ها', operationId: 'getOrgRiskRegister', description: 'تصمیم 1405/08/15' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  orgRegister() {
    return this.views.register(null);
  }

  @Get('projects/:projectId/risks')
  @Permission('risk.view')
  @ApiOperation({ summary: 'دفتر ریسک پروژه', operationId: 'getRiskRegister', description: 'W18: فهرست، کارت‌ها، ماتریس، کد بعدی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  register(@Param('projectId', uuid) projectId: string) {
    return this.views.register(projectId);
  }

  @Get('projects/:projectId/risks/people')
  @Permission('risk.view')
  @ApiOperation({ summary: 'اعضا برای مالک و @نام', operationId: 'getRiskPeople' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  async people(@Param('projectId', uuid) projectId: string) {
    return this.views.people(projectId, await this.inputs.members(projectId));
  }

  @Post('projects/:projectId/risks')
  @Permission('risk.create')
  @ApiOperation({ summary: 'ثبت ریسک', operationId: 'createRisk', description: 'W44؛ NT-RSK-02 با امتیاز ≥ ۱۵ (AC-RK-02)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  create(@Param('projectId', uuid) projectId: string, @Body() body: CreateRiskDto) {
    return this.commands.create(projectId, {
      ...body,
      probability: body.probability ?? null,
      impact: body.impact ?? null,
      responseStrategy: body.responseStrategy ?? null,
      firstAction: body.firstAction ?? null,
    });
  }

  @Get('risks/:riskId')
  @Permission('risk.view')
  @ApiOperation({ summary: 'جزئیات ریسک', operationId: 'getRisk', description: 'W19' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  detail(@Param('riskId', uuid) riskId: string) {
    return this.views.detail(riskId);
  }

  @Patch('risks/:riskId')
  @Permission('risk.view')
  @ApiOperation({ summary: 'ویرایش ریسک', operationId: 'updateRisk', description: '`risk.edit` یا مالک ریسک؛ تغییر مالک با `risk.change_status_owner`' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  update(@Param('riskId', uuid) riskId: string, @Body() body: RiskInputDto) {
    return this.commands.update(riskId, {
      ...body,
      probability: body.probability ?? null,
      impact: body.impact ?? null,
      responseStrategy: body.responseStrategy ?? null,
    });
  }

  @Post('risks/:riskId/status')
  @HttpCode(HttpStatus.OK)
  @Permission('risk.change_status_owner')
  @ApiOperation({ summary: 'وضعیت ریسک', operationId: 'changeRiskStatus', description: 'رخ‌داده، بستن با دلیل (AC-RK-07)، بازگشایی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  status(@Param('riskId', uuid) riskId: string, @Body() body: StatusDto) {
    return this.commands.status(riskId, body);
  }

  @Post('risks/:riskId/actions')
  @Permission('risk.view')
  @ApiOperation({ summary: 'اقدام تازه', operationId: 'addRiskAction', description: '`risk.edit` یا مالک ریسک؛ وضعیت خودکار (AC-RK-06)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  addAction(@Param('riskId', uuid) riskId: string, @Body() body: ActionDto) {
    return this.work.addAction(riskId, body);
  }

  @Patch('risk-actions/:actionId')
  @Permission('risk.view')
  @ApiOperation({ summary: 'ویرایش اقدام', operationId: 'updateRiskAction', description: '`risk.edit` یا مالک ریسک' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  updateAction(@Param('actionId', uuid) actionId: string, @Body() body: ActionDto) {
    return this.work.updateAction(actionId, body);
  }

  @Post('risks/:riskId/notes')
  @Permission('risk.view')
  @ApiOperation({ summary: 'یادداشت', operationId: 'addRiskNote', description: '@نام ← NT-RSK-03' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  note(@Param('riskId', uuid) riskId: string, @Body() body: NoteDto) {
    return this.work.addNote(riskId, body.text);
  }

  @Post('risks/:riskId/follow')
  @HttpCode(HttpStatus.OK)
  @Permission('risk.view')
  @ApiOperation({ summary: 'دنبال کردن', operationId: 'followRisk' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  follow(@Param('riskId', uuid) riskId: string) {
    return this.work.follow(riskId, true);
  }

  @Delete('risks/:riskId/follow')
  @Permission('risk.view')
  @ApiOperation({ summary: 'لغو دنبال کردن', operationId: 'unfollowRisk', description: 'مالک همیشه دنبال‌کننده است' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  unfollow(@Param('riskId', uuid) riskId: string) {
    return this.work.follow(riskId, false);
  }

  @Put('risks/:riskId/contingency')
  @Permission('risk.allocate_contingency')
  @ApiOperation({ summary: 'تخصیص ذخیرهٔ احتیاطی', operationId: 'allocateContingency', description: 'جمع تخصیص‌ها ≤ ذخیره (AC-RK-08)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  contingency(@Param('riskId', uuid) riskId: string, @Body() body: ContingencyDto) {
    return this.work.allocate(riskId, body.amount);
  }

  @Post('risks/:riskId/merge')
  @HttpCode(HttpStatus.OK)
  @Permission('risk.view')
  @ApiOperation({
    summary: 'ادغام ریسک تکراری',
    operationId: 'mergeRisk',
    description: 'propose: یادداشت و اعلان به مدیر؛ ادغام با `risk.change_status_owner`',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true, conflict: true })
  merge(@Param('riskId', uuid) riskId: string, @Body() body: MergeDto) {
    return this.merges.merge(riskId, body);
  }
}
