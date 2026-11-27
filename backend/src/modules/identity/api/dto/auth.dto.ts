import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PERMISSION_CODES, STEP_UP_PURPOSES, type StepUpPurpose, USER_STATUSES } from '@projeyar/shared';
import type { OrganizationView, SessionView, UserView } from '../../application/session-view.js';

// قرارداد ورود همان `frontend/src/modules/auth/types` است (docs/backend/11). پیام‌ها فارسی.

export class LoginRequest {
  @ApiProperty({ description: 'ایمیل یا شمارهٔ موبایل', example: '09123454321' })
  @IsString({ message: 'نام کاربری یا شمارهٔ موبایل را بنویسید.' })
  @IsNotEmpty({ message: 'نام کاربری یا شمارهٔ موبایل را بنویسید.' })
  @MaxLength(200, { message: 'نام کاربری بیش از اندازه بلند است.' })
  readonly identifier!: string;

  @ApiProperty({ description: 'رمز عبور', format: 'password' })
  @IsString({ message: 'رمز عبور را بنویسید.' })
  @IsNotEmpty({ message: 'رمز عبور را بنویسید.' })
  @MaxLength(200, { message: 'رمز عبور بیش از اندازه بلند است.' })
  readonly password!: string;

  @ApiPropertyOptional({ description: 'فقط شناسهٔ ورود را در مرورگر به خاطر می‌سپارد؛ نشست را طولانی نمی‌کند (F01 ۵.۱)' })
  @IsOptional()
  @IsBoolean({ message: 'مقدار «مرا به خاطر بسپار» درست نیست.' })
  readonly rememberIdentifier?: boolean;
}

export class VerifyOtpRequest {
  @ApiProperty({ description: 'توکن مرحلهٔ دوم از پاسخ ورود' })
  @IsString({ message: 'جلسهٔ ورود معتبر نیست. دوباره از صفحهٔ ورود شروع کنید.' })
  @IsNotEmpty({ message: 'جلسهٔ ورود معتبر نیست. دوباره از صفحهٔ ورود شروع کنید.' })
  @MaxLength(300)
  readonly otpToken!: string;

  @ApiProperty({ description: 'کد ۶ رقمی پیامک (ارقام لاتین)', example: '123456', pattern: '^\\d{6}$' })
  @Matches(/^\d{6}$/, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly code!: string;

  @ApiPropertyOptional({ description: '«این دستگاه را تا ۳۰ روز به خاطر بسپار» — کوکی pj_device؛ فقط مرحلهٔ کد را می‌بخشد' })
  @IsOptional()
  @IsBoolean()
  readonly trustDevice?: boolean;
}

export class ResendOtpRequest {
  @ApiProperty({ description: 'توکن مرحلهٔ دوم از پاسخ ورود' })
  @IsString({ message: 'جلسهٔ ورود معتبر نیست. دوباره از صفحهٔ ورود شروع کنید.' })
  @IsNotEmpty({ message: 'جلسهٔ ورود معتبر نیست. دوباره از صفحهٔ ورود شروع کنید.' })
  @MaxLength(300)
  readonly otpToken!: string;
}

class UserPreferencesResponse {
  @ApiProperty({ enum: ['jalali', 'gregorian'] }) readonly calendar!: 'jalali' | 'gregorian';
  @ApiProperty({ enum: ['fa', 'latin'] }) readonly digits!: 'fa' | 'latin';
  @ApiProperty({ enum: ['auto', 'million', 'billion'] }) readonly amountScale!: 'auto' | 'million' | 'billion';
  @ApiProperty({ type: String, nullable: true }) readonly startPage!: string | null;
}

export class UserResponse implements UserView {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly fullName!: string;
  @ApiProperty() readonly mobile!: string;
  @ApiProperty({ type: String, nullable: true }) readonly email!: string | null;
  @ApiProperty() readonly twoFactorEnabled!: boolean;
  @ApiProperty({ enum: USER_STATUSES }) readonly status!: UserView['status'];
  @ApiProperty() readonly isOrgAdmin!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readonly lastActiveAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) readonly jobTitle!: string | null;
  @ApiProperty({ type: String, nullable: true }) readonly department!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readonly passwordChangedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readonly lockedUntil!: string | null;
  @ApiProperty({ example: 'a5' }) readonly avatarTone!: string;
  @ApiProperty({ type: UserPreferencesResponse }) @Type(() => UserPreferencesResponse) readonly preferences!: UserPreferencesResponse;
}

export class OrganizationResponse implements OrganizationView {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly name!: string;
  @ApiProperty({ description: 'سقف مجوز کاربران (W26)' }) readonly seatLimit!: number;
  @ApiProperty() readonly activeProjectCount!: number;
}

export class GrantedPermissionResponse {
  @ApiProperty({ enum: PERMISSION_CODES }) readonly code!: string;
  @ApiProperty({ enum: ['all', 'own_area', 'own_assigned', 'own_projects'] }) readonly scope!: string;
}

export class SessionResponse implements Omit<SessionView, 'permissions'> {
  @ApiProperty({ description: 'توکن دسترسی کوتاه‌عمر؛ فقط در حافظهٔ کلاینت (07 ۲)' }) readonly accessToken!: string;
  @ApiProperty() readonly expiresInSec!: number;
  @ApiProperty({ type: UserResponse }) readonly user!: UserResponse;
  @ApiProperty({ type: OrganizationResponse }) readonly organization!: OrganizationResponse;
  @ApiProperty({ type: [String] }) readonly rolesInProject!: string[];
  @ApiProperty({ type: [GrantedPermissionResponse] }) readonly permissions!: GrantedPermissionResponse[];
}

export class LoginResponse {
  @ApiProperty({ enum: ['otp_required', 'success'] }) readonly outcome!: 'otp_required' | 'success';
  @ApiPropertyOptional() readonly otpToken?: string;
  @ApiPropertyOptional({ example: '0912 *** 4321' }) readonly maskedMobile?: string;
  @ApiPropertyOptional() readonly resendAfterSec?: number;
  @ApiPropertyOptional({ type: SessionResponse }) readonly session?: SessionResponse;
}

export class ResendOtpResponse {
  @ApiProperty() readonly resendAfterSec!: number;
}

/** درخواست کد تأیید دوباره برای عمل حساس (F02 ۸.۴). */
export class StepUpRequest {
  @ApiProperty({ enum: STEP_UP_PURPOSES, description: 'عمل حساسی که کد برایش صادر می‌شود' })
  @IsIn(STEP_UP_PURPOSES, { message: 'این عمل به کد تأیید نیاز ندارد.' })
  readonly purpose!: StepUpPurpose;

  @ApiProperty({ format: 'uuid', description: 'موضوع عمل: شناسهٔ پروژه؛ برای account.enable_2fa شناسهٔ خود کاربر' })
  @IsUUID('all', { message: 'موضوع این کد معتبر نیست.' })
  readonly subjectId!: string;
}

export class StepUpResponse {
  @ApiProperty({ example: '0912 *** 4321' }) readonly maskedMobile!: string;
  @ApiProperty() readonly expiresInSec!: number;
  @ApiProperty() readonly resendAfterSec!: number;
}

// ─── ثبت‌نام خودکار سازمان جدید (Self-Signup) ───

export class SignupRequestCodeRequest {
  @ApiProperty({ example: '09121234567' })
  @IsString({ message: 'شمارهٔ موبایل را بنویسید.' })
  @IsNotEmpty({ message: 'شمارهٔ موبایل را بنویسید.' })
  @MaxLength(20)
  readonly mobile!: string;
}

export class SignupRequestCodeResponse {
  @ApiProperty() readonly signupToken!: string;
  @ApiProperty({ example: '0912 *** 4321' }) readonly maskedMobile!: string;
  @ApiProperty() readonly resendAfterSec!: number;
}

export class SignupTokenRequest {
  @ApiProperty()
  @IsString({ message: 'ثبت‌نام را از نو شروع کنید.' })
  @IsNotEmpty({ message: 'ثبت‌نام را از نو شروع کنید.' })
  @MaxLength(300)
  readonly signupToken!: string;
}

export class SignupVerifyCodeRequest extends SignupTokenRequest {
  @ApiProperty({ pattern: '^\\d{6}$' })
  @Matches(/^\d{6}$/, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly code!: string;
}

export class SignupCompleteRequest extends SignupVerifyCodeRequest {
  @ApiProperty({ example: 'شرکت مهندسی آرمان سازه' })
  @IsString({ message: 'نام شرکت یا سازمان را بنویسید.' })
  @IsNotEmpty({ message: 'نام شرکت یا سازمان را بنویسید.' })
  @MaxLength(120, { message: 'نام سازمان حداکثر ۱۲۰ نویسه است.' })
  readonly organizationName!: string;

  @ApiProperty({ example: 'علی رضایی' })
  @IsString({ message: 'نام و نام خانوادگی را بنویسید.' })
  @IsNotEmpty({ message: 'نام و نام خانوادگی را بنویسید.' })
  @MaxLength(80, { message: 'نام و نام خانوادگی حداکثر ۸۰ نویسه است.' })
  readonly fullName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly email?: string | null;

  @ApiProperty({ format: 'password' })
  @IsString({ message: 'رمز عبور را بنویسید.' })
  @IsNotEmpty({ message: 'رمز عبور را بنویسید.' })
  @MaxLength(200)
  readonly password!: string;
}
