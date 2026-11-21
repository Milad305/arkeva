import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ReportOutputs } from '../application/report-outputs.js';
import { ReportSchedules } from '../application/report-schedules.js';
import { ReportLibrary } from '../application/report-library.js';
import { type Audience, type Category, CATEGORIES, type Format, type Scope, SECTION_KEYS, type SectionKey } from '../domain/catalog.js';

// F18 — گزارش‌های مدیریتی (W25؛ management-reports.md ۱۰، ۱۱). `projects/:scope` شناسهٔ پروژه یا «org» (سطح سازمان؛ تصمیم کاربر
// 1405/08/26)؛ کد پروژه را سرویس می‌سنجد، پس نگهبان مسیر فقط «دست‌کم یک پروژه» را می‌بیند.

const uuid = new ParseUUIDPipe();
const FORMATS = ['pdf', 'xlsx'] as const;
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'on_period_close'] as const;

class TemplateDto {
  @ApiProperty() @IsString() @MaxLength(120) readonly name!: string;
  @ApiProperty() @IsString() @MaxLength(500) readonly description!: string;
  @ApiProperty({ enum: CATEGORIES }) @IsIn(CATEGORIES) readonly category!: Category;
  @ApiProperty({ enum: ['internal', 'client'] }) @IsIn(['internal', 'client']) readonly audience!: Audience;
  @ApiProperty({ enum: ['project', 'portfolio'] }) @IsIn(['project', 'portfolio']) readonly scope!: Scope;
  @ApiProperty({ enum: SECTION_KEYS, isArray: true }) @IsArray() @ArrayMaxSize(11) @IsIn(SECTION_KEYS, { each: true }) readonly sections!: SectionKey[];
  @ApiProperty({ enum: FORMATS, isArray: true }) @IsArray() @IsIn(FORMATS, { each: true }) readonly formats!: Format[];
}

class RangesQuery {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly projectId?: string;
}

class PreviewDto {
  @ApiProperty() @IsString() @MaxLength(60) readonly templateId!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly rangeId!: string;
  @ApiPropertyOptional({ enum: SECTION_KEYS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(SECTION_KEYS, { each: true })
  readonly disabledSections?: SectionKey[];
}

class GenerateDto extends PreviewDto {
  @ApiProperty({ enum: FORMATS }) @IsIn(FORMATS) readonly format!: Format;
}

class RecipientDto {
  @ApiProperty({ enum: ['user', 'role', 'email'] }) @IsIn(['user', 'role', 'email']) readonly kind!: 'user' | 'role' | 'email';
  @ApiProperty() @IsString() @MaxLength(200) readonly id!: string;
}

class SendDto {
  @ApiPropertyOptional() @IsOptional() @IsString() readonly projectId?: string | null;
  @ApiProperty() @IsString() @MaxLength(60) readonly templateId!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly rangeId!: string;
  @ApiProperty({ type: [RecipientDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  readonly recipients!: RecipientDto[];
}

class ScheduleDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly id?: string | null;
  @ApiProperty() @IsString() @MaxLength(60) readonly templateId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly projectId!: string | null;
  @ApiProperty({ enum: FORMATS }) @IsIn(FORMATS) readonly format!: Format;
  @ApiProperty({ enum: FREQUENCIES }) @IsIn(FREQUENCIES) readonly frequency!: (typeof FREQUENCIES)[number];
  @ApiProperty({ nullable: true, description: 'صفر یکشنبه تا شش شنبه' }) @IsOptional() @IsInt() @Min(0) @Max(6) readonly weekday!: number | null;
  @ApiProperty({ nullable: true, description: 'روز ماه شمسی' }) @IsOptional() @IsInt() @Min(1) @Max(31) readonly dayOfMonth!: number | null;
  @ApiProperty({ example: '08:00' }) @Matches(/^\d{2}:\d{2}$/) readonly timeOfDay!: string;
  @ApiProperty() @IsBoolean() readonly workingDaysOnly!: boolean;
  @ApiProperty({ type: [RecipientDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  readonly recipients!: RecipientDto[];
  @ApiProperty() @IsBoolean() readonly enabled!: boolean;
  @ApiPropertyOptional({ description: 'نادیده؛ سرور خودش می‌سنجد' }) @IsOptional() @IsBoolean() readonly canSendExternal?: boolean;
}

class UpdateScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() readonly id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) readonly templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() readonly projectId?: string | null;
  @ApiPropertyOptional({ enum: FORMATS }) @IsOptional() @IsIn(FORMATS) readonly format?: Format;
  @ApiPropertyOptional({ enum: FREQUENCIES }) @IsOptional() @IsIn(FREQUENCIES) readonly frequency?: (typeof FREQUENCIES)[number];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(6) readonly weekday?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(31) readonly dayOfMonth?: number | null;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{2}:\d{2}$/) readonly timeOfDay?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly workingDaysOnly?: boolean;
  @ApiPropertyOptional({ type: [RecipientDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  readonly recipients?: RecipientDto[];
  @ApiProperty() @IsBoolean() readonly enabled!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly canSendExternal?: boolean;
}

@ApiTags('گزارش‌های مدیریتی')
@Controller()
export class ReportsController {
  constructor(
    private readonly library: ReportLibrary,
    private readonly outputs: ReportOutputs,
    private readonly schedules: ReportSchedules,
  ) {}

  @Get('report-templates')
  @Permission('reports.view')
  @ApiOperation({ summary: 'کتابخانهٔ قالب‌ها', operationId: 'getReportTemplates', description: 'W25؛ قالب‌های سیستمی و سفارشی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  templates() {
    return this.library.list();
  }

  @Post('report-templates')
  @Permission('reports.custom_template')
  @ApiOperation({ summary: 'قالب سفارشی', operationId: 'createCustomTemplate', description: 'G21؛ ترکیب بخش‌های آماده' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  create(@Body() body: TemplateDto) {
    return this.library.create(body);
  }

  @Get('report-templates/options')
  @Permission('reports.view')
  @ApiOperation({ summary: 'گزینه‌های فرم گزارش', operationId: 'getReportOptions', description: 'پروژه‌ها، کاربران، نقش‌ها' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  options() {
    return this.library.options();
  }

  @Get('report-templates/ranges')
  @Permission('reports.view')
  @ApiOperation({ summary: 'بازه‌های آماده', operationId: 'getReportRanges', description: '۷.۱: هفتهٔ گذشته و دوره‌های گزارش' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  ranges(@Query() query: RangesQuery) {
    return this.library.rangeOptions(query.projectId ?? null);
  }

  @Post('projects/:scope/reports/preview')
  @HttpCode(HttpStatus.OK)
  @Permission('reports.view')
  @ApiOperation({ summary: 'پیش‌نمایش گزارش', operationId: 'getReportPreview', description: 'همان محتوای فایل؛ مبلغ به اندازهٔ دسترسی (D11)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  preview(@Param('scope') scope: string, @Body() body: PreviewDto) {
    return this.library.preview(scope, body);
  }

  @Post('projects/:scope/reports')
  @Permission('reports.generate')
  @ApiOperation({ summary: 'تولید گزارش', operationId: 'generateReport', description: '۷.۲؛ صف report.generate' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  generate(@Param('scope') scope: string, @Body() body: GenerateDto) {
    return this.outputs.generate(scope, body);
  }

  @Get('reports')
  @Permission('reports.view')
  @ApiOperation({ summary: 'خروجی‌های اخیر', operationId: 'getGeneratedReports', description: 'W25' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  list() {
    return this.outputs.list();
  }

  @Get('reports/:reportId/download')
  @Permission('reports.view')
  @ApiOperation({ summary: 'دانلود خروجی', operationId: 'downloadReport', description: 'لینک امضاشدهٔ کوتاه‌مدت' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  download(@Param('reportId', uuid) reportId: string) {
    return this.outputs.download(reportId);
  }

  @Delete('reports/:reportId')
  @Permission('reports.generate')
  @ApiOperation({ summary: 'حذف خروجی', operationId: 'deleteGeneratedReport', description: '۷.۵: سازنده یا مدیر پروژه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  remove(@Param('reportId', uuid) reportId: string) {
    return this.outputs.remove(reportId);
  }

  @Post('projects/:scope/reports/send')
  @HttpCode(HttpStatus.OK)
  @Permission('reports.generate')
  @ApiOperation({
    summary: 'ارسال به گیرندگان',
    operationId: 'sendReport',
    description: 'بخش ۷.۳: دو نسخه برای گیرندگان مختلط؛ بیرونی با reports.send_external',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  send(@Param('scope') scope: string, @Body() body: SendDto) {
    return this.outputs.send(scope, body);
  }

  @Get('report-schedules')
  @Permission('reports.view')
  @ApiOperation({ summary: 'زمان‌بندی‌ها', operationId: 'getSchedules', description: 'W25' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  scheduleList() {
    return this.schedules.list();
  }

  @Post('report-schedules')
  @Permission('reports.view')
  @ApiOperation({
    summary: 'زمان‌بندی تازه',
    operationId: 'saveSchedule',
    description: 'reports.schedule یا برای قالب مالی reports.schedule_financial؛ سرویس می‌سنجد',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ unprocessable: true })
  createSchedule(@Body() body: ScheduleDto) {
    return this.schedules.save({ ...body, id: null });
  }

  @Patch('report-schedules/:scheduleId')
  @Permission('reports.view')
  @ApiOperation({ summary: 'ویرایش یا توقف زمان‌بندی', operationId: 'updateSchedule', description: 'بدنهٔ کامل ویرایش می‌کند؛ فقط enabled توقف یا ازسرگیری' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  updateSchedule(@Param('scheduleId', uuid) scheduleId: string, @Body() body: UpdateScheduleDto) {
    if (!body.templateId || !body.format || !body.frequency || !body.timeOfDay || !body.recipients) return this.schedules.toggle(scheduleId, body.enabled);
    return this.schedules.save({
      id: scheduleId,
      templateId: body.templateId,
      projectId: body.projectId ?? null,
      format: body.format,
      frequency: body.frequency,
      weekday: body.weekday ?? null,
      dayOfMonth: body.dayOfMonth ?? null,
      timeOfDay: body.timeOfDay,
      workingDaysOnly: body.workingDaysOnly ?? false,
      recipients: body.recipients,
      enabled: body.enabled,
    });
  }

  @Delete('report-schedules/:scheduleId')
  @Permission('reports.view')
  @ApiOperation({ summary: 'حذف زمان‌بندی', operationId: 'deleteSchedule', description: 'سازنده یا مدیر پروژه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  deleteSchedule(@Param('scheduleId', uuid) scheduleId: string) {
    return this.schedules.remove(scheduleId);
  }

  @Post('report-schedules/:scheduleId/run-now')
  @HttpCode(HttpStatus.OK)
  @Permission('reports.view')
  @ApiOperation({ summary: 'اجرای همین حالا', operationId: 'runScheduleNow', description: 'همان بازه و گیرندگان؛ نوبت منظم عوض نمی‌شود' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  runNow(@Param('scheduleId', uuid) scheduleId: string) {
    return this.schedules.runNow(scheduleId);
  }
}
