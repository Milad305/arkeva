import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { FieldIntake, FieldReads } from '../../field/index.js';
import { Decisions } from '../application/decisions.js';
import { Escalation } from '../application/escalation.js';
import { ReportViews } from '../application/report-views.js';
import { CorrectDto, DecisionDto, InboxQueryDto, ManualEntryDto, NoteDto, ReassignDto, ReportRevisionDto, ResolveDto } from './dto/approvals.dto.js';

// صندوق گزارش‌ها (W20)، تأیید سریع (W40)، ثبت دستی (G10) و اقدام‌های گلوگاه (W23) — approval-workflow.md ۸. هر endpoint
// یک کد؛ دامنهٔ ناظر (own_area) و منع خودتأییدی در سرویس.

const projectId = new ParseUUIDPipe();
const uuid = new ParseUUIDPipe();

@ApiTags('گزارش کارگاه و تأیید')
@Controller()
export class ApprovalsController {
  constructor(
    private readonly views: ReportViews,
    private readonly decisions: Decisions,
    private readonly intake: FieldIntake,
    private readonly reads: FieldReads,
    private readonly escalation: Escalation,
  ) {}

  @Get('inbox/field-items')
  @Permission('report.view')
  @ApiOperation({ summary: 'صندوق گزارش‌ها (میان‌پروژه‌ای)', operationId: 'getInbox', description: 'W20؛ ۵.۱' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  inbox(@Query() query: InboxQueryDto) {
    return this.views.inbox({
      tab: query.tab ?? 'pending',
      projectId: query.projectId ?? null,
      supervisorId: query.supervisorId ?? null,
      wbsRootId: query.wbsRootId ?? null,
      range: query.range ?? '30d',
      flagged: query.flagged ?? false,
      sort: query.sort ?? 'newest',
    });
  }

  @Get('projects/:projectId/field-reports/:reportId')
  @Permission('report.view')
  @ApiOperation({ summary: 'جزئیات گزارش کارگاه', operationId: 'getFieldReport', description: 'W40؛ ۵.۲' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  report(@Param('projectId', projectId) id: string, @Param('reportId', uuid) reportId: string) {
    return this.views.report(id, reportId);
  }

  @Post('projects/:projectId/field-items/:itemId/decision')
  @HttpCode(HttpStatus.OK)
  @Permission('report.view')
  @ApiOperation({ summary: 'تصمیم روی آیتم', operationId: 'decideItem', description: '۴.۳؛ مرحلهٔ ۱ با report.approve.stage1، مرحلهٔ ۲ با stage2 — در سرویس' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  async decide(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string, @Body() body: DecisionDto) {
    const result = await this.decisions.decide(id, itemId, body);
    return { item: await this.views.item(id, result.itemId), message: result.message };
  }

  @Post('projects/:projectId/field-reports/:reportId/approve-clean')
  @HttpCode(HttpStatus.OK)
  @Permission('report.approve.stage1')
  @ApiOperation({ summary: 'تأیید همهٔ آیتم‌های بی‌پرچم', operationId: 'approveClean', description: '۴.۹؛ AC-AP-10' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  approveClean(@Param('projectId', projectId) id: string, @Param('reportId', uuid) reportId: string) {
    return this.decisions.approveClean(id, reportId);
  }

  @Post('projects/:projectId/field-reports/:reportId/request-revision')
  @HttpCode(HttpStatus.OK)
  @Permission('report.approve.stage1')
  @ApiOperation({ summary: 'درخواست اصلاح همهٔ آیتم‌های باز گزارش', operationId: 'requestReportRevision' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  requestRevision(@Param('projectId', projectId) id: string, @Param('reportId', uuid) reportId: string, @Body() body: ReportRevisionDto) {
    return this.decisions.requestReportRevision(id, reportId, { note: body.note, requiredActions: body.requiredActions ?? [] });
  }

  @Post('projects/:projectId/field-items/:itemId/revoke-auto')
  @HttpCode(HttpStatus.OK)
  @Permission('report.approve.stage1')
  @ApiOperation({ summary: 'برگرداندن تأیید خودکار', operationId: 'revokeAuto', description: '۴.۶؛ AC-AP-09' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  async revokeAuto(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string, @Body() body: NoteDto) {
    const result = await this.decisions.revokeAuto(id, itemId, body.note);
    return { item: await this.views.item(id, result.itemId), message: result.message };
  }

  @Post('projects/:projectId/field-items/:itemId/correct')
  @HttpCode(HttpStatus.OK)
  @Permission('report.correct')
  @ApiOperation({ summary: 'اصلاح بعد از تأیید', operationId: 'correctItem', description: '۴.۷؛ AC-AP-08' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  async correct(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string, @Body() body: CorrectDto) {
    const result = await this.decisions.correct(id, itemId, { values: body.values, reason: body.reason });
    return { item: await this.views.item(id, result.itemId), message: result.message };
  }

  @Post('projects/:projectId/field-items/:itemId/resolve')
  @HttpCode(HttpStatus.OK)
  @Permission('report.resolve')
  @ApiOperation({ summary: 'تعیین تکلیف', operationId: 'resolveItem', description: '۴.۸' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  async resolve(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string, @Body() body: ResolveDto) {
    const result = await this.decisions.resolve(id, itemId, body);
    return { item: await this.views.item(id, result.itemId), message: result.message };
  }

  @Get('projects/:projectId/wbs/:itemId/report-context')
  @Permission('report.manual_entry')
  @ApiOperation({ summary: 'زمینهٔ فرم ثبت دستی و اصلاح', operationId: 'getLeafReportContext' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  context(@Param('projectId', projectId) id: string, @Param('itemId', uuid) itemId: string) {
    return this.reads.reportContext(id, itemId);
  }

  @Post('projects/:projectId/field-reports/manual')
  @Permission('report.manual_entry')
  @ApiOperation({
    summary: 'ثبت دستی پیشرفت در وب',
    operationId: 'createManualReport',
    description: 'G10؛ فقط پروژهٔ فعال (OD-F09-01)؛ هرگز خودکار تأیید نمی‌شود',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  async manual(@Param('projectId', projectId) id: string, @Body() body: ManualEntryDto) {
    const { reportId } = await this.intake.manual(id, {
      wbsItemId: body.wbsItemId,
      workDate: body.workDate,
      note: body.note,
      values: { quantityToday: body.quantityToday, reportedPercent: body.reportedPercent, reportedQuantityInfo: body.reportedQuantityInfo, steps: body.steps },
    });
    return this.views.report(id, reportId);
  }

  @Post('projects/:projectId/approvers/:userId/remind')
  @HttpCode(HttpStatus.OK)
  @Permission('report.approve.stage2')
  @ApiOperation({ summary: 'یادآوری به تأییدکننده', operationId: 'remindApprover', description: 'W23' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ unprocessable: true })
  remind(@Param('projectId', projectId) id: string, @Param('userId', uuid) userId: string) {
    return this.escalation.remind(id, userId);
  }

  @Post('projects/:projectId/approvers/:userId/reassign')
  @HttpCode(HttpStatus.OK)
  @Permission('report.approve.stage2')
  @ApiOperation({ summary: 'واگذاری آیتم‌های در انتظار به جایگزین', operationId: 'reassignApprover', description: 'W23' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ unprocessable: true })
  reassign(@Param('projectId', projectId) id: string, @Param('userId', uuid) userId: string, @Body() body: ReassignDto) {
    return this.escalation.reassign(id, userId, body.substituteUserId);
  }
}
