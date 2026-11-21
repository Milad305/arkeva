import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Amounts } from '../../../platform/security/amounts.js';
import { Permission } from '../../../platform/security/decorators.js';
import { WbsDraftService } from '../application/wbs-draft.service.js';
import { IMPORT_MAX_BYTES } from '../domain/csv-import.js';
import { type UploadedCsv, WbsImport } from '../application/wbs-import.js';
import { WbsReads } from '../application/wbs-reads.js';
import { PlanningService } from '../../planning/index.js';
import { ApplyRequestDto, ImportFormDto, OpsRequestDto, parseOps, StatusNoteDto } from './dto/wbs.dto.js';

// WBS جاری (W11) و نسخهٔ کاری (W12، W39؛ F04 ۱۲). هر endpoint یک کد (wbs.md ۱۱؛ plan-versions.md ۱۱).

/** مبالغ پاسخ‌های WBS (BAC برگ از اتصال‌ها، اثر بودجه) — بی `cbs.view_amounts` null (AC-CBS-06). */
const WBS_AMOUNTS = ['bac', 'bacChange', 'budgetChange'] as const;
const projectId = new ParseUUIDPipe();
const itemId = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES + 1, files: 1 } });
const importBody = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary', description: 'CSV UTF-8 با ستون‌های قالب (wbs.md ۶.۱)' },
      mode: { type: 'string', enum: ['replace', 'append'] },
      draftRevision: { type: 'integer' },
      parentId: { type: 'string', format: 'uuid' },
    },
  },
};

@ApiTags('WBS و نسخه‌های برنامه')
@Controller('projects/:projectId')
export class WbsController {
  constructor(
    private readonly reads: WbsReads,
    private readonly drafts: WbsDraftService,
    private readonly imports: WbsImport,
    private readonly planning: PlanningService,
  ) {}

  @Get('wbs')
  @Permission('wbs.view')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'درخت جاری WBS', operationId: 'getWbsTree', description: 'فهرست تخت با parentId و sortOrder (wbs.md ۱۲)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  tree(@Param('projectId', projectId) id: string) {
    return this.reads.tree(id);
  }

  @Get('wbs/:itemId')
  @Permission('wbs.view')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'جزئیات آیتم WBS', operationId: 'getWbsItem' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  item(@Param('projectId', projectId) id: string, @Param('itemId', itemId) item: string) {
    return this.reads.item(id, item);
  }

  @Patch('wbs/:itemId/status-note')
  @Permission('wbs.edit_note')
  @ApiOperation({ summary: 'یادداشت وضعیت آیتم', operationId: 'updateWbsStatusNote', description: 'عملیاتی و بی نسخه (wbs.md ۴.۱)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  statusNote(@Param('projectId', projectId) id: string, @Param('itemId', itemId) item: string, @Body() body: StatusNoteDto) {
    return this.planning.setStatusNote(id, item, body.statusNote ?? null);
  }

  @Get('plan-draft/wbs')
  @Permission('plan.edit_draft')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'درخت نسخهٔ کاری با قفل‌ها و اعتبارسنجی', operationId: 'getWbsDraft' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  draftTree(@Param('projectId', projectId) id: string) {
    return this.drafts.tree(id);
  }

  @Post('plan-draft/wbs/ops/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'پیش‌نمایش عملیات بی‌نوشتن', operationId: 'previewWbsOps', description: 'تصمیم 1405/08/15؛ عمل ردشده در opErrors' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  preview(@Param('projectId', projectId) id: string, @Body() body: OpsRequestDto) {
    return this.drafts.preview(id, { draftRevision: body.draftRevision, ops: parseOps(body.ops) });
  }

  @Post('plan-draft/wbs/ops')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'ذخیرهٔ عملیات در نسخهٔ کاری', operationId: 'saveWbsOps', description: '۴۰۹ اگر draftRevision کهنه باشد؛ idMap شناسهٔ آیتم‌های تازه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  save(@Param('projectId', projectId) id: string, @Body() body: OpsRequestDto) {
    return this.drafts.save(id, { draftRevision: body.draftRevision, ops: parseOps(body.ops) });
  }

  @Post('plan-draft/wbs/import/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({ summary: 'پیش‌نمایش ورود WBS از CSV', operationId: 'previewWbsImport', description: 'W39؛ wbs.md ۶.۲؛ فقط CSV UTF-8' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  importPreview(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: ImportFormDto) {
    return this.imports.preview(id, { file, mode: body.mode, parentId: body.parentId ?? null, draftRevision: body.draftRevision });
  }

  @Post('plan-draft/wbs/import/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({ summary: 'ورود WBS از CSV به نسخهٔ کاری', operationId: 'confirmWbsImport', description: 'همان فایل پیش‌نمایش دوباره فرستاده می‌شود' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  importConfirm(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: ImportFormDto) {
    return this.imports.confirm(id, { file, mode: body.mode, parentId: body.parentId ?? null, draftRevision: body.draftRevision });
  }

  @Get('plan-draft/validation')
  @Permission('plan.edit_draft')
  @ApiOperation({ summary: 'اعتبارسنجی نسخهٔ کاری', operationId: 'getPlanDraftValidation', description: 'F04 ۵.۱' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  validation(@Param('projectId', projectId) id: string) {
    return this.drafts.validation(id);
  }

  @Get('plan-draft/impact')
  @Permission('plan.edit_draft')
  @Amounts(...WBS_AMOUNTS)
  @ApiOperation({ summary: 'خلاصهٔ اثر اعمال', operationId: 'getPlanDraftImpact', description: 'F04 ۵.۲' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  impact(@Param('projectId', projectId) id: string) {
    return this.drafts.impact(id);
  }

  @Post('plan-draft/apply')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.apply')
  @ApiOperation({ summary: 'اعمال بازنگری', operationId: 'applyPlanDraft', description: 'F04 ۵.۳؛ یادداشت اجباری؛ PlanVersionApplied' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  apply(@Param('projectId', projectId) id: string, @Body() body: ApplyRequestDto) {
    return this.drafts.apply(id, body);
  }

  @Delete('plan-draft')
  @Permission('plan.discard')
  @ApiOperation({ summary: 'کنار گذاشتن بازنگری کاری', operationId: 'discardPlanDraft', description: 'F04 ۵.۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  discard(@Param('projectId', projectId) id: string) {
    return this.drafts.discard(id);
  }
}
