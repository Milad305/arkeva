import { PERMISSIONS, type Permission } from './permissions.js';

// کاتالوگ ماتریس W27 (access-control.md ۵.۳ و ۵.۴؛ تصمیم 1405/08/19): ردیف‌های W27، هر ردیف کدهای ۵.۴.
// منبع واحد فرانت و بک‌اند — سرور همین را در `GET /roles` برمی‌گرداند. هر کد کاتالوگ دقیقاً در یک ردیف است
// (تست بک‌اند). نماد گروه نام آیکن lucide فرانت است.

export interface CatalogCode {
  readonly code: Permission;
  readonly label: string;
}

export interface CatalogRow {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly codes: readonly CatalogCode[];
}

export interface CatalogGroup {
  readonly key: string;
  readonly title: string;
  readonly icon: string;
  readonly rows: readonly CatalogRow[];
}

const row = (key: string, title: string, description: string, codes: Permission[]): CatalogRow => ({
  key,
  title,
  description,
  codes: codes.map((code) => ({ code, label: PERMISSIONS[code] })),
});

export const PERMISSION_CATALOG: readonly CatalogGroup[] = [
  {
    key: 'project',
    title: 'پروژه و ساختار',
    icon: 'folder-tree',
    rows: [
      row('project.create', 'ایجاد پروژهٔ جدید', 'از صفر، قالب یا فایل MSP', ['project.create']),
      row('project.read', 'مشاهدهٔ پروژه و ساختار', 'سربرگ پروژه، درخت WBS، نسخه‌ها و قالب‌ها', [
        'project.view',
        'wbs.view',
        'plan.view_versions',
        'templates.view',
      ]),
      row('project.lifecycle', 'تنظیمات و چرخهٔ عمر پروژه', 'تنظیمات، فعال‌سازی، توقف، پایان و انتقال مدیریت', [
        'project.settings.edit',
        'project.activate',
        'project.pause',
        'project.complete',
        'project.transfer_manager',
      ]),
      row('wbs.edit', 'ویرایش WBS و وزن‌ها', 'افزودن، جابه‌جایی و تغییر وزن آیتم‌ها', ['wbs.edit', 'wbs.edit_note', 'wbs.export']),
      row('plan', 'نسخه‌های برنامه', 'ویرایش پیش‌نویس، اعمال و مبنای PV', ['plan.edit_draft', 'plan.apply', 'plan.discard', 'plan.set_pv_reference']),
      row('cbs.edit', 'ویرایش CBS و بودجه', 'بازنگری مستقیم، تأیید و درخواست بازنگری', ['cbs.revise_budget', 'cbs.approve_revision', 'cbs.request_revision']),
      row('msp', 'ورود و همگام‌سازی با MSP', 'بارگذاری فایل، تأیید تغییرات و قالب تطبیق', ['msp.import', 'msp.sync', 'msp.export', 'msp.templates.manage']),
      row('templates', 'مدیریت قالب‌ها', 'قالب‌های WBS و CBS سازمان و انتشار نسخهٔ قالب', ['templates.manage', 'templates.publish']),
    ],
  },
  {
    key: 'field',
    title: 'گزارش‌های کارگاه',
    icon: 'clipboard-check',
    rows: [
      row('report.view', 'مشاهده و ثبت دستی', 'صندوق گزارش‌ها و ثبت دستی پیشرفت در وب', ['report.view', 'report.manual_entry']),
      row('report.submit', 'ثبت گزارش پیشرفت', 'از اپلیکیشن اندروید، با عکس و موقعیت', ['report.submit']),
      row('report.stage1', 'تأیید مرحلهٔ اول', 'بازبینی ناظر', ['report.approve.stage1']),
      row('report.stage2', 'تأیید نهایی', 'مرحلهٔ دوم طبق قواعد گردش‌کار', ['report.approve.stage2']),
      row('report.correct', 'اصلاح گزارش تأییدشده', 'با ثبت دلیل در تاریخچه؛ تعیین تکلیف بلاتکلیف‌ها', ['report.correct', 'report.resolve']),
    ],
  },
  {
    key: 'cost',
    title: 'هزینه و قرارداد',
    icon: 'banknote',
    rows: [
      row('cost.read', 'مشاهدهٔ CBS و دفتر هزینه', 'درخت CBS و ردیف‌های هزینه', ['cbs.view', 'cost.view']),
      row('cost.write', 'ثبت هزینهٔ واقعی', 'ثبت، قطعی‌کردن، برگشت، ورود از Excel و تاریخ کامل بودن', [
        'cost.create',
        'cost.post',
        'cost.reverse',
        'cost.import',
        'cost.set_cutoff',
      ]),
      row('amounts', 'مشاهدهٔ مبالغ', 'بدون آن هیچ مبلغ ریالی در صفحه و خروجی نیست (D11)', ['cbs.view_amounts']),
    ],
  },
  {
    key: 'risk',
    title: 'ریسک',
    icon: 'shield-alert',
    rows: [
      row('risk.view', 'مشاهدهٔ دفتر ریسک', 'ریسک‌ها و مشکل‌های کارگاه', ['risk.view']),
      row('risk.create', 'ثبت ریسک', 'ثبت در دفتر ریسک یا گزارش مشکل از کارگاه', ['risk.create', 'risk.create_site_issue']),
      row('risk.manage', 'تغییر وضعیت و مالک ریسک', 'ویرایش، بستن، واگذاری و تخصیص ذخیره', [
        'risk.edit',
        'risk.change_status_owner',
        'risk.allocate_contingency',
      ]),
    ],
  },
  {
    key: 'analytics',
    title: 'گزارش و تحلیل',
    icon: 'bar-chart-3',
    rows: [
      row('charts', 'مشاهدهٔ نمودارها و داشبورد', 'پیشرفت، هزینه، منابع و ریسک', ['progress.view', 'charts.view', 'charts.view_summary', 'dashboard.view']),
      row('reports', 'گزارش‌های مدیریتی', 'مشاهده، تولید، قالب سفارشی، زمان‌بندی و ارسال خودکار', [
        'reports.view',
        'reports.generate',
        'reports.custom_template',
        'reports.schedule',
        'reports.schedule_financial',
      ]),
      row('reports.external', 'ارسال گزارش به بیرون سازمان', 'به ایمیل بیرونی فقط نسخهٔ بی‌مبلغ؛ مبلغ با کد جدا', [
        'reports.send_external',
        'reports.send_amounts_external',
      ]),
      row('periods', 'دوره‌ها، هشدارها و اعلان‌ها', 'بستن دوره، رد هشدار و تنظیم قواعد', [
        'period.view',
        'period.close',
        'alerts.view',
        'alerts.dismiss',
        'alerts.configure',
        'notifications.configure_project',
      ]),
      row('notifications', 'اعلان‌های من و سازمان', 'دیدن اعلان‌های خود (همه) و تنظیم اعلان‌های سازمان', [
        'notifications.view_own',
        'notifications.configure_org',
      ]),
    ],
  },
  {
    key: 'org',
    title: 'تیم و سازمان',
    icon: 'building-2',
    rows: [
      row('team', 'اعضا و تخصیص', 'اعضای پروژه، حوزه‌های تأیید و تخصیص به سرپرستان', [
        'team.view',
        'team.manage',
        'approval_routes.manage',
        'assignment.manage',
      ]),
      row('users', 'دعوت و مدیریت کاربران', 'دعوت، غیرفعال‌سازی و بازکردن قفل', ['users.invite', 'users.manage']),
      row('roles', 'ویرایش نقش‌ها و دسترسی‌ها', 'همین صفحه', ['roles.edit']),
      row('org.settings', 'تنظیمات سازمان و یکپارچه‌سازی', 'اعلان‌ها، ERP، حسابداری', ['org.settings', 'org.integrations']),
      row('archive', 'بایگانی یا حذف پروژه', 'بایگانی، بازگردانی و حذف', ['project.archive', 'project.restore', 'project.delete']),
      row('infra', 'ممیزی، پشتیبان و خروجی کامل', 'لاگ ممیزی و پشتیبان‌گیری', ['audit.view', 'backup.manage', 'org.backup', 'export.full']),
      row('integrations', 'یکپارچه‌سازی ERP، حسابداری و P6', 'مشاهده، اتصال، اجرا، نگاشت حساب و خروجی XER', [
        'integrations.view',
        'integrations.manage',
        'integrations.run',
        'integrations.map_accounts',
        'integrations.export_p6',
      ]),
    ],
  },
];

/**
 * دسترسی ضروری که حذفش از همهٔ نقش‌ها یک رویداد را بی‌گیرنده می‌کند (access-control ۵.۸).
 */
export const ESSENTIAL_PERMISSIONS: readonly { readonly code: Permission; readonly reason: string }[] = [
  { code: 'report.submit', reason: 'ثبت گزارش پیشرفت در هیچ نقشی نمی‌ماند؛ گزارش کارگاه ثبت‌کننده ندارد.' },
  { code: 'report.approve.stage1', reason: 'تأیید مرحلهٔ اول در هیچ نقشی نمی‌ماند؛ گزارش‌های کارگاه تأییدکننده ندارند (NT-APR-01 بی‌گیرنده).' },
  { code: 'report.approve.stage2', reason: 'تأیید نهایی در هیچ نقشی نمی‌ماند؛ آیتم‌های مرحلهٔ دوم بی‌تأییدکننده می‌مانند.' },
  { code: 'alerts.view', reason: 'مشاهدهٔ هشدارها در هیچ نقشی نمی‌ماند؛ هشدارها گیرنده ندارند.' },
];
