import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PROJECT_STATUSES, type ProjectStatus } from '@projeyar/shared';
import type { ProjectDetailView } from '../../application/project-detail.js';
import { ProjectListItemResponse } from './project-list.dto.js';
import type { PlanDraftSummaryView, PlanVersionRefView } from '../../application/plan-ports.js';

export class ReasonRequest {
  @ApiPropertyOptional({ description: 'دلیل؛ برای پایان، بایگانی و بازگشت از پایان اجباری', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'دلیل را به‌صورت متن بنویسید.' })
  @MaxLength(500, { message: 'دلیل حداکثر ۵۰۰ نویسه است.' })
  readonly reason?: string;
}

export class TransitionResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ enum: PROJECT_STATUSES }) readonly status!: ProjectStatus;
}

const OTP = /^\d{6}$/;

export class DeleteProjectRequest {
  @ApiProperty({ description: 'نام دقیق پروژه (W41)' })
  @IsString({ message: 'نام پروژه را برای تأیید بنویسید.' })
  @IsNotEmpty({ message: 'نام پروژه را برای تأیید بنویسید.' })
  @MaxLength(300)
  readonly confirmName!: string;

  @ApiProperty({ description: 'کد پیامکی تأیید (POST /v1/auth/step-up با purpose = project.delete)', example: '123456' })
  @Matches(OTP, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly otp!: string;
}

export class DeleteProjectResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty({ description: '۰ = پیش‌نویس فوراً پاک شد؛ ۱۴ = پنهان و پاک‌سازی پس از مهلت' }) readonly purgeAfterDays!: number;
}

export class TransferManagerRequest {
  @ApiProperty({ format: 'uuid', description: 'عضو فعال دیگر همین پروژه' })
  @IsUUID('all', { message: 'مدیر تازه را از فهرست اعضا انتخاب کنید.' })
  readonly userId!: string;

  @ApiProperty({ description: 'کد پیامکی تأیید (purpose = project.transfer_manager)', example: '123456' })
  @Matches(OTP, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly otp!: string;
}

export class TransferManagerResponse {
  @ApiProperty() readonly managerName!: string;
}

class ProjectPlanResponse {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true, description: 'PlanVersionRef' }) readonly baseline!: PlanVersionRefView | null;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true }) readonly current!: PlanVersionRefView | null;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true }) readonly pvReference!: PlanVersionRefView | null;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true, description: 'PlanDraftSummary' }) readonly draft!: PlanDraftSummaryView | null;
}

class ProjectCountsResponse {
  @ApiProperty() readonly pendingReports!: number;
  @ApiProperty() readonly openRisks!: number;
  @ApiProperty() readonly openHighRisks!: number;
  @ApiProperty() readonly members!: number;
  @ApiProperty({ type: Number, nullable: true }) readonly mspPendingChanges!: number | null;
}

class ProjectDisplayResponse {
  @ApiProperty() readonly warningThreshold!: number;
  @ApiProperty() readonly criticalThreshold!: number;
  @ApiProperty() readonly showFinancialProgress!: boolean;
}

export class ProjectDetailResponse extends ProjectListItemResponse implements ProjectDetailView {
  @ApiProperty({ type: String, nullable: true }) readonly description!: string | null;
  @ApiProperty({ format: 'uuid' }) readonly managerUserId!: string;
  @ApiProperty({ type: String, format: 'date', nullable: true }) readonly plannedStart!: string | null;
  @ApiPropertyOptional({ description: 'ریال؛ بی cbs.view_amounts غایب (D11)', example: '60000000000' }) readonly contingencyReserve?: string;
  @ApiProperty({ enum: ['rial', 'toman'] }) readonly displayCurrencyUnit!: 'rial' | 'toman';
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) readonly baselineVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) readonly currentVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) readonly pvReferenceVersionId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) readonly activatedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) readonly pausedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) readonly completedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) readonly archivedAt!: string | null;
  @ApiProperty({ type: String, format: 'date', nullable: true }) readonly costsCompleteThrough!: string | null;
  @ApiProperty({ type: ProjectPlanResponse }) readonly plan!: ProjectPlanResponse;
  @ApiProperty({ type: ProjectCountsResponse }) readonly counts!: ProjectCountsResponse;
  @ApiProperty({ type: ProjectDisplayResponse }) readonly display!: ProjectDisplayResponse;
}
