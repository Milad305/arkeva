/**
 * رنگ‌بندی معنایی مشترک کیت.
 * هر مقدار دقیقاً یکی از کلاس‌های kit.css است و روی `.bdg` / `.icb` / `.alert` / `.fd` کار می‌کند.
 */
export type Tone = 'ok' | 'inf' | 'wrn' | 'err' | 'neu' | 'pri' | 'acc' | 'vio' | 'cya';

/** زیرمجموعه‌ای که `.alert` در kit.css پشتیبانی می‌کند. */
export type AlertTone = Extract<Tone, 'ok' | 'inf' | 'wrn' | 'err'>;

/** نوع هزینهٔ CBS — کلاس‌های `.ct` در kit.css. */
/** کدهای cbs.md ۴.۲ (تصمیم کاربر 1405/08/23؛ همان CHECK پایگاه داده). */
export type CostType = 'materials' | 'labor' | 'equipment' | 'transport' | 'subcontract' | 'overhead' | 'other';

/** کلاس kit برای هر نوع هزینه. */
export const COST_TYPE_CLASS: Record<CostType, string> = {
  materials: 'mat',
  labor: 'lab',
  equipment: 'eq',
  subcontract: 'sub',
  overhead: 'ovh',
  transport: 'tr',
  other: 'ovh',
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  materials: 'مصالح',
  labor: 'نیروی انسانی',
  equipment: 'ماشین‌آلات',
  subcontract: 'پیمانکار جزء',
  overhead: 'بالاسری و تجهیز کارگاه',
  transport: 'حمل',
  other: 'سایر',
};
