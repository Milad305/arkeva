import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Amounts } from '../../../platform/security/amounts.js';
import { Permission } from '../../../platform/security/decorators.js';
import { IMPORT_MAX_BYTES, type UploadedCsv } from '../../wbs/index.js';
import { BudgetRevisions } from '../application/budget-revisions.js';
import { CbsDraftService } from '../application/cbs-draft.service.js';
import { CbsImport } from '../application/cbs-import.js';
import { CbsReads } from '../application/cbs-reads.js';
import { CBS_AMOUNT_KEYS } from '../application/cbs-view.js';
import { CbsImportFormDto, CbsOpsRequestDto, CreateRevisionDto, DecideRevisionDto, parseCbsOps, RevisionListQueryDto } from './dto/cbs.dto.js';

// دفتر CBS (W14)، درخواست بازنگری بودجه (G14) و حالت ویرایش CBS روی نسخهٔ کاری (cbs.md ۱۱، ۱۳–۱۴). هر endpoint یک
// کد؛ مبالغ بی `cbs.view_amounts` در پروژه null (D11؛ AC-CBS-06).

const projectId = new ParseUUIDPipe();
const uuid = new ParseUUIDPipe();
const upload = FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES + 1, files: 1 } });
const importBody = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary', description: 'CSV UTF-8 با ستون‌های قالب (cbs.md ۱۰)' },
      mode: { type: 'string', enum: ['replace', 'append'] },
      draftRevision: { type: 'integer' },
      parentId: { type: 'string', format: 'uuid' },
    },
  },
};

@ApiTags('CBS و بودجه')
@Controller('projects/:projectId')
export class CbsController {
  constructor(
    private readonly reads: CbsReads,
    private readonly drafts: CbsDraftService,
    private readonly imports: CbsImport,
    private readonly revisions: BudgetRevisions,
  ) {}

  @Get('cbs')
  @Permission('cbs.view')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'درخت جاری CBS با خلاصه', operationId: 'getCbsTree', description: 'فهرست تخت (cbs.md ۱۴)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  tree(@Param('projectId', projectId) id: string) {
    return this.reads.tree(id);
  }

  @Get('cbs/:itemId')
  @Permission('cbs.view')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'جزئیات قلم CBS', operationId: 'getCbsItem', description: 'اتصال‌ها و تاریخچهٔ نرخ (۷.۴)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  item(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string) {
    return this.reads.item(id, itemId);
  }

  @Get('budget-revisions')
  @Permission('cbs.view')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'درخواست‌های بازنگری بودجه', operationId: 'getBudgetRevisions' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  listRevisions(@Param('projectId', projectId) id: string, @Query() query: RevisionListQueryDto) {
    return this.revisions.list(id, query.status);
  }

  @Post('budget-revisions')
  @Permission('cbs.request_revision')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'ثبت درخواست بازنگری بودجه', operationId: 'createBudgetRevisionRequest', description: 'G14؛ NT-BUD-01 به مدیر پروژه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  createRevision(@Param('projectId', projectId) id: string, @Body() body: CreateRevisionDto) {
    return this.revisions.create(id, {
      reason: body.reason,
      changes: body.changes.map((change) => ({ cbsItemId: change.cbsItemId, field: change.field, to: change.to })),
    });
  }

  @Post('budget-revisions/:requestId/approve')
  @HttpCode(HttpStatus.OK)
  @Permission('cbs.approve_revision')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({
    summary: 'تأیید و اعمال بازنگری بودجه',
    operationId: 'approveBudgetRevision',
    description: 'نسخهٔ budget_revision ساخته و اعمال می‌شود؛ ۴۰۹ اگر بازنگری کاری باز است (AC-CBS-08)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  approve(@Param('projectId', projectId) id: string, @Param('requestId', uuid) requestId: string, @Body() body: DecideRevisionDto) {
    return this.revisions.approve(id, requestId, body.note ?? '');
  }

  @Post('budget-revisions/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  @Permission('cbs.approve_revision')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'رد درخواست بازنگری بودجه', operationId: 'rejectBudgetRevision', description: 'یادداشت اجباری' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  reject(@Param('projectId', projectId) id: string, @Param('requestId', uuid) requestId: string, @Body() body: DecideRevisionDto) {
    return this.revisions.reject(id, requestId, body.note ?? '');
  }

  @Get('plan-draft/cbs')
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'CBS نسخهٔ کاری با قفل‌ها و اعتبارسنجی', operationId: 'getCbsDraft' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  draftTree(@Param('projectId', projectId) id: string) {
    return this.drafts.tree(id);
  }

  @Post('plan-draft/cbs/ops/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({ summary: 'پیش‌نمایش عملیات CBS بی‌نوشتن', operationId: 'previewCbsOps' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  preview(@Param('projectId', projectId) id: string, @Body() body: CbsOpsRequestDto) {
    return this.drafts.preview(id, { draftRevision: body.draftRevision, ops: parseCbsOps(body.ops) });
  }

  @Post('plan-draft/cbs/ops')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @ApiOperation({
    summary: 'ذخیرهٔ عملیات CBS در نسخهٔ کاری',
    operationId: 'saveCbsOps',
    description: 'تغییر بودجه در پروژهٔ فعال cbs.revise_budget هم می‌خواهد (۷.۲)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  save(@Param('projectId', projectId) id: string, @Body() body: CbsOpsRequestDto) {
    return this.drafts.save(id, { draftRevision: body.draftRevision, ops: parseCbsOps(body.ops) });
  }

  @Post('plan-draft/cbs/import/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({ summary: 'پیش‌نمایش ورود CBS از CSV', operationId: 'previewCbsImport', description: 'cbs.md ۱۰؛ فقط CSV UTF-8' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  importPreview(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: CbsImportFormDto) {
    return this.imports.preview(id, { file, mode: body.mode, parentId: body.parentId ?? null, draftRevision: body.draftRevision });
  }

  @Post('plan-draft/cbs/import/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('plan.edit_draft')
  @Amounts(...CBS_AMOUNT_KEYS)
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody(importBody)
  @ApiOperation({ summary: 'ورود CBS از CSV به نسخهٔ کاری', operationId: 'confirmCbsImport', description: 'همه یا هیچ' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  importConfirm(@Param('projectId', projectId) id: string, @UploadedFile() file: UploadedCsv | undefined, @Body() body: CbsImportFormDto) {
    return this.imports.confirm(id, { file, mode: body.mode, parentId: body.parentId ?? null, draftRevision: body.draftRevision });
  }
}
