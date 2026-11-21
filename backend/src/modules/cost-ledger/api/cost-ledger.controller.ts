import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiProperty, ApiPropertyOptional, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import type { UploadedCsv } from '../../wbs/index.js';
import { CostCorrections } from '../application/cost-corrections.js';
import { CostEntries } from '../application/cost-entries.js';
import { COST_IMPORT_MAX_BYTES, CostImport } from '../application/cost-import.js';
import { COST_SOURCES, type CostSource } from '../domain/cost.entities.js';

// دفتر هزینه (F06؛ cost-ledger.md ۱۰). هر endpoint یک کد؛ همه `cbs.view_amounts` هم می‌خواهند (در سرویس). صفحهٔ فرانت
// ندارد (شکاف G1).

const projectId = new ParseUUIDPipe();
const uuid = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: COST_IMPORT_MAX_BYTES + 1, files: 1 } });

export class CostEntryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly cbsItemId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly wbsItemId?: string | null;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) readonly costDate!: string;
  @ApiProperty({ description: 'ریال صحیح مثبت' }) @IsString() @MaxLength(25) readonly amount!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(25) readonly quantity?: string | null;
  @ApiPropertyOptional({ enum: COST_SOURCES }) @IsOptional() @IsIn(COST_SOURCES) readonly source?: CostSource;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100) readonly externalRef?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100) readonly documentNo?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) readonly description?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(200) readonly counterparty?: string | null;
}

export class CreateCostEntryDto extends CostEntryDto {
  @ApiPropertyOptional({ description: '«ذخیره و قطعی»' }) @IsOptional() @IsBoolean() readonly post?: boolean;
}

export class PostEntriesDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20_000) @IsUUID('all', { each: true }) readonly ids?: string[];
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly batchId?: string;
}

export class CorrectEntryDto {
  @ApiProperty() @IsString() @MaxLength(1000) readonly reason!: string;
  @ApiPropertyOptional({ type: CostEntryDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CostEntryDto)
  readonly replacement?: CostEntryDto | null;
}

export class CutoffDto {
  @ApiProperty({ format: 'date', nullable: true }) @IsOptional() @IsDateString({ strict: true }) readonly date!: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) readonly reason?: string | null;
}

export class EntryQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsDateString({ strict: true }) readonly from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsDateString({ strict: true }) readonly to?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly cbsItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) readonly costType?: string;
  @ApiPropertyOptional({ enum: COST_SOURCES }) @IsOptional() @IsIn(COST_SOURCES) readonly source?: CostSource;
  @ApiPropertyOptional({ enum: ['draft', 'posted'] }) @IsOptional() @IsIn(['draft', 'posted']) readonly status?: 'draft' | 'posted';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) readonly counterparty?: string;
}

@ApiTags('دفتر هزینه')
@Controller('projects/:projectId')
export class CostLedgerController {
  constructor(
    private readonly entries: CostEntries,
    private readonly imports: CostImport,
    private readonly corrections: CostCorrections,
  ) {}

  @Get('cost-entries')
  @Permission('cost.view')
  @ApiOperation({ summary: 'ردیف‌های هزینه با فیلتر و جمع', operationId: 'getCostEntries' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  list(@Param('projectId', projectId) id: string, @Query() query: EntryQueryDto) {
    return this.entries.list(id, query);
  }

  @Post('cost-entries')
  @Permission('cost.create')
  @ApiOperation({ summary: 'ثبت ردیف هزینه', operationId: 'createCostEntry', description: 'post: true = «ذخیره و قطعی» (cost.post هم)؛ تکراری نادیده' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  create(@Param('projectId', projectId) id: string, @Body() body: CreateCostEntryDto) {
    const { post, ...input } = body;
    return this.entries.create(id, input, post ?? false);
  }

  @Post('cost-entries/post')
  @HttpCode(HttpStatus.OK)
  @Permission('cost.post')
  @ApiOperation({ summary: 'قطعی کردن پیش‌نویس‌ها', operationId: 'postCostEntries', description: 'یک رویداد CostEntryPosted برای کل درخواست (AC-CST-08)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  post(@Param('projectId', projectId) id: string, @Body() body: PostEntriesDto) {
    return this.entries.post(id, { ids: body.ids, batchId: body.batchId ?? null });
  }

  @Post('cost-entries/:entryId/correct')
  @HttpCode(HttpStatus.OK)
  @Permission('cost.reverse')
  @ApiOperation({ summary: 'اصلاح ردیف قطعی (برگشت + ردیف تازه)', operationId: 'correctCostEntry', description: 'AC-CST-02' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  correct(@Param('projectId', projectId) id: string, @Param('entryId', uuid) entryId: string, @Body() body: CorrectEntryDto) {
    return this.corrections.correct(id, entryId, { reason: body.reason, replacement: body.replacement ?? null });
  }

  @Delete('cost-entries/:entryId')
  @Permission('cost.create')
  @ApiOperation({ summary: 'حذف پیش‌نویس', operationId: 'deleteCostDraft' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  remove(@Param('projectId', projectId) id: string, @Param('entryId', uuid) entryId: string) {
    return this.entries.removeDraft(id, entryId);
  }

  @Post('cost-imports')
  @HttpCode(HttpStatus.OK)
  @Permission('cost.import')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'CSV UTF-8 با ستون‌های قالب (cost-ledger.md ۶.۱)' } } },
  })
  @ApiOperation({ summary: 'پیش‌نمایش ورود هزینه', operationId: 'previewCostImport' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  preview(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined) {
    return this.imports.preview(id, file);
  }

  @Post('cost-imports/:batchId/import')
  @HttpCode(HttpStatus.OK)
  @Permission('cost.import')
  @ApiOperation({ summary: 'ورود ردیف‌های سالم به‌صورت پیش‌نویس', operationId: 'importCostBatch' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  import(@Param('projectId', projectId) id: string, @Param('batchId', uuid) batchId: string) {
    return this.imports.import(id, batchId);
  }

  @Post('cost-imports/:batchId/post')
  @HttpCode(HttpStatus.OK)
  @Permission('cost.post')
  @ApiOperation({ summary: 'قطعی کردن دستهٔ ورود', operationId: 'postCostBatch', description: 'AC-CST-08' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  postBatch(@Param('projectId', projectId) id: string, @Param('batchId', uuid) batchId: string) {
    return this.imports.post(id, batchId);
  }

  @Put('costs-complete-through')
  @Permission('cost.set_cutoff')
  @ApiOperation({ summary: 'تاریخ کامل بودن هزینه‌ها', operationId: 'setCostsCompleteThrough', description: 'OD-19؛ عقب بردن با دلیل' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ unprocessable: true })
  cutoff(@Param('projectId', projectId) id: string, @Body() body: CutoffDto) {
    return this.corrections.setCutoff(id, { date: body.date ?? null, reason: body.reason ?? null });
  }
}
