import type { Permission } from '@projeyar/shared';

// دستورهای جستجوی سریع (W43؛ platform.md ۹.۱ ردیف ۲): «رفتن به» صفحه‌های مجاز و اقدام‌ها، هر کدام پشت کد خودش.

export interface CommandSpec {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly to: string;
  readonly shortcut: string | null;
  /** کد لازم در دست‌کم یک پروژه؛ تهی = همه. */
  readonly code: Permission | null;
  readonly keywords: string;
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    id: 'go-dashboard',
    title: 'رفتن به داشبورد',
    subtitle: 'نمای کلی سازمان',
    icon: 'layout-dashboard',
    to: '/dashboard',
    shortcut: 'G D',
    code: null,
    keywords: 'داشبورد خانه dashboard',
  },
  {
    id: 'go-projects',
    title: 'رفتن به پروژه‌ها',
    subtitle: 'فهرست پروژه‌های سازمان',
    icon: 'folder-kanban',
    to: '/projects',
    shortcut: 'G P',
    code: null,
    keywords: 'پروژه ها projects',
  },
  {
    id: 'go-reports',
    title: 'رفتن به گزارش‌های کارگاه',
    subtitle: 'صندوق گزارش‌های همهٔ پروژه‌ها',
    icon: 'clipboard-check',
    to: '/reports',
    shortcut: 'G F',
    code: 'report.view',
    keywords: 'گزارش کارگاه صندوق reports',
  },
  {
    id: 'go-risks',
    title: 'رفتن به ریسک‌ها',
    subtitle: 'دفتر ریسک سازمان',
    icon: 'shield-alert',
    to: '/risks',
    shortcut: 'G R',
    code: 'risk.view',
    keywords: 'ریسک risks',
  },
  {
    id: 'go-management-reports',
    title: 'رفتن به گزارش‌های مدیریتی',
    subtitle: 'قالب‌ها، زمان‌بندی‌ها و خروجی‌ها',
    icon: 'bar-chart-3',
    to: '/management-reports',
    shortcut: 'G M',
    code: 'reports.view',
    keywords: 'گزارش مدیریتی مدیران management',
  },
  {
    id: 'go-templates',
    title: 'رفتن به قالب‌ها',
    subtitle: 'کتابخانهٔ قالب‌های WBS و CBS',
    icon: 'layout-template',
    to: '/templates',
    shortcut: 'G T',
    code: 'templates.view',
    keywords: 'قالب templates',
  },
  {
    id: 'go-users',
    title: 'رفتن به کاربران و نقش‌ها',
    subtitle: 'کاربران سازمان و ماتریس دسترسی',
    icon: 'users',
    to: '/users',
    shortcut: 'G U',
    code: 'users.invite',
    keywords: 'کاربر نقش دسترسی users',
  },
  {
    id: 'go-account',
    title: 'رفتن به حساب من',
    subtitle: 'پروفایل، امنیت و ترجیحات نمایش',
    icon: 'user-cog',
    to: '/account',
    shortcut: null,
    code: null,
    keywords: 'حساب پروفایل رمز account',
  },
  {
    id: 'go-help',
    title: 'رفتن به راهنما و پشتیبانی',
    subtitle: 'راهنمای نقش‌ها، پرسش‌ها و میان‌برها',
    icon: 'life-buoy',
    to: '/help',
    shortcut: null,
    code: null,
    keywords: 'راهنما پشتیبانی کمک help',
  },
  {
    id: 'new-project',
    title: 'ساخت پروژهٔ جدید',
    subtitle: 'ویزارد چهارمرحله‌ای',
    icon: 'folder-plus',
    to: '/projects/new',
    shortcut: null,
    code: 'project.create',
    keywords: 'پروژه جدید ساخت new',
  },
  {
    id: 'msp-import',
    title: 'ورود ساختار از Microsoft Project',
    subtitle: 'برای پروژهٔ پیش‌نویس بدون WBS',
    icon: 'file-code-2',
    to: '/msp/import',
    shortcut: null,
    code: 'msp.import',
    keywords: 'msp ورود ایمپورت mpp xml',
  },
];
