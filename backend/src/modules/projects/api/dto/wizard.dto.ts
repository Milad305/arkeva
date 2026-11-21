import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PROJECT_ROLE_CODES, type ProjectRoleCode } from '@projeyar/shared';
import type { StructureMode, WizardState, WizardStep } from '../../domain/rules/wizard.js';

// ورودی ویزارد (F02 ۵) — همان ProjectWizardDraft فرانت بی id و updatedAt. پیش‌نویس ناقص هم معتبر است؛
// کامل‌بودن را «مانع‌ها» می‌سنجند، نه اعتبارسنجی شکل.

const DATE = { strict: true, message: 'تاریخ را به شکل درست بدهید.' } as const;

export class WizardBasicDto {
  @ApiProperty() @IsString() @MaxLength(200, { message: 'نام پروژه حداکثر ۲۰۰ نویسه است.' }) readonly name!: string;
  @ApiProperty({ example: 'PRJ-1405-001' }) @IsString() @MaxLength(20) readonly code!: string;
  @ApiProperty() @IsString() @MaxLength(200, { message: 'نام کارفرما حداکثر ۲۰۰ نویسه است.' }) readonly clientName!: string;
  @ApiProperty({ type: String, nullable: true, description: 'کلید نوع پروژه' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly projectTypeId!: string | null;
  @ApiProperty() @IsString() @MaxLength(300) readonly location!: string;
  @ApiProperty({ type: String, nullable: true, description: 'با ذخیره‌سازی فایل می‌آید؛ فعلاً نادیده' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly imageName!: string | null;
}

export class WizardMilestoneDto {
  @ApiProperty() @IsString() @MaxLength(50) readonly key!: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly title!: string;
  @ApiProperty({ type: String, format: 'date', nullable: true }) @IsOptional() @IsISO8601(DATE) readonly date!: string | null;
}

export class WizardScheduleDto {
  @ApiProperty({ type: String, format: 'date', nullable: true }) @IsOptional() @IsISO8601(DATE) readonly plannedStart!: string | null;
  @ApiProperty({ type: String, format: 'date', nullable: true }) @IsOptional() @IsISO8601(DATE) readonly plannedFinish!: string | null;
  @ApiProperty({ example: 'cal-site6' }) @IsString() @MaxLength(50) readonly calendarPresetId!: string;
  @ApiProperty({ enum: ['rial', 'toman'] }) @IsIn(['rial', 'toman'], { message: 'واحد پول در نسخهٔ اول فقط ریال یا تومان است.' }) readonly currency!:
    'rial' | 'toman';
  @ApiProperty({ type: String, nullable: true, description: 'ریال صحیح (C02)' })
  @IsOptional()
  @Matches(/^\d{1,19}$/, { message: 'بودجهٔ کل را به عدد ریال بنویسید.' })
  readonly plannedTotalBudget!: string | null;
  @ApiProperty({ type: Number, nullable: true, description: '۰ تا ۲۰' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'درصد ذخیره را با حداکثر چهار رقم اعشار بنویسید.' })
  readonly contingencyPct!: number | null;
  @ApiProperty({ type: [WizardMilestoneDto] })
  @IsArray()
  @ArrayMaxSize(30, { message: 'حداکثر ۳۰ نقطهٔ عطف.' })
  @ValidateNested({ each: true })
  @Type(() => WizardMilestoneDto)
  readonly milestones!: WizardMilestoneDto[];
}

export class WizardMemberDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) @IsOptional() @IsUUID('all') readonly userId!: string | null;
  @ApiProperty() @IsString() @MaxLength(200) readonly fullName!: string;
  @ApiProperty() @IsString() @MaxLength(10) readonly avatarTone!: string;
  @ApiProperty({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(200) readonly inviteTarget!: string | null;
  @ApiProperty({ enum: PROJECT_ROLE_CODES, isArray: true })
  @IsArray()
  @IsIn(PROJECT_ROLE_CODES, { each: true, message: 'نقش را از فهرست انتخاب کنید.' })
  readonly roles!: ProjectRoleCode[];
  @ApiProperty({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(300) readonly note!: string | null;
}

export class WizardManagerDisplayDto {
  @ApiProperty() @IsString() @MaxLength(200) readonly fullName!: string;
  @ApiProperty() @IsString() @MaxLength(10) readonly avatarTone!: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly contact!: string;
}

export class WizardTeamDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) @IsOptional() @IsUUID('all') readonly managerUserId!: string | null;
  @ApiProperty({ type: WizardManagerDisplayDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => WizardManagerDisplayDto)
  readonly managerDisplay!: WizardManagerDisplayDto | null;
  @ApiProperty({ type: [WizardMemberDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WizardMemberDto)
  readonly members!: WizardMemberDto[];
}

export class WizardStructureDto {
  @ApiProperty({ enum: ['empty', 'msp', 'template'] }) @IsIn(['empty', 'msp', 'template']) readonly mode!: StructureMode;
  @ApiProperty({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(50) readonly templateId!: string | null;
}

export class WizardDraftRequest implements WizardState {
  @ApiProperty({ enum: [1, 2, 3, 4] }) @IsIn([1, 2, 3, 4]) readonly step!: WizardStep;
  @ApiProperty({ type: WizardBasicDto }) @ValidateNested() @Type(() => WizardBasicDto) readonly basic!: WizardBasicDto;
  @ApiProperty({ type: WizardScheduleDto }) @ValidateNested() @Type(() => WizardScheduleDto) readonly schedule!: WizardScheduleDto;
  @ApiProperty({ type: WizardTeamDto }) @ValidateNested() @Type(() => WizardTeamDto) readonly team!: WizardTeamDto;
  @ApiProperty({ type: WizardStructureDto }) @ValidateNested() @Type(() => WizardStructureDto) readonly structure!: WizardStructureDto;
  @ApiProperty() @IsBoolean() readonly sendInvites!: boolean;
}

export class TeamCheckRequest {
  @ApiProperty({ type: WizardBasicDto }) @ValidateNested() @Type(() => WizardBasicDto) readonly basic!: WizardBasicDto;
  @ApiProperty({ type: WizardTeamDto }) @ValidateNested() @Type(() => WizardTeamDto) readonly team!: WizardTeamDto;
  @ApiPropertyOptional({ type: WizardStructureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WizardStructureDto)
  readonly structure?: WizardStructureDto;
}

export class CodeAvailabilityQuery {
  @ApiProperty({ example: 'PRJ-1405-001' }) @IsString() @MaxLength(20) readonly code!: string;
}

export class OfficialHolidaysQuery {
  @ApiProperty({ example: 1405 })
  @Type(() => Number)
  @IsNumber()
  @Min(1300)
  @Max(1500)
  readonly year!: number;
}

export class OrgHolidayRequest {
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601(DATE) readonly date!: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly title!: string;
}
