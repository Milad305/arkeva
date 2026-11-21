// مقادیر وضعیت دامنه — فهرست ثابت برای CHECK پایگاه داده، DTO و رابط کاربری.
// برچسب فارسی کار رابط کاربری است و اینجا نمی‌آید (فقط مقدار).

/** `Project.status` — `02` ۳. */
export const PROJECT_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** `User.status` — `02` ۲. */
export const USER_STATUSES = ['invited', 'active', 'locked', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** `ProjectMember.status` — `02` ۲. */
export const MEMBER_STATUSES = ['active', 'removed'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** نتیجهٔ تلاش ورود — `LoginAttempt` (F01 ۴). */
export const LOGIN_RESULTS = ['success', 'bad_password', 'locked', 'otp_failed'] as const;
export type LoginResultCode = (typeof LOGIN_RESULTS)[number];

/** کلاینت نشست — W32 «دستگاه‌های فعال». */
export const SESSION_CLIENTS = ['web', 'android'] as const;
export type SessionClient = (typeof SESSION_CLIENTS)[number];

/**
 * عمل‌های حساسی که کد پیامکی تأیید دوباره می‌خواهند (F02 ۸.۴؛ تصمیم کاربر 1405/08/22).
 * هر کد برای یک عمل روی یک موضوع (پروژه) صادر و یک بار مصرف می‌شود.
 */
export const STEP_UP_PURPOSES = ['project.transfer_manager', 'project.delete', 'account.enable_2fa'] as const;
export type StepUpPurpose = (typeof STEP_UP_PURPOSES)[number];
