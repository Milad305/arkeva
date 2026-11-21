import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ImportBuild } from '../application/import-build.js';
import { ImportSessions, type UploadedFile as Upload } from '../application/import-sessions.js';
import { MAX_FILE_BYTES } from '../domain/mspdi.js';

// F15 — ورود از MSP (W34، W35، W49؛ msp-integration.md ۱۰). همه با `msp.import`؛ مسیرهای `/msp/imports/:id` پروژه را
// از جلسه می‌گیرند و کد را سرویس می‌سنجد (MspAccess).

const uuid = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES + 1, files: 1 } });

class CheckResolutionDto {
  @ApiProperty() @IsString() @MaxLength(60) readonly checkId!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly resolution!: string;
}

class OptionsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly buildCbs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly importBaseline?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly importProgress?: boolean;
}

class MappingDto {
  @ApiProperty() @IsString() @MaxLength(60) readonly rowId!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly target!: string;
}

class ResourceDto {
  @ApiProperty() @IsString() @MaxLength(60) readonly rowId!: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) @IsOptional() @IsUUID() readonly userId!: string | null;
  @ApiProperty({ enum: ['match', 'invite', 'skip'] }) @IsIn(['match', 'invite', 'skip']) readonly action!: 'match' | 'invite' | 'skip';
}

class UpdateImportDto {
  @ApiPropertyOptional({ description: 'نادیده؛ فرانت شناسه را در بدنه هم می‌فرستد' }) @IsOptional() @IsString() readonly sessionId?: string;
  @ApiPropertyOptional({ type: CheckResolutionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckResolutionDto)
  readonly checkResolution?: CheckResolutionDto;
  @ApiPropertyOptional({ type: OptionsDto }) @IsOptional() @ValidateNested() @Type(() => OptionsDto) readonly options?: OptionsDto;
  @ApiPropertyOptional({ type: MappingDto }) @IsOptional() @ValidateNested() @Type(() => MappingDto) readonly mapping?: MappingDto;
  @ApiPropertyOptional({ type: ResourceDto }) @IsOptional() @ValidateNested() @Type(() => ResourceDto) readonly resource?: ResourceDto;
  @ApiPropertyOptional({ enum: ['duration', 'cost', 'equal'] }) @IsOptional() @IsIn(['duration', 'cost', 'equal']) readonly weightGenerator?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly saveTemplate?: boolean;
}

class OpeningRowDto {
  @ApiProperty({ description: 'کد WBS فایل' }) @IsString() @MaxLength(60) readonly id!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) readonly percent!: number;
  @ApiProperty() @IsBoolean() readonly selected!: boolean;
}

class BuildImportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() readonly sessionId?: string;
  @ApiProperty({ type: [OpeningRowDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => OpeningRowDto) readonly openingProgress!: OpeningRowDto[];
}

class OptionsQuery {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly projectId?: string;
}

@ApiTags('MSP')
@Controller()
export class MspImportController {
  constructor(
    private readonly sessions: ImportSessions,
    private readonly builder: ImportBuild,
  ) {}

  @Post('projects/:projectId/msp/imports')
  @Permission('msp.import')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'XML (MSPDI)؛ MPP پذیرفته نمی‌شود' } } } })
  @ApiOperation({ summary: 'بارگذاری فایل MSP', operationId: 'createImport', description: 'W34؛ تحلیل و اعتبارسنجی همین درخواست' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  create(@Param('projectId', uuid) projectId: string, @UploadedFile() file: Upload | undefined) {
    return this.sessions.create(projectId, file);
  }

  @Get('msp/imports/:sessionId')
  @Permission('msp.import')
  @ApiOperation({ summary: 'جلسهٔ ورود', operationId: 'getImport', description: 'W34، W35' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  get(@Param('sessionId', uuid) sessionId: string) {
    return this.sessions.get(sessionId);
  }

  @Put('msp/imports/:sessionId/mapping')
  @Permission('msp.import')
  @ApiOperation({ summary: 'ویرایش جلسهٔ ورود', operationId: 'updateImport', description: 'تعیین تکلیف، گزینه‌ها، نگاشت، منابع، مولد وزن' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  update(@Param('sessionId', uuid) sessionId: string, @Body() body: UpdateImportDto) {
    return this.sessions.update(sessionId, body);
  }

  @Get('msp/imports/:sessionId/preview')
  @Permission('msp.import')
  @ApiOperation({ summary: 'پیش‌نمایش ساخت', operationId: 'getImportPreview', description: 'W49' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  preview(@Param('sessionId', uuid) sessionId: string) {
    return this.sessions.preview(sessionId);
  }

  @Post('msp/imports/:sessionId/build')
  @HttpCode(HttpStatus.OK)
  @Permission('msp.import')
  @ApiOperation({ summary: 'ساخت ساختار از فایل', operationId: 'buildImport', description: '۷.۱ گام ۳؛ AC-MS-01، AC-MS-05' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  build(@Param('sessionId', uuid) sessionId: string, @Body() body: BuildImportDto) {
    return this.builder.build(sessionId, body);
  }

  @Post('msp/imports/:sessionId/rollback')
  @HttpCode(HttpStatus.OK)
  @Permission('msp.import')
  @ApiOperation({ summary: 'بازگردانی ورود', operationId: 'rollbackImport', description: '۳۰ دقیقه و بی گزارش؛ AC-MS-04' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  rollback(@Param('sessionId', uuid) sessionId: string) {
    return this.builder.rollback(sessionId);
  }

  @Get('org/msp-templates')
  @Permission('msp.import')
  @ApiOperation({
    summary: 'گزینه‌های نگاشت',
    operationId: 'getMappingOptions',
    description: 'فیلدها، سرپرستان پروژه، الگوهای سازمان (تصمیم کاربر 1405/08/26)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  options(@Query() query: OptionsQuery) {
    return this.sessions.options(query.projectId ?? null);
  }
}
