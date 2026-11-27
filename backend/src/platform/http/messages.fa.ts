import type { ErrorCode } from '@projeyar/shared';
import { toFaDigits } from './fa.js';

// پیام فارسی هر کد خطا (docs/backend/06 ۶). بی‌سرزنش و با یک راه ادامه (`CLAUDE.md` ۵).
// Record کامل است: کد تازه در packages/shared بدون پیام اینجا خطای نوع می‌دهد.

type Details = Readonly<Record<string, unknown>> | undefined;
type Message = string | ((details: Details) => string);

const num = (details: Details, key: string): string | null => {
  const value = details?.[key];
  return typeof value === 'number' ? toFaDigits(value) : null;
};

export const MESSAGES_FA: Record<ErrorCode, Message> = {
  VALIDATION_FAILED: 'چند مورد از اطلاعات واردشده نیاز به اصلاح دارد. موارد مشخص‌شده را بررسی کنید.',
  NOT_FOUND: 'موردی که دنبالش هستید پیدا نشد. شاید حذف شده یا نشانی تغییر کرده است.',
  INTERNAL: 'مشکل از سمت ماست و داده‌های شما سالم است. چند لحظهٔ دیگر دوباره امتحان کنید.',
  DEPENDENCY_UNAVAILABLE: 'یکی از سرویس‌های سامانه موقتاً در دسترس نیست. چند لحظهٔ دیگر دوباره امتحان کنید.',
  MAINTENANCE: 'سامانه در حال نگهداری است و فعلاً فقط‌خواندنی است. کمی بعد دوباره امتحان کنید.',
  RATE_LIMITED: 'درخواست‌ها بیش از حد مجاز بود. کمی صبر کنید و دوباره امتحان کنید.',
  VERSION_CONFLICT: 'کس دیگری این را تغییر داده است. نسخهٔ تازه را ببینید و دوباره ذخیره کنید.',
  PRECONDITION_REQUIRED: 'نسخهٔ موردی که ویرایش می‌کنید همراه درخواست نیامد. صفحه را تازه کنید و دوباره امتحان کنید.',
  IDEMPOTENCY_KEY_REUSED: 'این درخواست قبلاً با محتوای دیگری فرستاده شده است. فرم را دوباره باز کنید.',
  LOCK_TIMEOUT: 'این مورد همین حالا در حال تغییر است. چند ثانیهٔ دیگر دوباره امتحان کنید.',
  AUTH_REQUIRED: 'برای ادامه وارد حساب خود شوید.',
  SESSION_EXPIRED: 'نشست شما به پایان رسیده است. دوباره وارد شوید؛ تغییرات ذخیره‌نشده پس از ورود برمی‌گردد.',
  // F01 ۵.۱: پیام نمی‌گوید کدام بخش اشتباه است
  INVALID_CREDENTIALS: 'نام کاربری یا رمز عبور اشتباه است',
  ACCOUNT_LOCKED: (details) => {
    const minutes = num(details, 'lockMinutes');
    return minutes ? `حساب شما به مدت ${minutes} دقیقه قفل شد. پیامک هشدار برای صاحب حساب فرستاده شد.` : 'حساب شما موقتاً قفل است. کمی بعد دوباره امتحان کنید.';
  },
  ACCOUNT_DISABLED: 'این حساب غیرفعال است. برای فعال‌سازی با مدیر سازمان تماس بگیرید.',
  OTP_INVALID: 'کد واردشده درست نیست. دوباره تلاش کنید.',
  OTP_EXPIRED: 'مهلت این کد تمام شده است. کد تازه بگیرید.',
  INVITE_CODE_INVALID: 'این کد دعوت معتبر نیست یا مهلتش تمام شده است. کد را دوباره بررسی کنید یا از مدیر پروژه بخواهید دعوت را دوباره بفرستد.',
  APP_VERSION_UNSUPPORTED: 'این نسخهٔ اپ دیگر پشتیبانی نمی‌شود. اپ را به‌روز کنید؛ گزارش‌های در صف حفظ می‌شوند و پس از به‌روزرسانی ارسال می‌شوند.',
  OTP_TOO_MANY_ATTEMPTS: 'تلاش‌های ناموفق زیاد شد. دوباره از صفحهٔ ورود شروع کنید.',
  OTP_RESEND_TOO_SOON: (details) => {
    const seconds = num(details, 'retryAfterSec');
    return seconds ? `کد تازه را ${seconds} ثانیهٔ دیگر می‌توانید بگیرید.` : 'کمی صبر کنید و دوباره کد بگیرید.';
  },
  LOGIN_IDENTIFIER_AMBIGUOUS: 'این شناسه در بیش از یک سازمان ثبت شده است. برای ورود با پشتیبانی تماس بگیرید.',
  PERMISSION_DENIED: 'برای این کار دسترسی لازم را ندارید. از مدیر پروژه درخواست دسترسی کنید.',
  CLIENT_HEADER_REQUIRED: 'این درخواست از برنامهٔ پروژه‌یار نیامد. صفحه را تازه کنید و دوباره امتحان کنید.',
  STEP_UP_REQUIRED: 'برای این کار کد تأیید پیامکی لازم است. کد تازه بگیرید و همان را وارد کنید.',
  TRANSITION_NOT_ALLOWED: 'این تغییر وضعیت برای پروژه در وضعیت فعلی‌اش ممکن نیست. صفحه را تازه کنید تا وضعیت درست را ببینید.',
  REASON_REQUIRED: 'برای این کار نوشتن دلیل لازم است. دلیل را بنویسید و دوباره امتحان کنید.',
  PROJECT_NOT_FOUND: 'این پروژه پیدا نشد. شاید حذف شده یا شما عضوش نیستید.',
  PROJECT_DELETE_NOT_ALLOWED: 'این پروژه در وضعیت فعلی حذف نمی‌شود. پروژهٔ فعال را اول تمام و بایگانی کنید.',
  PROJECT_DELETE_NAME_MISMATCH: 'نام واردشده با نام پروژه یکسان نیست. نام را دقیقاً همان‌طور که نوشته شده وارد کنید.',
  PROJECT_NOT_PENDING_DELETION: 'این پروژه در انتظار حذف نیست یا مهلت لغو گذشته است.',
  PROJECT_MANAGER_TARGET_INVALID: 'مدیر تازه باید عضو فعال دیگری از همین پروژه باشد. اول او را به تیم اضافه کنید.',
  PROJECT_READ_ONLY: 'این پروژه تمام‌شده یا بایگانی است و تغییر نمی‌پذیرد. برای تغییر، مدیر سازمان باید آن را بازگرداند.',
  PROJECT_DATES_FROM_MSP: 'تاریخ‌های پروژهٔ متصل به MSP از همگام‌سازی می‌آید و اینجا عوض نمی‌شود. تاریخ‌ها را در فایل MSP تغییر دهید.',
  WIZARD_DRAFT_NOT_FOUND: 'این پیش‌نویس پیدا نشد؛ شاید ساخته یا پاک شده است. ساخت پروژه را از نو شروع کنید.',
  PROJECT_WIZARD_BLOCKED: (details) => {
    const blockers = details?.['blockers'];
    const first = Array.isArray(blockers) ? (blockers[0] as { message?: unknown } | undefined)?.message : undefined;
    return typeof first === 'string' ? first : 'پیش از ساخت پروژه چند مورد باید کامل شود. مرحلهٔ مشخص‌شده را ببینید.';
  },
  MEMBER_ALREADY_ACTIVE: 'این کاربر از پیش عضو پروژه است؛ نقش‌هایش را از فهرست اعضا عوض کنید.',
  MEMBER_NOT_FOUND: 'این عضو در پروژه پیدا نشد. فهرست را تازه کنید.',
  USER_NOT_FOUND: 'این کاربر پیدا نشد. فهرست کاربران را تازه کنید.',
  INVITATION_NOT_FOUND: 'این دعوت پیدا نشد؛ شاید پذیرفته یا لغو شده است.',
  IDENTITY_TAKEN: 'این شماره یا ایمیل در سامانه ثبت است. اگر همین شخص است، او را از جستجو انتخاب کنید.',
  SEATS_FULL: (details) => {
    const limit = num(details, 'limit');
    return limit
      ? `ظرفیت پر است: هر ${limit} مجوز سازمان استفاده شده و دعوت‌شده‌ها هم سهم می‌گیرند. یک کاربر را غیرفعال یا دعوتی را لغو کنید.`
      : 'ظرفیت مجوز سازمان پر است. یک کاربر را غیرفعال یا دعوتی را لغو کنید.';
  },
  LAST_ORG_ADMIN: 'این کار آخرین مدیر سازمان را برمی‌دارد. اول مدیر سازمان دیگری تعیین کنید.',
  SELF_ACTION_NOT_ALLOWED: 'این کار را روی حساب خودتان نمی‌توانید انجام دهید. از مدیر سازمان دیگری بخواهید.',
  USER_STATE_CONFLICT: 'وضعیت این حساب با این کار نمی‌خواند. فهرست را تازه کنید تا وضعیت درست را ببینید.',
  MEMBER_REMOVAL_BLOCKED: (details) => {
    const project = typeof details?.['projectName'] === 'string' ? `در «${details['projectName']}» ` : '';
    return `این کاربر ${project}مدیر پروژه است. اول از «انتقال مدیریت» در سربرگ همان پروژه مدیر تازه تعیین کنید.`;
  },
  MEMBER_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'اطلاعات عضو کامل نیست. فرم را بررسی کنید.'),
  MEMBER_ROLE_BLOCKED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این نقش الان برداشته نمی‌شود. پیامدهایش را اول رفع کنید.'),
  ASSIGNMENT_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'این تخصیص ممکن نیست. فعالیت‌ها و سرپرست را دوباره انتخاب کنید.',
  APPROVAL_ROUTES_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'حوزه‌ها کامل نیستند. نام، بخش‌ها و تأییدکنندهٔ هر حوزه را بررسی کنید.',
  PROJECT_ACTIVATION_BLOCKED: (details) =>
    typeof details?.['message'] === 'string'
      ? `پیش‌شرط فعال‌سازی کامل نیست: ${details['message']} پس از رفع، دوباره «فعال‌سازی» را بزنید.`
      : 'پیش‌شرط‌های فعال‌سازی هنوز کامل نیست. فهرست پیش‌شرط‌ها را ببینید و رفع کنید.',
  COST_ENTRY_NOT_FOUND: 'این ردیف هزینه پیدا نشد. فهرست را تازه کنید.',
  COST_ENTRY_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'ردیف هزینه کامل نیست. قلم، تاریخ و مبلغ را بررسی کنید.'),
  COST_NOT_ALLOWED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این کار روی دفتر هزینهٔ این پروژه ممکن نیست.'),
  COST_IMPORT_NOT_FOUND: 'این دستهٔ ورود پیدا نشد. فایل را دوباره بارگذاری کنید.',
  COST_IMPORT_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'فایل هزینه خوانده نشد. قالب را دانلود کنید و دوباره بارگذاری کنید.',
  FIELD_REPORT_NOT_FOUND: 'این گزارش پیدا نشد. صندوق را تازه کنید.',
  FIELD_ITEM_NOT_FOUND: 'این آیتم گزارش پیدا نشد. صندوق را تازه کنید.',
  FIELD_ENTRY_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'مقادیر گزارش کامل نیست. فرم را بررسی کنید.'),
  FIELD_ENTRY_NOT_ALLOWED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این گزارش الان پذیرفته نمی‌شود.'),
  FIELD_DECISION_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این تصمیم کامل نیست. یادداشت و گزینه‌ها را بررسی کنید.'),
  FIELD_DECISION_CONFLICT: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'وضعیت این آیتم عوض شده است. صفحه را تازه کنید.'),
  PERIOD_NOT_FOUND: 'این دورهٔ گزارش پیدا نشد. فهرست دوره‌ها را تازه کنید.',
  PERIOD_NOT_CLOSABLE: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'این دوره اکنون بستنی نیست. دوره‌ها به ترتیب و پس از پایانشان بسته می‌شوند.',
  METRIC_NOT_AVAILABLE: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'این عدد هنوز محاسبه نشده است. پس از تأیید اولین گزارش دوباره امتحان کنید.',
  UPLOAD_NOT_FOUND: 'این بارگذاری پیدا نشد یا منقضی شده است. فایل را از اول بفرستید.',
  UPLOAD_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این فایل پذیرفته نمی‌شود. نوع و حجم آن را بررسی کنید.'),
  UPLOAD_INCOMPLETE: 'هنوز همهٔ بخش‌های فایل نرسیده است. بخش‌های جاافتاده را بفرستید و دوباره تکمیل کنید.',
  UPLOAD_HASH_MISMATCH: 'فایل رسیده با فایل گوشی یکی نیست. بارگذاری را از اول دوباره بفرستید.',
  FILE_NOT_FOUND: 'این فایل پیدا نشد. صفحه را تازه کنید.',
  FILE_LINK_INVALID: 'این لینک منقضی شده یا معتبر نیست. از صفحه دوباره باز کنید.',
  ALERT_NOT_FOUND: 'این هشدار پیدا نشد یا دیگر در دسترس نیست. فهرست را تازه کنید.',
  ALERT_NOT_DISMISSIBLE: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این هشدار را نمی‌توان رد کرد.'),
  ALERT_RULE_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'تنظیم این قاعده معتبر نیست. مقدارها را بررسی کنید.'),
  NOTIFICATION_SETTING_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این تنظیم اعلان مجاز نیست.'),
  RISK_NOT_FOUND: 'این ریسک پیدا نشد یا دسترسی به آن ندارید. دفتر ریسک را تازه کنید.',
  RISK_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'اطلاعات ریسک کامل نیست. فیلدها را بررسی کنید.'),
  RISK_STATE_CONFLICT: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'وضعیت این ریسک اجازهٔ این کار را نمی‌دهد. صفحه را تازه کنید.',
  REPORT_TEMPLATE_NOT_FOUND: 'این قالب گزارش پیدا نشد. فهرست را تازه کنید.',
  REPORT_TEMPLATE_NAME_TAKEN: 'قالبی با همین نام هست. نام دیگری بگذارید تا در کتابخانه قابل‌تشخیص باشد.',
  REPORT_NOT_FOUND: 'این خروجی پیدا نشد؛ شاید پیش‌تر حذف شده است.',
  REPORT_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'درخواست گزارش کامل نیست. قالب، بازه و قالب فایل را بررسی کنید.'),
  MSP_SESSION_NOT_FOUND: 'این جلسهٔ ورود پیدا نشد؛ فایل را دوباره بارگذاری کنید.',
  MSP_FILE_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این فایل خوانده نشد. در MS Project آن را با قالب XML ذخیره کنید.'),
  MSP_IMPORT_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'ورود هنوز آماده نیست. خطاهای فایل را تعیین تکلیف کنید.'),
  MSP_IMPORT_CONFLICT: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'وضعیت این ورود اجازهٔ این کار را نمی‌دهد. صفحه را تازه کنید.'),
  BACKUP_NOT_FOUND: 'این پشتیبان یا خروجی پیدا نشد؛ شاید زمانش گذشته است. فهرست را تازه کنید.',
  BACKUP_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'این کار پشتیبان الان ممکن نیست. صفحه را تازه کنید.'),
  TEMPLATE_NOT_FOUND: 'این قالب پیدا نشد. فهرست قالب‌ها را تازه کنید.',
  TEMPLATE_INVALID: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'قالب هنوز اعتبار ندارد. «بررسی وزن‌ها» خطاها را نشان می‌دهد.'),
  TEMPLATE_NAME_TAKEN: 'قالبی با همین نام هست. نام دیگری بگذارید تا در فهرست قابل‌تشخیص باشد.',
  TEMPLATE_STATE_CONFLICT: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'وضعیت این قالب اجازهٔ این کار را نمی‌دهد. صفحه را تازه کنید.'),
  CHARTS_NOT_AVAILABLE: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'نمودار این پروژه هنوز آماده نیست.'),
  RISK_ACTION_NOT_FOUND: 'این اقدام پیدا نشد. صفحهٔ ریسک را تازه کنید.',
  CONTINGENCY_EXCEEDED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'مبلغ از باقی‌ماندهٔ ذخیرهٔ احتیاطی بیشتر است.'),
  NOTIFICATION_NOT_FOUND: 'این اعلان دیگر در دسترس نیست. فهرست اعلان‌ها را تازه کنید.',
  PLAN_DRAFT_NOT_FOUND: 'این پروژه نسخهٔ کاری بازی ندارد. برای تغییر برنامه از «ویرایش ساختار» شروع کنید.',
  PLAN_DRAFT_STALE: 'نسخهٔ کاری در این فاصله دوباره ذخیره شده است. صفحه را دوباره بارگذاری کنید؛ تغییرهای ذخیره‌نشدهٔ شما باید دوباره وارد شوند.',
  PLAN_DRAFT_INVALID: (details) => {
    const first = typeof details?.['message'] === 'string' ? details['message'] : null;
    return first ? `نسخه هنوز خطا دارد: ${first} پس از رفع، دوباره «اعمال» را بزنید.` : 'نسخه هنوز خطا دارد. فهرست خطاهای اعتبارسنجی را ببینید و رفع کنید.';
  },
  PLAN_DRAFT_EMPTY: 'نسخهٔ کاری تغییری نسبت به برنامهٔ جاری ندارد؛ چیزی برای اعمال نیست.',
  PLAN_NOTE_REQUIRED: 'برای بازنگری یادداشت لازم است: بنویسید چرا برنامه تغییر کرد.',
  PLAN_APPLY_NOT_ALLOWED: 'بازنگری فقط در پروژهٔ فعال یا متوقف اعمال می‌شود؛ مبنای پروژهٔ پیش‌نویس با فعال‌سازی ثبت می‌شود.',
  PLAN_BASELINE_NOT_DISCARDABLE: 'مبنای کاری پروژهٔ پیش‌نویس کنار گذاشته نمی‌شود؛ محتوایش را ویرایش یا با ورود فایل جایگزین کنید.',
  WBS_ITEM_NOT_FOUND: 'این آیتم در WBS پیدا نشد؛ شاید حذف شده است. درخت را تازه کنید.',
  WBS_OP_REJECTED: (details) =>
    typeof details?.['message'] === 'string' ? details['message'] : 'یکی از تغییرها پذیرفته نشد. پیش‌نمایش را دوباره بگیرید و همان ردیف را اصلاح کنید.',
  WBS_IMPORT_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'فایل خوانده نشد. قالب را دانلود کنید، پر کنید و با قالب CSV UTF-8 ذخیره کنید.',
  WBS_IMPORT_NOT_ALLOWED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'ورود فایل در این پروژه ممکن نیست.'),
  PLAN_DRAFT_OPEN: (details) => {
    const number = num(details, 'number');
    return `بازنگری کاری${number ? ` R${number}` : ''} باز است. تأیید، نسخهٔ «بازنگری بودجه» جدایی می‌سازد و همان لحظه اعمال می‌کند؛ اول بازنگری کاری را اعمال کنید یا کنار بگذارید.`;
  },
  CBS_ITEM_NOT_FOUND: 'این قلم در CBS پیدا نشد؛ شاید حذف شده است. فهرست را تازه کنید.',
  CBS_OP_REJECTED: (details) =>
    typeof details?.['message'] === 'string' ? details['message'] : 'یکی از تغییرها پذیرفته نشد. پیش‌نمایش را دوباره بگیرید و همان ردیف را اصلاح کنید.',
  CBS_IMPORT_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'فایل خوانده نشد. قالب را دانلود کنید، پر کنید و با قالب CSV UTF-8 ذخیره کنید.',
  CBS_IMPORT_NOT_ALLOWED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'ورود فایل در این پروژه ممکن نیست.'),
  BUDGET_REVISION_NOT_FOUND: 'این درخواست بازنگری پیدا نشد. فهرست درخواست‌ها را تازه کنید.',
  BUDGET_REVISION_DECIDED: 'دربارهٔ این درخواست پیش‌تر تصمیم گرفته شده است. فهرست را تازه کنید.',
  BUDGET_REVISION_INVALID: (details) =>
    typeof details?.['reason'] === 'string' ? details['reason'] : 'درخواست بازنگری کامل نیست. دلیل و دست‌کم یک تغییر بنویسید.',
  BUDGET_REVISION_NOT_ALLOWED: (details) => (typeof details?.['reason'] === 'string' ? details['reason'] : 'بازنگری بودجه در این پروژه ممکن نیست.'),
  ROLE_NOT_FOUND: 'این نقش پیدا نشد. فهرست نقش‌ها را تازه کنید.',
  ROLE_LOCKED: 'دسترسی مدیر سازمان کامل است و تغییر نمی‌کند.',
  ROLE_IN_USE: 'این نقش کاربر دارد یا نقش سیستمی است و حذف نمی‌شود. نقش سیستمی را می‌توانید به پیش‌فرض برگردانید.',
  ROLE_NAME_TAKEN: 'نقشی با همین نام هست؛ نام دیگری بنویسید.',
  PASSWORD_POLICY: (details) => {
    const reason = details?.['reason'];
    return typeof reason === 'string' ? reason : 'رمز تازه با سیاست رمز نمی‌خواند. دست‌کم ۸ نویسه با یک عدد و یک حرف بزرگ لاتین بنویسید.';
  },
  PASSWORD_REUSED: 'این رمز با یکی از ۵ رمز اخیر شما یکی است؛ رمز دیگری انتخاب کنید.',
  PASSWORD_INCORRECT: 'رمز فعلی درست نیست. دوباره امتحان کنید.',
  PASSWORD_EXPIRED: 'مدت اعتبار رمز شما تمام شده است. رمز تازه‌ای بسازید تا وارد شوید.',
  RESET_TOKEN_INVALID: 'مهلت این مرحله تمام شده است. بازیابی رمز را از نو شروع کنید.',
  SIGNUP_MOBILE_TAKEN:
    'این شمارهٔ موبایل پیش‌تر در پروژه‌یار ثبت شده است. از صفحهٔ ورود وارد شوید یا اگر رمز عبور ندارید «فراموشی رمز عبور» را بزنید.',
  SIGNUP_TOKEN_INVALID: 'مهلت این جلسهٔ ثبت‌نام تمام شده یا معتبر نیست. ثبت‌نام را از مرحلهٔ اول شروع کنید.',
  INVITATION_EXPIRED: 'مهلت دعوت شما تمام شده است. از مدیر پروژه بخواهید دعوت را دوباره بفرستد.',
  WEB_ACCESS_APP_ONLY: 'حساب شما برای اپ کارگاه است و پنل وب ندارد. با همین شماره در اپ پروژه‌یار وارد شوید.',
  TWO_FACTOR_REQUIRED_BY_ORG: 'سازمان ورود دومرحله‌ای را اجباری کرده است؛ خاموش کردن آن ممکن نیست.',
  TWO_FACTOR_OFF: 'اول ورود دومرحله‌ای را روشن کنید.',
  SESSION_IS_CURRENT: 'برای خروج از همین دستگاه از «خروج از حساب» استفاده کنید.',
  PROJECT_CODE_TAKEN: (details) => {
    const suggestion = details?.['suggestion'];
    return typeof suggestion === 'string' ? `این کد گرفته شد؛ ${suggestion} را امتحان کنید.` : 'این کد گرفته شد؛ کد دیگری انتخاب کنید.';
  },
};

export function messageFor(code: ErrorCode, details?: Details): string {
  const message = MESSAGES_FA[code];
  return typeof message === 'function' ? message(details) : message;
}
