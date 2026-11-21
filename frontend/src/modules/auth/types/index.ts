import type { EntityId, IsoInstant } from '@/shared/types/api';
import type { GrantedPermission } from '@/config/permissions';
import type { SystemRole } from '@/config/constants';

// تایپ‌ها از `design/02-domain-model.md` بخش ۲ و `design/features/access-control.md` بخش ۴.
// نام فیلدها عیناً از سند گرفته شده تا نگاشت به DTO بک‌اند یک‌به‌یک باشد.

/** `User.status` — ۰۲ بخش ۲. */
export type UserStatus = 'invited' | 'active' | 'locked' | 'disabled';

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  invited: 'دعوت‌شده',
  active: 'فعال',
  locked: 'قفل‌شده',
  disabled: 'غیرفعال',
};

/** User — پایه (۰۲ بخش ۲، به‌علاوهٔ افزوده‌های F01 بخش ۴). */
export interface UserDto {
  id: EntityId;
  fullName: string;
  /** یکتا در سازمان؛ ورود اپ با همین شماره و OTP. */
  mobile: string;
  email: string | null;
  twoFactorEnabled: boolean;
  status: UserStatus;
  isOrgAdmin: boolean;
  lastActiveAt: IsoInstant | null;
  jobTitle: string | null;
  department: string | null;
  passwordChangedAt: IsoInstant | null;
  lockedUntil: IsoInstant | null;
  /** رنگ آواتار (§۷.۲ ردیف ۲۲). */
  avatarTone: string;
  preferences: UserPreferences;
}

/**
 * `User.preferences` — فقط نمایشی؛ هیچ فرمولی را عوض نمی‌کند (F01 ۵.۷).
 * ریال/تومان تنظیم پروژه است (project-setup.md)؛ کاربر فقط مقیاس میلیون/میلیارد را برمی‌گزیند.
 */
export interface UserPreferences {
  calendar: 'jalali' | 'gregorian';
  digits: 'fa' | 'latin';
  amountScale: 'auto' | 'million' | 'billion';
  /** مسیر صفحهٔ شروع پس از ورود؛ `null` = فهرست پروژه‌ها. */
  startPage: string | null;
}

/** Organization — پایه (۰۲ بخش ۲). */
export interface OrganizationDto {
  id: EntityId;
  name: string;
  /** سقف مجوز کاربران؛ W26 «۴۸ از ۶۰». */
  seatLimit: number;
  activeProjectCount: number;
}

/** Role — پایه. `orgId` برای نقش‌های سیستمی تهی است. */
export interface RoleDto {
  id: EntityId;
  code: SystemRole | string;
  name: string;
  isSystem: boolean;
  basedOnRoleId: EntityId | null;
  permissions: GrantedPermission[];
}

/** ProjectMember — پایه. یکتا روی `(projectId, userId)`. */
export interface ProjectMemberDto {
  id: EntityId;
  projectId: EntityId;
  userId: EntityId;
  roleIds: EntityId[];
  status: 'active' | 'removed';
}

/** Invitation — عملیاتی؛ ۷ روز اعتبار. */
export interface InvitationDto {
  id: EntityId;
  projectId: EntityId | null;
  channel: 'sms' | 'email';
  target: string;
  roleIds: EntityId[];
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: IsoInstant;
}

/** AuthSession — عملیاتی (F01 ۴). «دستگاه‌های فعال» در W32. */
export interface AuthSessionDto {
  id: EntityId;
  client: 'web' | 'android';
  deviceName: string;
  createdAt: IsoInstant;
  lastUsedAt: IsoInstant;
  ip: string;
  /** نشست همین مرورگر. */
  isCurrent: boolean;
}

/** LoginAttempt — واقعیت (F01 ۴). تاریخچهٔ ۳۰ روزهٔ W32. */
export interface LoginAttemptDto {
  id: EntityId;
  result: 'success' | 'bad_password' | 'locked' | 'otp_failed';
  method: 'password' | 'otp' | 'sso' | 'backup_code';
  ip: string;
  approxLocation: string | null;
  at: IsoInstant;
}

// ── DTOهای ورود (F01 ۸) ──────────────────────────────────────

export interface LoginRequest {
  /** نام کاربری (ایمیل) یا شمارهٔ موبایل. */
  identifier: string;
  password: string;
  /** فقط شناسهٔ ورود را به خاطر می‌سپارد؛ نشست را طولانی نمی‌کند (۵.۱). */
  rememberIdentifier: boolean;
}

/**
 * نتیجهٔ ورود.
 * `otp_required` یعنی مرحلهٔ دوم لازم است؛ `success` یعنی دستگاه به خاطر سپرده شده بود.
 */
export type LoginResult =
  | { outcome: 'otp_required'; otpToken: string; maskedMobile: string; resendAfterSec: number }
  | { outcome: 'success'; session: SessionDto };

export interface VerifyOtpRequest {
  otpToken: string;
  code: string;
  /** «این دستگاه را تا ۳۰ روز به خاطر بسپار» — فقط مرحلهٔ کد را می‌بخشد. */
  trustDevice: boolean;
}

/** آنچه پس از ورود موفق در store می‌نشیند. */
export interface SessionDto {
  accessToken: string;
  /** سرور آن را در کوکی HttpOnly می‌گذارد و در بدنه نمی‌فرستد (docs/backend/07 ۲). */
  refreshToken?: string;
  /** عمر توکن دسترسی به ثانیه (سرور واقعی). */
  expiresInSec?: number;
  user: UserDto;
  organization: OrganizationDto;
  /** نقش‌های کاربر در پروژهٔ جاری؛ فقط نمایشی. */
  rolesInProject: SystemRole[];
  /** اجتماع دسترسی‌ها با دامنهٔ وسیع‌تر (F01 ۵.۲). */
  permissions: GrantedPermission[];
}

/** عمل حساسی که کد تأیید دوباره می‌خواهد (F02 ۸.۴؛ F01 ۵.۷). */
export type StepUpPurpose = 'project.transfer_manager' | 'project.delete' | 'account.enable_2fa';

export interface StepUpRequest {
  purpose: StepUpPurpose;
  /** شناسهٔ پروژه؛ برای account.enable_2fa شناسهٔ خود کاربر. */
  subjectId: EntityId;
}

export interface StepUpResponse {
  maskedMobile: string;
  expiresInSec: number;
  resendAfterSec: number;
}

export interface ForgotPasswordRequest {
  mobile: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  /** کد پیامک مرحلهٔ ۲؛ برای رمز منقضی (PASSWORD_EXPIRED) نیست. */
  code?: string;
  newPassword: string;
  /** «خروج از همهٔ دستگاه‌های دیگر» — پیش‌فرض روشن (۵.۱). */
  revokeOtherSessions: boolean;
}

/** خطاهای شناخته‌شدهٔ ورود؛ پیام‌ها نمی‌گویند کدام بخش اشتباه است (۵.۱). */
export type LoginErrorCode =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_disabled'
  | 'password_expired'
  | 'otp_invalid'
  | 'otp_expired';
