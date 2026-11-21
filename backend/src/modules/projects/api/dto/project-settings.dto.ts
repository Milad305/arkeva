import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { APPROVAL_MODES, DEADLINE_ACTIONS, EAC_METHODS, GPS_MODES, WEEKDAY_KEYS, WEIGHT_GENERATORS } from '../../domain/project-settings.entity.js';
import type { FieldPatch, GeneralPatch, ProgressPatch, WorkflowPatch } from '../../application/project-settings.views.js';

// ورودی تنظیمات پروژه (F02 ۷). هر بخش جدا؛ بازه‌ها همان ماک و قیدهای پایگاه داده. قواعد چندفیلدی در سرویس.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = { strict: true, message: 'تاریخ را به شکل درست بدهید.' } as const;

export class GeneralPatchDto implements GeneralPatch {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3, { message: 'نام پروژه را بنویسید.' }) @MaxLength(200) readonly name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1, { message: 'کارفرما را بنویسید.' }) @MaxLength(200) readonly clientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) readonly projectTypeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500, { message: 'توضیحات حداکثر ۵۰۰ نویسه است.' }) readonly description?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601(DATE) readonly plannedStart?: string;
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true }) @IsOptional() @IsISO8601(DATE) readonly plannedFinish?: string | null;
  @ApiPropertyOptional({ enum: ['rial', 'toman'] })
  @IsOptional()
  @IsIn(['rial', 'toman'], { message: 'واحد پول در نسخهٔ اول فقط ریال یا تومان است.' })
  readonly currency?: 'rial' | 'toman';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) readonly location?: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) @ValidateIf((_, value) => value !== null && value !== undefined) @IsNumber() readonly siteLat?:
    number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @ValidateIf((_, value) => value !== null && value !== undefined) @IsNumber() readonly siteLng?:
    number | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'با ذخیره‌سازی فایل؛ فعلاً نادیده' }) @IsOptional() @IsString() readonly imageName?:
    string | null;
}

export class ProgressPatchDto implements ProgressPatch {
  @ApiPropertyOptional({ enum: WEIGHT_GENERATORS }) @IsOptional() @IsIn(WEIGHT_GENERATORS) readonly weightGenerator?: (typeof WEIGHT_GENERATORS)[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly showFinancialProgress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(100) readonly warningThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(100) readonly criticalThreshold?: number;
  @ApiPropertyOptional({ enum: EAC_METHODS }) @IsOptional() @IsIn(EAC_METHODS) readonly eacMethod?: (typeof EAC_METHODS)[number];
  @ApiPropertyOptional({ type: String, nullable: true, description: 'با F04' }) @IsOptional() @IsString() readonly pvReferenceVersionId?: string | null;
}

export class FieldPatchDto implements FieldPatch {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'حداقل عکس بین ۰ تا ۱۰ است.' })
  @Max(10, { message: 'حداقل عکس بین ۰ تا ۱۰ است.' })
  readonly minPhotos?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(5, { message: 'حداکثر جهش بین ۵ تا ۱۰۰ درصد است.' })
  @Max(100, { message: 'حداکثر جهش بین ۵ تا ۱۰۰ درصد است.' })
  readonly maxJumpPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly allowDecrease?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly offlineEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(720) readonly lateAfterHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly dailyReminderEnabled?: boolean;
  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(TIME, { message: 'ساعت یادآوری را مثل ۱۷:۰۰ بنویسید.' })
  readonly dailyReminderTime?: string;
  @ApiPropertyOptional({ enum: GPS_MODES }) @IsOptional() @IsIn(GPS_MODES) readonly gpsMode?: (typeof GPS_MODES)[number];
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(50, { message: 'شعاع کارگاه بین ۵۰ تا ۵٬۰۰۰ متر است.' })
  @Max(5000, { message: 'شعاع کارگاه بین ۵۰ تا ۵٬۰۰۰ متر است.' })
  readonly gpsRadiusM?: number;
}

export class WorkflowPatchDto implements WorkflowPatch {
  @ApiPropertyOptional({ enum: APPROVAL_MODES }) @IsOptional() @IsIn(APPROVAL_MODES) readonly approvalMode?: (typeof APPROVAL_MODES)[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly stage2OnCritical?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly stage2OnJump?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly stage2OnGpsOut?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly stage2OnCriticalPath?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'مهلت بررسی بین ۱ تا ۱۶۸ ساعت است.' })
  @Max(168, { message: 'مهلت بررسی بین ۱ تا ۱۶۸ ساعت است.' })
  readonly reviewDeadlineHours?: number;
  @ApiPropertyOptional({ enum: DEADLINE_ACTIONS }) @IsOptional() @IsIn(DEADLINE_ACTIONS) readonly onDeadline?: (typeof DEADLINE_ACTIONS)[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly autoApproveEnabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'سقف تأیید خودکار بین ۰ تا ۱۰ درصد است.' })
  @Max(10, { message: 'سقف تأیید خودکار بین ۰ تا ۱۰ درصد است.' })
  readonly autoApproveMaxDelta?: number;
}

/** دقیقاً یکی از چهار بخش (سرویس بیش از یکی را رد می‌کند). */
export class SettingsPatchRequest {
  @ApiPropertyOptional({ type: GeneralPatchDto }) @IsOptional() @ValidateNested() @Type(() => GeneralPatchDto) readonly general?: GeneralPatchDto;
  @ApiPropertyOptional({ type: ProgressPatchDto }) @IsOptional() @ValidateNested() @Type(() => ProgressPatchDto) readonly progress?: ProgressPatchDto;
  @ApiPropertyOptional({ type: FieldPatchDto }) @IsOptional() @ValidateNested() @Type(() => FieldPatchDto) readonly field?: FieldPatchDto;
  @ApiPropertyOptional({ type: WorkflowPatchDto }) @IsOptional() @ValidateNested() @Type(() => WorkflowPatchDto) readonly workflow?: WorkflowPatchDto;
}

export class WorkWeekDayDto {
  @ApiProperty({ enum: WEEKDAY_KEYS }) @IsIn(WEEKDAY_KEYS) readonly day!: (typeof WEEKDAY_KEYS)[number];
  @ApiProperty({ enum: ['full', 'half', 'off'] }) @IsIn(['full', 'half', 'off']) readonly mode!: 'full' | 'half' | 'off';
}

export class CalendarHolidayDto {
  @ApiProperty({ format: 'date' }) @IsISO8601(DATE) readonly date!: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly title!: string;
  @ApiProperty({ enum: ['official', 'manual'] }) @IsIn(['official', 'manual']) readonly type!: 'official' | 'manual';
  @ApiProperty() @IsBoolean() readonly enabled!: boolean;
}

export class CalendarRequest {
  @ApiProperty({ type: [WorkWeekDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkWeekDayDto)
  readonly workWeek!: WorkWeekDayDto[];
  @ApiProperty({ example: '07:00' }) @IsString() readonly dayStart!: string;
  @ApiProperty({ example: '16:00' }) @IsString() readonly dayEnd!: string;
  @ApiProperty({ example: '12:00' }) @IsString() readonly halfDayEnd!: string;
  @ApiProperty({ type: [CalendarHolidayDto] })
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => CalendarHolidayDto)
  readonly holidays!: CalendarHolidayDto[];
}
