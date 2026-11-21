import type { NotificationSeverity } from '../notification.entity.js';

// کانال‌های اعلان (notifications.md ۴.۲، ۵.۱، ۵.۴؛ تصمیم‌های 1405/08/24) — تابع خالص.
//   • ماتریس W30 هشت ردیف دارد؛ بقیهٔ کدها پیش‌فرض دسته‌ای `[تأییدشده]`.
//   • پیامک فقط رویداد فوری؛ پوش فقط کاربر اپ؛ ترجیح کاربر فقط کاهنده و in_app همیشه روشن؛ اعلان الزامی خاموش نمی‌شود.
//   • ساعت آرام ۲۱ تا ۰۷ تهران: پوش و ایمیل غیربحرانی تا پایان آن عقب می‌افتد؛ in_app و پیامک نه.

export const CHANNELS = ['in_app', 'email', 'sms', 'push'] as const;
export type Channel = (typeof CHANNELS)[number];
export type ChannelState = 'on' | 'off' | 'na' | 'locked_on';

export interface MatrixRowDef {
  readonly code: string;
  readonly label: string;
  readonly recipients: string;
  readonly channels: Readonly<Record<Channel, ChannelState>>;
}

/** ماتریس پیش‌فرض W30 (۴.۲). خانهٔ خالی جدول = off؛ «—» = na. */
export const MATRIX: readonly MatrixRowDef[] = [
  { code: 'NT-APR-01', label: 'ثبت گزارش جدید از کارگاه', recipients: 'ناظر حوزه', channels: { in_app: 'locked_on', email: 'off', sms: 'na', push: 'on' } },
  {
    code: 'AL-APR-01',
    label: 'گزارش در انتظار بیش از مهلت',
    recipients: 'ناظر و جایگزین',
    channels: { in_app: 'locked_on', email: 'on', sms: 'na', push: 'on' },
  },
  { code: 'NT-FLD-01', label: 'برگشت گزارش برای اصلاح', recipients: 'سرپرست کارگاه', channels: { in_app: 'locked_on', email: 'na', sms: 'on', push: 'on' } },
  {
    code: 'AL-PRG-01',
    label: 'انحراف آیتم از آستانهٔ بحرانی',
    recipients: 'مدیر پروژه و برنامه‌ریز',
    channels: { in_app: 'locked_on', email: 'on', sms: 'na', push: 'na' },
  },
  {
    code: 'NT-RSK-02',
    label: 'ریسک جدید با امتیاز ۱۵ یا بیشتر',
    recipients: 'مدیر پروژه و مالک',
    channels: { in_app: 'locked_on', email: 'on', sms: 'on', push: 'na' },
  },
  {
    code: 'AL-CST-01',
    label: 'مصرف قلم CBS بیش از ۹۰٪',
    recipients: 'مدیر پروژه و مالی',
    channels: { in_app: 'locked_on', email: 'on', sms: 'na', push: 'na' },
  },
  { code: 'AL-INT-01', label: 'خطا در همگام‌سازی', recipients: 'برنامه‌ریز', channels: { in_app: 'locked_on', email: 'on', sms: 'na', push: 'na' } },
  { code: 'NT-DIG-01', label: 'خلاصهٔ روزانه · ساعت ۰۷:۳۰', recipients: 'مدیر پروژه', channels: { in_app: 'na', email: 'on', sms: 'na', push: 'na' } },
];
export const MATRIX_BY_CODE: ReadonlyMap<string, MatrixRowDef> = new Map(MATRIX.map((row) => [row.code, row]));

/** رویدادهای فوری که پیامک می‌پذیرند (۵.۱). */
export const URGENT_SMS: ReadonlySet<string> = new Set(['NT-FLD-01', 'NT-RSK-02', 'NT-ASG-01', 'NT-USR-01']);
/** اعلان‌های الزامی (۵.۱): کانال‌های پیش‌فرضشان با ترجیح کاربر خاموش نمی‌شود. */
export const MANDATORY: ReadonlySet<string> = new Set(['NT-ASG-01', 'NT-USR-01', 'NT-FLD-01']);

/** گروه W32 هر کد (تصمیم 1405/08/24؛ زبانه‌های W06). */
export const PREFERENCE_GROUPS = [
  { key: 'approvals', label: 'تأیید گزارش‌ها', description: 'گزارش تازه، مرحلهٔ دوم، درخواست اصلاح و معوق‌ها' },
  { key: 'field', label: 'گزارش کارگاه', description: 'برگشت، رد و یادآوری گزارش روزانه' },
  { key: 'alerts', label: 'هشدارها', description: 'هشدارهای پیشرفت، هزینه، ساختار و منابع پروژه‌های شما' },
  { key: 'risks', label: 'ریسک‌ها', description: 'ریسک مهم، تغییر امتیاز، نام‌بردن و مشکل کارگاه' },
  { key: 'assignment', label: 'تخصیص و دعوت', description: 'الزامی؛ قابل خاموش کردن نیست' },
  { key: 'plan', label: 'برنامه، بودجه و دوره', description: 'بازنگری، فعال شدن پروژه، بستن دوره و درخواست بودجه' },
  { key: 'digest', label: 'خلاصهٔ روزانه و گزارش‌ها', description: 'خلاصهٔ ۰۷:۳۰ و گزارش مدیریتی آماده' },
] as const;
export type PreferenceGroup = (typeof PREFERENCE_GROUPS)[number]['key'];

export function groupOf(code: string): PreferenceGroup {
  if (code.startsWith('NT-APR') || code.startsWith('AL-APR')) return 'approvals';
  if (code.startsWith('NT-FLD') || code.startsWith('AL-FLD')) return 'field';
  if (code.startsWith('NT-RSK') || code.startsWith('AL-RSK')) return 'risks';
  if (code === 'NT-ASG-01' || code === 'NT-USR-01') return 'assignment';
  if (['NT-PLN-01', 'NT-PRJ-01', 'NT-PER-01', 'NT-BUD-01', 'NT-BUD-02'].includes(code)) return 'plan';
  if (code === 'NT-DIG-01' || code === 'NT-RPT-01') return 'digest';
  return 'alerts';
}

export interface Recipient {
  /** نقش مدیر پروژه یا مالی در همان پروژه (ایمیل هشدار warning). */
  readonly pmOrFinance: boolean;
  readonly hasEmail: boolean;
  /** توکن پوش فعال دارد (کاربر اپ). */
  readonly appUser: boolean;
  /** خاموش‌شده‌های گروه این کد در ترجیح شخصی. */
  readonly off: ReadonlySet<Channel>;
}

/** پیش‌فرض کانال‌های کدی که در ماتریس W30 نیست (۴.۲ «پیش‌فرض برای بقیه»). */
export function defaultChannels(code: string, severity: NotificationSeverity | null, recipient: Recipient): Set<Channel> {
  if (code.startsWith('AL-')) {
    if (severity === 'critical') return new Set<Channel>(['in_app', 'email', 'push']);
    if (severity === 'warning') return new Set<Channel>(['in_app', 'push', ...(recipient.pmOrFinance ? (['email'] as const) : [])]);
    return new Set<Channel>(['in_app']);
  }
  if (['NT-FLD-02', 'NT-FLD-03', 'NT-FLD-04'].includes(code)) return new Set<Channel>(['in_app', 'push']);
  if (code === 'NT-ASG-01') return new Set<Channel>(['in_app', 'push', 'sms']);
  if (code === 'NT-USR-01') return new Set<Channel>(recipient.appUser ? ['sms'] : ['email']);
  if (['NT-RSK-01', 'NT-RSK-03', 'NT-RSK-04'].includes(code)) return new Set<Channel>(['in_app', 'push']);
  // انتقال مالکیت ریسک پس از حذف عضو: فقط درون‌برنامه (تصمیم 1405/08/25)
  if (code === 'NT-RSK-05') return new Set<Channel>(['in_app']);
  // کار dead به مدیر سازمان (پیش‌فرض فنی)
  if (code === 'NT-SYS-01') return new Set<Channel>(['in_app', 'email']);
  if (['NT-PLN-01', 'NT-PRJ-01', 'NT-PER-01', 'NT-BUD-01', 'NT-BUD-02', 'NT-RPT-01'].includes(code)) return new Set<Channel>(['in_app', 'email']);
  return new Set<Channel>(['in_app']);
}

/** وضعیت هر کانال ماتریس با تنظیم سازمان و پروژه (نزدیک‌تر برنده)؛ na و locked_on عوض نمی‌شوند. */
export function matrixState(
  row: MatrixRowDef,
  overrides: { readonly org?: Partial<Record<Channel, boolean>>; readonly project?: Partial<Record<Channel, boolean>> },
) {
  const result = {} as Record<Channel, ChannelState>;
  for (const channel of CHANNELS) {
    const base = row.channels[channel];
    if (base === 'na' || base === 'locked_on') {
      result[channel] = base;
      continue;
    }
    const value = overrides.project?.[channel] ?? overrides.org?.[channel];
    result[channel] = value === undefined ? base : value ? 'on' : 'off';
  }
  return result;
}

/**
 * کانال‌های نهایی یک اعلان برای یک گیرنده: پیش‌فرض یا ماتریس ← قید فوری بودن پیامک و کاربر اپ بودن پوش و داشتن ایمیل ← ترجیح
 * کاهندهٔ کاربر (جز الزامی و in_app).
 */
export function channelsFor(
  code: string,
  severity: NotificationSeverity | null,
  recipient: Recipient,
  matrix: Readonly<Record<Channel, ChannelState>> | null,
): Channel[] {
  const chosen = matrix
    ? new Set(CHANNELS.filter((channel) => matrix[channel] === 'on' || matrix[channel] === 'locked_on'))
    : defaultChannels(code, severity, recipient);
  return CHANNELS.filter((channel) => {
    if (!chosen.has(channel)) return false;
    if (channel === 'sms' && !URGENT_SMS.has(code)) return false;
    if (channel === 'push' && !recipient.appUser) return false;
    if (channel === 'email' && !recipient.hasEmail) return false;
    if (channel === 'in_app' || MANDATORY.has(code)) return true;
    return !recipient.off.has(channel);
  });
}

/** ساعت آرام (۵.۴): لحظهٔ ارسال پوش و ایمیل غیربحرانی؛ in_app و پیامک همان لحظه. ساعت‌ها «HH:MM» تهران (+۰۳:۳۰). */
export function deliveryTime(
  channel: Channel,
  severity: NotificationSeverity | null,
  quiet: { readonly enabled: boolean; readonly from: string; readonly to: string },
  now: Date,
): Date {
  if (channel === 'in_app' || channel === 'sms' || severity === 'critical' || !quiet.enabled) return now;
  const OFFSET = 210;
  const minutes = (text: string) => Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5));
  const local = (now.getUTCHours() * 60 + now.getUTCMinutes() + OFFSET) % 1440;
  const from = minutes(quiet.from);
  const to = minutes(quiet.to);
  const inside = from > to ? local >= from || local < to : local >= from && local < to;
  if (!inside) return now;
  const wait = (to - local + 1440) % 1440;
  return new Date(Math.floor(now.getTime() / 60_000) * 60_000 + wait * 60_000);
}
