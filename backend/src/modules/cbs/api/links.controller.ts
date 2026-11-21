import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Amounts } from '../../../platform/security/amounts.js';
import { Permission } from '../../../platform/security/decorators.js';
import { IMPORT_MAX_BYTES, type UploadedCsv } from '../../wbs/index.js';
import { CBS_AMOUNT_KEYS } from '../application/cbs-view.js';
import { LinksImport } from '../application/links-import.js';
import { LinksService } from '../application/links.service.js';
import { CbsOpsRequestDto, LinkImportFormDto, parseLinkOps } from './dto/cbs.dto.js';

// W15 — اتصال WBS ↔ CBS (cbs.md ۱۲، ۱۴). جاری با cbs.view؛ نسخهٔ کاری با plan.edit_draft.

const projectId = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES + 1, files: 1 } });
const importBody = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary', description: 'CSV UTF-8: کد WBS، کد CBS، مقدار، مبلغ' },
      draftRevision: { type: 'integer' },
    },
  },
};

@ApiTags('CBS و بودجه')
@Controller('projects/:projectId')
export class LinksController {
  constructor(
    private readonly links: LinksService,
    private readonly imports: LinksImport,
  ) {}

  @Get('links')
  @Permission('cbs.view')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'اتصال‌های برنامهٔ جاری', operationId: 'getCurrentLinks' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  current(@Param('projectId', projectId) id: string) {
    return this.links.current(id);
  }

  @Get('plan-draft/links')
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'اتصال‌های نسخهٔ کاری با اعتبارسنجی', operationId: 'getDraftLinks' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  draft(@Param('projectId', projectId) id: string) {
    return this.links.draft(id);
  }

  @Post('plan-draft/links/ops/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'پیش‌نمایش عملیات اتصال بی‌نوشتن', operationId: 'previewLinkOps' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  preview(@Param('projectId', projectId) id: string, @Body() body: CbsOpsRequestDto) {
    return this.links.preview(id, { draftRevision: body.draftRevision, ops: parseLinkOps(body.ops) });
  }

  @Post('plan-draft/links/ops')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'ذخیرهٔ عملیات اتصال در نسخهٔ کاری', operationId: 'saveLinkOps' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  save(@Param('projectId', projectId) id: string, @Body() body: CbsOpsRequestDto) {
    return this.links.save(id, { draftRevision: body.draftRevision, ops: parseLinkOps(body.ops) });
  }

  @Post('plan-draft/links/import/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({ summary: 'پیش‌نمایش ورود اتصال‌ها از CSV', operationId: 'previewLinkImport' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  importPreview(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: LinkImportFormDto) {
    return this.imports.preview(id, { file, draftRevision: body.draftRevision });
  }

  @Post('plan-draft/links/import/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({
    summary: 'ورود اتصال‌ها از CSV به نسخهٔ کاری',
    operationId: 'confirmLinkImport',
    description: 'اتصال‌های هر برگ فایل جایگزین می‌شوند؛ همه یا هیچ',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  importConfirm(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: LinkImportFormDto) {
    return this.imports.confirm(id, { file, draftRevision: body.draftRevision });
  }
}
