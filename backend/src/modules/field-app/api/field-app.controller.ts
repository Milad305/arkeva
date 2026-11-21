import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { DeviceHeartbeats, ISSUE_EFFECTS, ISSUE_TYPES, type IssueEffect, type IssueType } from '../../field/index.js';
import { AppIssues } from '../application/app-issues.js';
import { AppReports } from '../application/app-reports.js';
import { AppSync } from '../application/app-sync.js';

// API اپ کارگاه زیر `/v1/field/…` (06؛ field-app.md ۵.۲). کد همهٔ مسیرها `report.submit` (سرپرست) و پروژه در سرویس سنجیده
// می‌شود. عکس‌ها با `/uploads` (نوع photo؛ تصمیم 1405/08/24)؛ مشکل کارگاه با برش ریسک‌ها.

const WEATHER = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'dusty'] as const;

export class ValuesDto {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly reportedPercent?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly quantityToday?: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'کلید گام ← درصد' }) @IsOptional() @IsObject() readonly steps?: Record<string, number> | null;
}

export class GpsDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) readonly lat!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) readonly lng!: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() @Min(0) readonly accuracyM?: number | null;
}

export class ReportItemDto {
  @ApiProperty({ format: 'uuid', description: 'ساخته‌شده در گوشی (D10)' }) @IsUUID() readonly id!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly wbsItemId!: string;
  @ApiProperty({ type: ValuesDto }) @ValidateNested() @Type(() => ValuesDto) readonly values!: ValuesDto;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(10_000) readonly crewCount?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) readonly note?: string | null;
}

export class ReportPhotoDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly id!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly itemId!: string | null;
  @ApiProperty() @Matches(/^[0-9a-fA-F]{64}$/, { message: 'هش عکس باید SHA-256 باشد.' }) readonly sha256!: string;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() readonly takenAt!: Date;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly lat?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly lng?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly accuracyM?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) readonly caption?: string | null;
}

export class AppReportDto {
  @ApiProperty({ format: 'uuid', description: 'ساخته‌شده در گوشی؛ ارسال دوباره بی‌اثر (D10)' }) @IsUUID() readonly id!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly projectId!: string;
  @ApiProperty({ format: 'date' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) readonly workDate!: string;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() readonly deviceRecordedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(30) readonly appVersion?: string | null;
  @ApiPropertyOptional({ type: GpsDto, nullable: true }) @IsOptional() @ValidateNested() @Type(() => GpsDto) readonly gps?: GpsDto | null;
  @ApiPropertyOptional({ enum: WEATHER, nullable: true }) @IsOptional() @IsIn(WEATHER) readonly weather?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(-60) @Max(70) readonly temperatureC?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) readonly note?: string | null;
  @ApiProperty({ description: 'تعهد M08' }) @IsBoolean() readonly attested!: boolean;
  @ApiPropertyOptional({ description: 'تشخیص mock location اندروید' }) @IsOptional() @IsBoolean() readonly mockLocation?: boolean;
  @ApiProperty({ type: [ReportItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReportItemDto)
  readonly items!: ReportItemDto[];
  @ApiPropertyOptional({ type: [ReportPhotoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ReportPhotoDto)
  readonly photos?: ReportPhotoDto[];
}

/** عکس تازهٔ اصلاح؛ آیتم همان مسیر است (field-app.md ۴.۷؛ تصمیم 1405/08/30). */
export class RevisionPhotoDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly id!: string;
  @ApiProperty() @Matches(/^[0-9a-fA-F]{64}$/, { message: 'هش عکس باید SHA-256 باشد.' }) readonly sha256!: string;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() readonly takenAt!: Date;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly lat?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly lng?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() readonly accuracyM?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) readonly caption?: string | null;
}

export class ResubmitDto {
  @ApiProperty({ type: ValuesDto }) @ValidateNested() @Type(() => ValuesDto) readonly values!: ValuesDto;
  @ApiPropertyOptional({ type: [RevisionPhotoDto], description: 'عکس‌های تازه؛ جدا با /uploads (kind=photo) بارگذاری می‌شوند' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RevisionPhotoDto)
  readonly photos?: RevisionPhotoDto[];
  @ApiPropertyOptional({ nullable: true, description: 'پاسخ به ناظر' }) @IsOptional() @IsString() @MaxLength(2000) readonly note?: string | null;
}

export class HeartbeatDto {
  @ApiProperty() @IsInt() @Min(0) readonly queuedReports!: number;
  @ApiProperty() @IsInt() @Min(0) readonly queuedPhotos!: number;
  @ApiProperty() @IsInt() @Min(0) readonly queuedBytes!: number;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @Type(() => Date) @IsDate() readonly oldestQueuedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(30) readonly appVersion?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @Type(() => Date) @IsDate() readonly lastSyncAt?: Date | null;
  @ApiProperty() @IsBoolean() readonly wifiOnly!: boolean;
}

class IssuePhotoDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly id!: string;
  @ApiProperty() @Matches(/^[0-9a-fA-F]{64}$/) readonly sha256!: string;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() readonly takenAt!: Date;
}

class AppIssueDto {
  @ApiProperty({ format: 'uuid', description: 'UUID ساخته‌شده در گوشی' }) @IsUUID() readonly id!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly projectId!: string;
  @ApiProperty({ enum: ISSUE_TYPES }) @IsIn(ISSUE_TYPES) readonly type!: IssueType;
  @ApiProperty() @IsString() @MaxLength(200) readonly title!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(4000) readonly description?: string | null;
  @ApiProperty({ enum: ISSUE_EFFECTS }) @IsIn(ISSUE_EFFECTS) readonly effect!: IssueEffect;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly wbsItemId?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) @Type(() => Date) @IsDate() readonly deviceRecordedAt!: Date;
  @ApiPropertyOptional({ type: [IssuePhotoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => IssuePhotoDto)
  readonly photos?: IssuePhotoDto[];
}

@ApiTags('اپ کارگاه')
@Controller('field')
export class FieldAppController {
  constructor(
    private readonly sync: AppSync,
    private readonly reports: AppReports,
    private readonly issues: AppIssues,
    private readonly heartbeats: DeviceHeartbeats,
    private readonly context: AppContext,
  ) {}

  @Get('sync')
  @Permission('report.submit')
  @ApiOperation({
    summary: 'همگام‌سازی اپ',
    operationId: 'fieldSync',
    description: 'پروژه‌ها، فعالیت‌ها با برنامهٔ ۱۴ روزه، آیتم‌های من و درخواست‌های اصلاح (field-app.md ۵.۱)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  getSync() {
    return this.sync.snapshot();
  }

  @Post('reports')
  @HttpCode(HttpStatus.OK)
  @Permission('report.submit')
  @ApiOperation({ summary: 'ارسال گزارش', operationId: 'fieldSubmitReport', description: 'upsert با UUID گوشی؛ پاسخ: وضعیت و پرچم هر آیتم و reportNo' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  submit(@Body() body: AppReportDto) {
    return this.reports.submit(body);
  }

  @Put('items/:itemId')
  @Permission('report.submit')
  @ApiOperation({ summary: 'ارسال دوباره پس از اصلاح', operationId: 'fieldResubmitItem', description: 'فقط needs_revision (F09 ۴.۵)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  resubmit(@Param('itemId', new ParseUUIDPipe()) itemId: string, @Body() body: ResubmitDto) {
    return this.reports.resubmit(itemId, body);
  }

  @Post('issues')
  @HttpCode(HttpStatus.OK)
  @Permission('risk.create_site_issue')
  @ApiOperation({
    summary: 'مشکل کارگاه',
    operationId: 'fieldReportIssue',
    description: 'M13؛ upsert با UUID گوشی (AC-RK-05)؛ ریسک identified با منبع field و NT-RSK-04',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  reportIssue(@Body() body: AppIssueDto) {
    return this.issues.submit(body);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @Permission('report.submit')
  @ApiOperation({ summary: 'ضربان صف گوشی', operationId: 'fieldHeartbeat', description: 'G7؛ AL-FLD-04 و W23' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  heartbeat(@Body() body: HeartbeatDto) {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return this.heartbeats.record(actor, {
      queuedReports: body.queuedReports,
      queuedPhotos: body.queuedPhotos,
      queuedBytes: body.queuedBytes,
      oldestQueuedAt: body.oldestQueuedAt ?? null,
      appVersion: body.appVersion ?? null,
      lastSyncAt: body.lastSyncAt ?? null,
      wifiOnly: body.wifiOnly,
    });
  }
}
