import { toFaDigits } from '@/shared/utils/num';

/** دلیل غیرفعال بودن «اعمال…» — یک‌جا برای همهٔ صفحه‌های ویرایش. */
export function applyBlockedReason(
  dirty: boolean,
  hasDraft: boolean,
  errorCount: number,
  canApply: boolean,
): string | undefined {
  if (dirty) return 'اول تغییرها را ذخیره کنید';
  if (!hasDraft) return 'هنوز تغییری در نسخهٔ کاری ذخیره نشده است';
  if (errorCount > 0) return `${toFaDigits(errorCount)} خطا مانع اعمال است`;
  if (!canApply) return 'نسخهٔ کاری با برنامهٔ جاری فرقی ندارد';
  return undefined;
}
