import type { ProjectStatus, SystemRole } from '@/config/constants';
import type { UserPreferences } from '@/modules/auth/types';
import type { EntityId, IsoInstant } from '@/shared/types/api';

// حساب من (W32) — `features/access-control.md` ۵.۱ و ۵.۷، notifications.md ۵.۱ و ۵.۴.
// همهٔ endpointها فقط احراز هویت می‌خواهند و روی حساب خود کاربر کار می‌کنند.

export type NotifyChannel = 'in_app' | 'email' | 'push' | 'sms';
/** `locked_on`: اعلان الزامی یا in_app؛ `na`: کانال برای این کاربر یا رویداد مجاز نیست. */
export type NotifyChannelState = 'on' | 'off' | 'locked_on' | 'na';

export interface NotificationGroupPref {
  key: string;
  label: string;
  description: string;
  channels: Record<NotifyChannel, NotifyChannelState>;
}

export interface AccountDto {
  profile: {
    id: EntityId;
    fullName: string;
    jobTitle: string | null;
    department: string | null;
    email: string | null;
    mobile: string;
    avatarTone: string;
    isOrgAdmin: boolean;
  };
  departments: string[];
  memberships: Array<{ projectId: EntityId; code: string; name: string; status: ProjectStatus; roles: SystemRole[] }>;
  security: {
    passwordChangedAt: IsoInstant | null;
    rotationDays: number;
    /** روز مانده تا اجبار تغییر رمز (منفی = گذشته). */
    daysUntilRotation: number | null;
    twoFactorEnabled: boolean;
    /** `org.require2fa` — خاموش کردن ممکن نیست. */
    orgRequires2fa: boolean;
    backupCodesLeft: number;
    maskedMobile: string;
  };
  sessions: Array<{
    id: EntityId;
    client: 'web' | 'android';
    deviceName: string;
    location: string;
    ip: string;
    lastUsedAt: IsoInstant;
    current: boolean;
  }>;
  preferences: UserPreferences;
  notifications: { groups: NotificationGroupPref[]; quietHours: { enabled: boolean; from: string; to: string } };
}

export interface LoginAttemptDto {
  id: EntityId;
  at: IsoInstant;
  result: 'success' | 'bad_password' | 'locked' | 'otp_failed';
  method: string;
  location: string;
  ip: string;
  /** ناموفق از مکان ناشناس — رنگ هشدار (۵.۷). */
  suspicious: boolean;
}

export interface ProfileInput {
  fullName: string;
  jobTitle: string;
  department: string | null;
}

export interface PasswordChangeInput {
  current: string;
  next: string;
  signOutOthers: boolean;
}
