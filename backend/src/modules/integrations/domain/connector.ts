// رابط اتصال بیرونی (F19 ۹): هر اتصال بعدی (ERP، حسابداری، سفارشی) فقط یک پیاده‌سازی از این رابط است و هسته را عوض نمی‌کند.
// ورود فقط از راه API دفتر هزینه با `source = integration` و کلید `(projectId, source, externalRef)` (D02؛ integrations.md ۴).
// در نسخهٔ اول هیچ پیاده‌سازی و اجرای زمان‌بندی‌شده‌ای نیست.

export const INTEGRATION_SYSTEMS = ['erp', 'accounting', 'p6_export', 'custom'] as const;
export type IntegrationSystem = (typeof INTEGRATION_SYSTEMS)[number];

/** یک ردیف تعهدی بیرونی (فاکتور، صورت‌وضعیت پیمانکار جزء، حقوق) پیش از نگاشت حساب. */
export interface ExternalCostRow {
  readonly externalRef: string;
  readonly accountCode: string;
  /** ریال (C02). */
  readonly amount: bigint;
  /** تاریخ تحقق، نه پرداخت (AC-IN-04). */
  readonly costDate: string;
  readonly documentNo: string | null;
  readonly counterparty: string | null;
  readonly description: string | null;
  /** حذف در منبع ← ردیف برگشتی یا حذف پیش‌نویس (۶.۱ بند ۶). */
  readonly deleted: boolean;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface PullResult {
  readonly rows: readonly ExternalCostRow[];
  /** نشانگر آخرین تغییر برای اجرای بعد. */
  readonly nextCursor: string | null;
}

export interface IntegrationConnector {
  readonly system: IntegrationSystem;
  /** «آزمایش و اتصال» فرم W30؛ پیام فارسی بی سرزنش. */
  test(): Promise<{ readonly ok: boolean; readonly message: string }>;
  pull(cursor: string | null): Promise<PullResult>;
  /** اتصال «فقط خروجی». */
  push(payload: Buffer): Promise<void>;
}
