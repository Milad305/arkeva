import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROJECT_STATUSES, type ProjectStatus } from '@projeyar/shared';
import type { ProjectListItemView } from '../../application/project-queries.js';

export class ListProjectsQuery {
  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES, { message: 'وضعیت پروژه را از فهرست انتخاب کنید.' })
  readonly status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'جست‌وجو در نام و کد', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'عبارت جست‌وجو بیش از اندازه بلند است.' })
  readonly q?: string;
}

export class PersonRefResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly fullName!: string;
  @ApiProperty({ example: 'a5', description: 'رنگ آواتار kit.css' }) readonly avatarTone!: string;
}

export class ProjectListItemResponse implements ProjectListItemView {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ example: 'PRJ-1404-021' }) readonly code!: string;
  @ApiProperty() readonly name!: string;
  @ApiProperty() readonly clientName!: string;
  @ApiProperty({ description: 'کلید نوع پروژه در فهرست سازمان', example: 'residential' }) readonly projectTypeId!: string;
  @ApiProperty() readonly projectTypeName!: string;
  @ApiProperty({ enum: PROJECT_STATUSES }) readonly status!: ProjectStatus;
  @ApiProperty({ type: PersonRefResponse }) readonly manager!: PersonRefResponse;
  @ApiProperty({ type: [PersonRefResponse] }) readonly memberPreview!: PersonRefResponse[];
  @ApiProperty() readonly memberCount!: number;
  @ApiProperty({ type: String, format: 'date', nullable: true }) readonly plannedFinish!: string | null;
  @ApiProperty() readonly mspLinked!: boolean;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'ProjectProgress (F10؛ D07)؛ پیش‌نویس تهی. مبالغ (bac، pv، ev، ac، eac، cv، sv، vac) بی cbs.view_amounts نمی‌آیند',
  })
  readonly progress!: ProjectListItemView['progress'];
  @ApiPropertyOptional({ description: 'AC ÷ BAC × ۱۰۰؛ فقط با cbs.view_amounts' }) readonly budgetConsumedPercent?: number;
  @ApiProperty({ description: 'ب24: انحراف ≤ −۱۵ یا CPI < ۰٫۹ در پروژهٔ فعال' }) readonly atRisk!: boolean;
  @ApiProperty() readonly wizardIncomplete!: boolean;
}
