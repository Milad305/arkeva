import type { PlanContent } from '../../planning/index.js';

// درگاه‌های بخش‌های تنظیمات پروژه که ماژول دیگری مالک داده‌شان است. فایل جدا و بی‌وابستگی تا مالک (مثلاً notifications که
// team آن را import می‌کند) بدون چرخهٔ ESM از راه projects/index آن را پیاده کند.

/** یک ردیف ماتریس اعلان W30 (NotificationMatrixRowDto فرانت). */
export interface NotificationMatrixRowView {
  readonly code: string;
  readonly label: string;
  readonly recipients: string;
  readonly channels: Readonly<Record<'in_app' | 'email' | 'sms' | 'push', 'on' | 'off' | 'na' | 'locked_on'>>;
}

/** ماتریس اعلان پروژه برای بخش «اعلان‌ها»ی تنظیمات — پیاده‌سازی در notifications (F13). */
export abstract class ProjectNotificationMatrix {
  abstract matrix(projectId: string): Promise<NotificationMatrixRowView[]>;
}

/** شمار ریسک باز برای سربرگ پروژه (W10) و نشان «N ریسک باز» برگ WBS (W11) — پیاده‌سازی در risks (F14؛ risk.md ۵.۵). */
export abstract class ProjectRiskCounts {
  /** باز = identified، assessed، in_action؛ «بالا» = امتیاز ≥ ۱۵. */
  abstract counts(projectIds: readonly string[]): Promise<Map<string, { readonly open: number; readonly high: number }>>;
  abstract openByWbsItem(projectId: string): Promise<Map<string, number>>;
}

/** کارت قالب مرحلهٔ ۴ ویزارد (W38؛ WizardTemplateDto پنل). */
export interface WizardTemplateView {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly version: string;
  readonly wbsCount: number;
  readonly cbsCount: number;
  readonly usedIn: number;
  readonly recommended: boolean;
  readonly copies: string[];
}

/** محتوای آمادهٔ پروژه از آخرین نسخهٔ منتشرشدهٔ قالب (templates.md ۵.۳). */
export interface PreparedTemplate {
  readonly templateId: string;
  readonly version: number;
  readonly content: PlanContent;
  readonly areas: readonly { readonly name: string; readonly rootItemIds: string[] }[];
  readonly settings: Readonly<Record<string, unknown>>;
}

/** قالب‌ها برای ویزارد و ساخت پروژه — پیاده‌سازی در templates (F16). */
export abstract class ProjectTemplates {
  abstract forWizard(projectTypeId: string | null): Promise<WizardTemplateView[]>;
  /** قالب منتشرنشده، بایگانی یا ناموجود ← خطای ۴۲۲. */
  abstract prepare(templateId: string, input: { readonly workDays: readonly string[]; readonly cbsBudget: bigint }): Promise<PreparedTemplate>;
}

/** بخش «پشتیبان و خروجی» W30 (BackupsDto فرانت) — پیاده‌سازی در backups (F20 ۱۲). */
export interface BackupsView {
  readonly schedule: 'daily' | 'weekly' | 'off';
  readonly items: readonly {
    readonly id: string;
    readonly at: string;
    readonly sizeText: string;
    readonly kind: 'auto' | 'manual';
    readonly note: string | null;
  }[];
  readonly fullBackupSizeText: string;
  /** آخرین خروجی کامل؛ فقط برای دارندهٔ `export.full`. */
  readonly fullExport: {
    readonly id: string;
    readonly status: 'queued' | 'running' | 'done' | 'failed' | 'expired';
    readonly includesAmounts: boolean;
    readonly createdAt: string;
    readonly expiresAt: string | null;
    readonly sizeText: string | null;
    readonly error: string | null;
  } | null;
}

export abstract class ProjectBackupsView {
  abstract view(projectId: string): Promise<BackupsView>;
}

/** کارت یکپارچه‌سازی W30 (IntegrationCardDto فرانت). */
export interface IntegrationCardView {
  readonly key: 'msp' | 'erp' | 'accounting' | 'p6';
  readonly title: string;
  readonly description: string;
  readonly status: 'connected' | 'not_linked' | 'soon' | 'export_only';
  readonly message: string;
}

/** کارت‌های یکپارچه‌سازی — پیاده‌سازی در integrations (F19 ۸، ۹). */
export abstract class ProjectIntegrationCards {
  abstract cards(projectId: string, mspLinked: boolean): Promise<IntegrationCardView[]>;
}
