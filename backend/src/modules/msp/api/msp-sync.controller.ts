import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import type { UploadedFile as Upload } from '../application/import-sessions.js';
import { ProgressExport } from '../application/progress-export.js';
import { SyncSessions } from '../application/sync-sessions.js';
import { MAX_FILE_BYTES } from '../domain/mspdi.js';

// F15 — همگام‌سازی W36 و خروجی به MSP (msp-integration.md ۷.۳، ۷.۴، ۱۰). `msp.sync` و `msp.export`؛ مسیرهای `/msp/syncs/:id`
// پروژه را از جلسه می‌گیرند و کد را سرویس می‌سنجد.

const uuid = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES + 1, files: 1 } });

class ChangeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() readonly sessionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() readonly changeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly selected?: boolean;
  @ApiPropertyOptional({ enum: ['keep_projeyar', 'accept_msp'] }) @IsOptional() @IsIn(['keep_projeyar', 'accept_msp']) readonly resolution?:
    'keep_projeyar' | 'accept_msp';
}

class SelectAllDto {
  @ApiProperty() @IsBoolean() readonly selected!: boolean;
}

class ApplyDto {
  @ApiProperty({ description: 'پخش دوبارهٔ وزن گروه‌های دست‌خورده (۷.۳ بند ۴)' }) @IsBoolean() readonly reweight!: boolean;
}

class ExportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() readonly projectId?: string;
  @ApiProperty() @IsBoolean() readonly replaceCalendar!: boolean;
}

@ApiTags('MSP')
@Controller()
export class MspSyncController {
  constructor(
    private readonly syncs: SyncSessions,
    private readonly exports: ProgressExport,
  ) {}

  @Post('projects/:projectId/msp/syncs')
  @Permission('msp.sync')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'XML (MSPDI)' } } } })
  @ApiOperation({ summary: 'همگام‌سازی با فایل MSP', operationId: 'createSync', description: 'W36؛ مقایسه با برنامهٔ جاری؛ AC-MS-06، AC-MS-12' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  create(@Param('projectId', uuid) projectId: string, @UploadedFile() file: Upload | undefined) {
    return this.syncs.create(projectId, file);
  }

  @Get('msp/syncs/:sessionId/changes')
  @Permission('msp.sync')
  @ApiOperation({ summary: 'تغییرهای همگام‌سازی', operationId: 'getSync', description: 'W36' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  get(@Param('sessionId', uuid) sessionId: string) {
    return this.syncs.get(sessionId);
  }

  @Patch('msp/syncs/:sessionId/changes')
  @Permission('msp.sync')
  @ApiOperation({ summary: 'انتخاب همهٔ تغییرها', operationId: 'selectAllChanges', description: 'حذف‌ها با «انتخاب همه» انتخاب نمی‌شوند' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  selectAll(@Param('sessionId', uuid) sessionId: string, @Body() body: SelectAllDto) {
    return this.syncs.selectAll(sessionId, body.selected);
  }

  @Patch('msp/syncs/:sessionId/changes/:changeId')
  @Permission('msp.sync')
  @ApiOperation({ summary: 'انتخاب یا تعیین تکلیف یک تغییر', operationId: 'updateSyncChange', description: 'AC-MS-08' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  updateChange(@Param('sessionId', uuid) sessionId: string, @Param('changeId', uuid) changeId: string, @Body() body: ChangeDto) {
    return this.syncs.updateChange(sessionId, changeId, body);
  }

  @Post('msp/syncs/:sessionId/apply')
  @HttpCode(HttpStatus.OK)
  @Permission('msp.sync')
  @ApiOperation({ summary: 'اعمال همگام‌سازی', operationId: 'applySync', description: 'بازنگری msp_sync؛ AC-MS-07، AC-MS-11' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  apply(@Param('sessionId', uuid) sessionId: string, @Body() body: ApplyDto) {
    return this.syncs.apply(sessionId, body);
  }

  @Get('projects/:projectId/msp/export-preview')
  @Permission('msp.export')
  @ApiOperation({ summary: 'پیش‌نمایش خروجی به MSP', operationId: 'getExportPreview', description: '۷.۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  preview(@Param('projectId', uuid) projectId: string) {
    return this.exports.preview(projectId);
  }

  @Post('projects/:projectId/msp/export')
  @HttpCode(HttpStatus.OK)
  @Permission('msp.export')
  @ApiOperation({ summary: 'ساخت XML به‌روز', operationId: 'exportProgress', description: 'AC-MS-09؛ فایل ورودی دست‌نخورده' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true })
  export(@Param('projectId', uuid) projectId: string, @Body() body: ExportDto) {
    return this.exports.export(projectId, body);
  }
}
