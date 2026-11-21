import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

// قرارداد W16، W17، W42 و W29 — همان `frontend/src/modules/{team,settings}/types`.

const ASSIGNABLE_ROLES = ['planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export class InviteDto {
  @ApiProperty({ enum: ['sms', 'email'] }) @IsIn(['sms', 'email']) readonly channel!: 'sms' | 'email';
  @ApiProperty() @IsString() @MaxLength(200) readonly target!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(120) readonly fullName?: string | null;
}

export class AreaRefDto {
  @ApiProperty() @IsString() @MaxLength(120) readonly name!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) readonly rootIds!: string[];
}

export class AddMemberDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly userId?: string | null;
  @ApiPropertyOptional({ type: InviteDto, nullable: true }) @IsOptional() @ValidateNested() @Type(() => InviteDto) readonly invite?: InviteDto | null;
  @ApiProperty({ enum: ASSIGNABLE_ROLES, isArray: true }) @IsArray() @ArrayMaxSize(5) @IsIn(ASSIGNABLE_ROLES, { each: true }) readonly roles!: AssignableRole[];
  @ApiPropertyOptional({ type: AreaRefDto, nullable: true }) @IsOptional() @ValidateNested() @Type(() => AreaRefDto) readonly area?: AreaRefDto | null;
  @ApiPropertyOptional({ description: 'پیامک نصب اپ — با کانال‌های اعلان (برش ۱۱)' }) @IsOptional() @IsBoolean() readonly sendAppSms?: boolean;
}

export class UpdateRolesDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, isArray: true }) @IsArray() @ArrayMaxSize(5) @IsIn(ASSIGNABLE_ROLES, { each: true }) readonly roles!: AssignableRole[];
}

export class RemoveMemberDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null = برگ‌ها بی‌سرپرست بمانند' }) @IsOptional() @IsUUID() readonly transferTo?:
    string | null;
}

export class AssignDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(2000) @IsUUID('all', { each: true }) readonly wbsItemIds!: string[];
  @ApiProperty({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly supervisorUserId!: string | null;
}

/** پیش‌نمایش با query: `wbsItemIds` جداشده با ویرگول و `supervisorUserId` خالی = بی‌سرپرست. */
export class AssignPreviewQuery {
  @ApiPropertyOptional({ description: 'شناسه‌ها با ویرگول' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  readonly wbsItemIds?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? undefined : value))
  @IsUUID()
  readonly supervisorUserId?: string;
}

export class AreaDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly id!: string | null;
  @ApiProperty() @IsString() @MaxLength(120) readonly areaName!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) readonly rootIds!: string[];
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() readonly reviewerUserId!: string | null;
}

export class SaveAreasDto {
  @ApiProperty({ type: [AreaDto] }) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => AreaDto) readonly areas!: AreaDto[];
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly fallbackApproverId!: string;
}
