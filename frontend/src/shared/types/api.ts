/**
 * شناسهٔ موجودیت.
 * C01: شناسهٔ داخلی همهٔ موجودیت‌ها UUID است.
 * کد WBS (`1.2.3`)، کد CBS (`C.1.1.2`) و کدهای خوانای C05 فقط نمایشی‌اند و هرگز کلید نیستند.
 */
export type EntityId = string;

/**
 * مبلغ ریالی.
 *
 * C02: مبالغ به ریال صحیح `bigint` ذخیره می‌شوند. در JSON به‌صورت **رشته** منتقل
 * می‌شوند (مسیر پیش‌فرض node-postgres برای `int8`) تا هیچ احتمال سرریزی نماند.
 * تبدیل یک‌بار در مرز ورودی انجام می‌شود؛ هیچ محاسبه‌ای روی این رشته انجام نمی‌شود
 * چون محاسبهٔ کسب‌وکاری در فرانت ممنوع است (D07).
 */
export type RialAmount = string;

/**
 * درصد و وزن.
 * C04: بازهٔ ۰ تا ۱۰۰ با ۴ رقم اعشار (`numeric(7,4)`). در JSON عدد است.
 */
export type Percent = number;

/** تاریخ کاری میلادی `YYYY-MM-DD` (C03). نمایش همیشه شمسی است. */
export type IsoDate = string;

/** لحظهٔ UTC (`timestamptz`) به شکل ISO 8601 (C03). */
export type IsoInstant = string;

/** قالب استاندارد پاسخ API — همهٔ endpointها در این پوشانده می‌شوند. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/** صفحه‌بندی مبتنی بر cursor (قرارداد API در `CLAUDE.md` بخش ۴). */
export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/** ساختار خطای استاندارد بک‌اند (`CLAUDE.md` بخش ۴). */
export interface ApiErrorResponse {
  code: string;
  /** پیام فارسی و بدون سرزنش کاربر، با یک راه ادامه. */
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
  retryable: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}

/** پارامترهای مشترک فهرست‌ها. */
export interface ListParams {
  cursor?: string;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * زمان آخرین بازمحاسبهٔ یک مقدار مشتق (D07).
 * هر DTO که مقدار محاسبه‌شده دارد این را حمل می‌کند تا UI بتواند
 * «در حال به‌روزرسانی» نشان دهد.
 */
export interface Computed {
  computedAt: IsoInstant | null;
}
