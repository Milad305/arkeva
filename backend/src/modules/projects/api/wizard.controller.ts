import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ProjectCreation } from '../application/project-creation.js';
import { ProjectTemplates } from '../application/settings-ports.js';
import { WizardDrafts } from '../application/wizard-drafts.js';
import { WizardPreview } from '../application/wizard-preview.js';
import { CodeAvailabilityQuery, TeamCheckRequest, WizardDraftRequest, WizardScheduleDto } from './dto/wizard.dto.js';

// ویزارد ساخت پروژه (F02 ۵، ۱۲؛ W37، W47، W48، W38). همه با project.create. این کنترلر پیش از
// ProjectsController ثبت می‌شود تا `/projects/code-available` با `/projects/:projectId` خلط نشود.

const draftId = new ParseUUIDPipe();

@ApiTags('ساخت پروژه')
@Controller('projects')
export class WizardController {
  constructor(
    private readonly drafts: WizardDrafts,
    private readonly preview: WizardPreview,
    private readonly creation: ProjectCreation,
    private readonly templateLibrary: ProjectTemplates,
  ) {}

  @Get('drafts/options')
  @Permission('project.create')
  @ApiOperation({ summary: 'گزینه‌های ویزارد', operationId: 'getWizardOptions', description: 'نوع‌ها، تقویم‌ها، کد پیشنهادی، کاربر جاری' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  options() {
    return this.preview.options();
  }

  @Get('code-available')
  @Permission('project.create')
  @ApiOperation({ summary: 'یکتایی کد پروژه', operationId: 'checkProjectCode', description: 'AC-PS-03؛ C05' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  codeAvailable(@Query() query: CodeAvailabilityQuery) {
    return this.preview.codeAvailability(query.code);
  }

  @Post('drafts/schedule-preview')
  @HttpCode(HttpStatus.OK)
  @Permission('project.create')
  @ApiOperation({ summary: 'مدت، روز کاری و ذخیره', operationId: 'previewSchedule', description: 'F02 ۵.۲؛ AC-PS-01، AC-PS-02' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  schedulePreview(@Body() body: WizardScheduleDto) {
    return this.preview.schedulePreview(body);
  }

  @Get('drafts/templates')
  @Permission('project.create')
  @ApiOperation({ summary: 'قالب‌های ویزارد', operationId: 'getWizardTemplates', description: 'F16 ۵.۳؛ فقط قالب‌های منتشرشده و بایگانی‌نشده (AC-TP-08)' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  templates(@Query('projectTypeId') projectTypeId?: string) {
    return this.templateLibrary.forWizard(projectTypeId || null);
  }

  @Post('drafts/team-check')
  @HttpCode(HttpStatus.OK)
  @Permission('project.create')
  @ApiOperation({ summary: 'ترکیب و هشدار تیم', operationId: 'checkWizardTeam', description: 'F02 ۵.۳' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  teamCheck(@Body() body: TeamCheckRequest) {
    return this.preview.teamCheck(body);
  }

  @Post('drafts/summary')
  @HttpCode(HttpStatus.OK)
  @Permission('project.create')
  @ApiOperation({ summary: 'خلاصه و مانع‌های ساخت', operationId: 'summarizeWizard', description: 'F02 ۵.۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  summary(@Body() body: WizardDraftRequest) {
    return this.preview.summary(body);
  }

  @Post('drafts')
  @Permission('project.create')
  @ApiOperation({ summary: 'ذخیرهٔ پیش‌نویس تازه', operationId: 'createWizardDraft', description: 'F02 ۵.۵' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  createDraft(@Body() body: WizardDraftRequest) {
    return this.drafts.save(null, body);
  }

  @Put('drafts/:draftId')
  @Permission('project.create')
  @ApiOperation({ summary: 'ذخیرهٔ پیش‌نویس', operationId: 'saveWizardDraft', description: 'F02 ۵.۵؛ فقط سازنده' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  saveDraft(@Param('draftId', draftId) id: string, @Body() body: WizardDraftRequest) {
    return this.drafts.save(id, body);
  }

  @Get('drafts/:draftId')
  @Permission('project.create')
  @ApiOperation({ summary: 'پیش‌نویس ویزارد', operationId: 'getWizardDraft' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  getDraft(@Param('draftId', draftId) id: string) {
    return this.drafts.get(id);
  }

  @Delete('drafts/:draftId')
  @Permission('project.create')
  @ApiOperation({ summary: 'حذف پیش‌نویس ویزارد', operationId: 'deleteWizardDraft' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  deleteDraft(@Param('draftId', draftId) id: string) {
    return this.drafts.delete(id);
  }

  @Post('drafts/:draftId/create')
  @Permission('project.create')
  @ApiOperation({
    summary: 'ساخت پروژه از پیش‌نویس',
    operationId: 'createProjectFromDraft',
    description: 'F02 ۵.۴: پروژهٔ پیش‌نویس، تنظیمات، تقویم، تیم، ProjectCreated. قالب و دعوت فعلاً مانع‌اند.',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true })
  create(@Param('draftId', draftId) id: string) {
    return this.creation.create(id);
  }
}
