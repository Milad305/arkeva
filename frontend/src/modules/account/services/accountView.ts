import { ROUTES } from '@/config/routes';
import type { SelectOption } from '@/shared/components/ui/Select';
import type { LoginAttemptDto, NotifyChannel } from '../types';

export const LOGIN_RESULT_LABEL: Record<LoginAttemptDto['result'], string> = {
  success: 'موفق',
  bad_password: 'ناموفق · رمز نادرست',
  locked: 'قفل موقت',
  otp_failed: 'ناموفق · کد نادرست',
};

export const NOTIFY_CHANNEL_LABEL: Record<NotifyChannel, string> = {
  in_app: 'درون برنامه',
  email: 'ایمیل',
  push: 'پوش اپ',
  sms: 'پیامک',
};

/** گزینه‌های «صفحهٔ شروع پس از ورود» (F01 ۵.۷)؛ تهی = فهرست پروژه‌ها. */
export const START_PAGES: Array<SelectOption<string>> = [
  { value: '', label: 'فهرست پروژه‌ها (پیش‌فرض)' },
  { value: ROUTES.dashboard, label: 'داشبورد سازمان' },
  { value: ROUTES.reports, label: 'صندوق گزارش‌های کارگاه' },
  { value: ROUTES.risks, label: 'ریسک‌ها' },
  { value: ROUTES.notifications, label: 'اعلان‌ها' },
];
