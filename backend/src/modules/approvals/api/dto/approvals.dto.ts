import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// قرارداد W20، W40، G10 و W23 — همان `frontend/src/modules/reports/types` و `charts/api/analyticsApi.ts`.

const bool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

export class InboxQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'needs_revision', 'rejected', 'all'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'needs_revision', 'rejected', 'all'])
  readonly tab?: 'pending' | 'approved' | 'needs_revision' | 'rejected' | 'all';

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly projectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly supervisorId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly wbsRootId?: string;
  @ApiPropertyOptional({ enum: ['7d', '30d', 'all'] }) @IsOptional() @IsIn(['7d', '30d', 'all']) readonly range?: '7d' | '30d' | 'all';
  @ApiPropertyOptional() @IsOptional() @Transform(bool) @IsBoolean() readonly flagged?: boolean;
  @ApiPropertyOptional({ enum: ['newest', 'oldest_waiting'] }) @IsOptional() @IsIn(['newest', 'oldest_waiting']) readonly sort?: 'newest' | 'oldest_waiting';
}

export class RequiredActionDto {
  @ApiProperty() @IsString() @MaxLength(40) readonly key!: string;
  @ApiProperty() @IsString() @MaxLength(300) readonly text!: string;
  @ApiProperty({ enum: ['check', 'photo'] }) @IsIn(['check', 'photo']) readonly type!: 'check' | 'photo';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10) readonly minPhotos?: number;
}

export class DecisionDto {
  @ApiProperty({ enum: ['approve', 'request_revision', 'reject'] }) @IsIn(['approve', 'request_revision', 'reject']) readonly decision!:
    'approve' | 'request_revision' | 'reject';
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(2000) readonly note?: string | null;
  @ApiPropertyOptional({ type: [RequiredActionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RequiredActionDto)
  readonly requiredActions?: RequiredActionDto[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true }) readonly unsuitablePhotoIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() readonly confirmOverTotal?: boolean;
}

export class ReportRevisionDto {
  @ApiProperty() @IsString() @MaxLength(2000) readonly note!: string;
  @ApiPropertyOptional({ type: [RequiredActionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RequiredActionDto)
  readonly requiredActions?: RequiredActionDto[];
}

export class NoteDto {
  @ApiProperty() @IsString() @MaxLength(2000) readonly note!: string;
}

export class FieldValuesDto {
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() readonly quantityToday?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() readonly reportedPercent?: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() readonly reportedQuantityInfo?: number | null;
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'number' }, nullable: true }) @IsOptional() @IsObject() readonly steps?: Record<
    string,
    number
  > | null;
}

export class CorrectDto {
  @ApiProperty({ type: FieldValuesDto }) @ValidateNested() @Type(() => FieldValuesDto) readonly values!: FieldValuesDto;
  @ApiProperty() @IsString() @MaxLength(2000) readonly reason!: string;
}

export class ResolveDto {
  @ApiProperty() @IsBoolean() readonly accept!: boolean;
  @ApiProperty() @IsString() @MaxLength(2000) readonly note!: string;
}

export class ManualEntryDto extends FieldValuesDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly wbsItemId!: string;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) readonly workDate!: string;
  @ApiProperty() @IsString() @MaxLength(2000) readonly note!: string;
}

export class ReassignDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly substituteUserId!: string;
}
