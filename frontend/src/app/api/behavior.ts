/**
 * رفتار سراسری هر endpoint — نشانگر بارگذاری و پیام‌های موفقیت و خطا.
 *
 * چرا رجیستری و نه `extraOptions` روی خود endpoint:
 * RTK Query مقدار `extraOptions` را در اکشن‌های چرخهٔ عمر (`pending`/`fulfilled`/`rejected`)
 * قرار نمی‌دهد؛ `meta.arg` فقط `endpointName`، `originalArgs` و چند فیلد داخلی دارد.
 * پس میان‌افزار راهی برای خواندن آن ندارد. این نقشه کنار تعریف endpointها پر می‌شود
 * و میان‌افزار با `endpointName` از آن می‌خواند.
 */
export interface ApiBehaviorConfig {
  /** نشانگر بارگذاری سراسری؛ فقط برای mutationهای کُند. */
  showGlobalLoading?: boolean;
  loadingMessage?: string;
  showSuccessToast?: boolean;
  successMessage?: string;
  /** پیش‌فرض روشن است؛ برای صفحه‌هایی که خودشان خطا را نشان می‌دهند خاموش کن. */
  showErrorToast?: boolean;
  errorMessage?: string;
}

const registry = new Map<string, ApiBehaviorConfig>();

/**
 * ثبت رفتار چند endpoint. هر ماژول کنار تعریف endpointهایش صدا می‌زند.
 * کلیدها همان نام endpoint در `injectEndpoints` هستند.
 */
export function registerApiBehavior(entries: Record<string, ApiBehaviorConfig>): void {
  for (const [endpointName, config] of Object.entries(entries)) {
    registry.set(endpointName, config);
  }
}

export function behaviorFor(endpointName: string | undefined): ApiBehaviorConfig | undefined {
  return endpointName ? registry.get(endpointName) : undefined;
}
