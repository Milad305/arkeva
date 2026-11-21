// بخش‌ها، دسته‌ها و قالب‌های سیستمی گزارش مدیریتی (management-reports.md ۴، ۵؛ تصمیم 1405/08/20 بند ۲: نُه قالب و پرتفوی).

export const SECTION_KEYS = [
  'summary',
  'progress',
  'cost',
  'cost_ledger',
  'risks',
  'resources',
  'field',
  'photos',
  'milestones',
  'integration',
  'portfolio',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export const CATEGORIES = ['project', 'financial', 'resources', 'risk', 'integration', 'internal'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Audience = 'internal' | 'client';
export type Scope = 'project' | 'portfolio';
export type Format = 'pdf' | 'xlsx';

export const SECTIONS: Record<SectionKey, { label: string; description: string; hasAmounts: boolean }> = {
  summary: { label: 'خلاصهٔ مدیریتی', description: 'پیشرفت، انحراف، پیش‌بینی و شمار هشدارها با متن قالب ثابت', hasAmounts: false },
  progress: { label: 'پیشرفت و انحراف', description: 'منحنی S، پیشرفت گروه‌ها و ۱۰ انحراف مهم', hasAmounts: false },
  cost: { label: 'هزینه', description: 'BAC، AC، EV، EAC، CPI، TCPI و هزینه به تفکیک نوع', hasAmounts: true },
  cost_ledger: { label: 'ریز هزینه‌ها', description: 'ردیف‌های هزینهٔ بازه بر پایهٔ اقلام CBS', hasAmounts: true },
  risks: { label: 'ریسک‌ها', description: 'ریسک‌های اصلی، ماتریس و اقدام‌های معوق', hasAmounts: true },
  resources: { label: 'منابع و تأیید', description: 'پوشش گزارش روزانه، زمان تأیید و بار کاری', hasAmounts: false },
  field: { label: 'گزارش‌های کارگاه', description: 'شمار ثبت، تأیید، برگشت و در انتظار', hasAmounts: false },
  photos: { label: 'عکس‌های کارگاه', description: 'تا ۱۲ عکس از آیتم‌های تأییدشدهٔ بازه', hasAmounts: false },
  milestones: { label: 'نقاط عطف', description: 'نقاط عطف گذشته و پیش رو', hasAmounts: false },
  integration: { label: 'یکپارچه‌سازی', description: 'وضعیت MSP و اتصال‌ها', hasAmounts: false },
  portfolio: { label: 'پرتفوی پروژه‌ها', description: 'همهٔ پروژه‌های فعال با CPI و SPI در یک جدول', hasAmounts: false },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  project: 'پروژه',
  financial: 'مالی',
  resources: 'منابع',
  risk: 'ریسک',
  integration: 'یکپارچه‌سازی',
  internal: 'داخلی',
};

/** قالب `client` هیچ‌گاه مبلغ ندارد (۷.۳؛ AC-MR-02). */
export const hasAmounts = (sections: readonly SectionKey[], audience: Audience) => audience !== 'client' && sections.some((key) => SECTIONS[key].hasAmounts);

export interface TemplateDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: Category;
  readonly audience: Audience;
  readonly scope: Scope;
  readonly sections: readonly SectionKey[];
  readonly formats: readonly Format[];
  readonly isSystem: boolean;
  readonly status: 'ready' | 'preview';
}

const sys = (def: Omit<TemplateDef, 'isSystem' | 'status'> & { status?: 'ready' | 'preview' }): TemplateDef => ({ status: 'ready', ...def, isSystem: true });

export const SYSTEM_TEMPLATES: readonly TemplateDef[] = [
  sys({
    id: 'rt-weekly',
    name: 'وضعیت هفتگی پروژه',
    description: 'پیشرفت، انحراف، هزینه، ریسک‌های باز و عکس‌های کارگاه',
    icon: 'file-text',
    category: 'project',
    audience: 'internal',
    scope: 'project',
    sections: ['summary', 'progress', 'cost', 'risks', 'photos'],
    formats: ['pdf'],
  }),
  sys({
    id: 'rt-client-monthly',
    name: 'گزارش ماهانهٔ کارفرما',
    description: 'قالب رسمی کارفرما؛ بدون هیچ مبلغی، با نقاط عطف و عکس‌های کارگاه',
    icon: 'briefcase',
    category: 'project',
    audience: 'client',
    scope: 'project',
    sections: ['summary', 'progress', 'milestones', 'photos'],
    formats: ['pdf'],
  }),
  sys({
    id: 'rt-exec',
    name: 'خلاصهٔ مدیریتی',
    description: 'یک صفحه برای مدیرعامل: پیشرفت، انحراف و ریسک‌های اصلی',
    icon: 'gauge',
    category: 'project',
    audience: 'internal',
    scope: 'project',
    sections: ['summary', 'progress', 'risks'],
    formats: ['pdf'],
  }),
  sys({
    id: 'rt-portfolio',
    name: 'پرتفوی پروژه‌ها',
    description: 'همهٔ پروژه‌های فعال سازمان در یک نگاه با شاخص‌های CPI و SPI',
    icon: 'layout-dashboard',
    category: 'project',
    audience: 'internal',
    scope: 'portfolio',
    sections: ['portfolio', 'risks'],
    formats: ['pdf', 'xlsx'],
  }),
  sys({
    id: 'rt-financial',
    name: 'گزارش مالی پروژه',
    description: 'ارزش کسب‌شده، پیش‌بینی هزینه و ریز اقلام CBS',
    icon: 'line-chart',
    category: 'financial',
    audience: 'internal',
    scope: 'project',
    sections: ['cost', 'cost_ledger'],
    formats: ['pdf', 'xlsx'],
  }),
  sys({
    id: 'rt-cbs',
    name: 'ریز هزینه‌ها بر پایهٔ CBS',
    description: 'مقایسهٔ بودجهٔ هر قلم با هزینهٔ واقعی و درصد مصرف',
    icon: 'receipt',
    category: 'financial',
    audience: 'internal',
    scope: 'project',
    sections: ['cost', 'cost_ledger'],
    formats: ['xlsx'],
  }),
  sys({
    id: 'rt-supervisors',
    name: 'عملکرد سرپرستان و تأیید',
    description: 'پوشش گزارش روزانه، زمان تأیید و کیفیت گزارش‌ها',
    icon: 'hard-hat',
    category: 'resources',
    audience: 'internal',
    scope: 'project',
    sections: ['resources', 'field'],
    formats: ['xlsx', 'pdf'],
  }),
  sys({
    id: 'rt-risk',
    name: 'دفتر ریسک',
    description: 'ریسک‌های باز با امتیاز و شمار بحرانی‌ها',
    icon: 'shield-alert',
    category: 'risk',
    audience: 'internal',
    scope: 'project',
    sections: ['risks'],
    formats: ['xlsx', 'pdf'],
  }),
  sys({
    id: 'rt-integration',
    name: 'وضعیت یکپارچه‌سازی',
    description: 'وضعیت همگام‌سازی MSP و اتصال‌های بیرونی',
    icon: 'plug',
    category: 'integration',
    audience: 'internal',
    scope: 'project',
    sections: ['integration'],
    formats: ['pdf'],
    status: 'preview',
  }),
  sys({
    id: 'rt-charts',
    name: 'نمودارها',
    description: 'پشتیبان «خروجی PDF کامل» صفحه‌های نمودار W21 تا W24',
    icon: 'bar-chart-3',
    category: 'internal',
    audience: 'internal',
    scope: 'project',
    sections: ['progress', 'cost', 'resources', 'risks'],
    formats: ['pdf'],
  }),
];
