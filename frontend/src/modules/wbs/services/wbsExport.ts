import { LEAF_MEASUREMENT_METHODS, WBS_PROGRESS_STATUS } from '@/config/constants';
import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDate } from '@/shared/utils/date';
import { toEnDigits } from '@/shared/utils/num';
import type { WbsItemDto } from '../types';

/**
 * خروجی درخت (`features/wbs.md` ۶.۳) به CSV سمت مرورگر از همان داده‌ای که سرور داده (تصمیم 1405/08/27): ستون‌های قالب ورود
 * (۶.۱) به‌علاوهٔ ستون‌های فقط‌خواندنی پیشرفت و BAC. مبلغ را سرور برای کاربر بی `cbs.view_amounts` حذف کرده است (AC-WBS-10).
 */
export function exportWbsExcel(
  project: { code: string },
  items: readonly WbsItemDto[],
  options: { includeAmounts: boolean },
): void {
  const fileName = `wbs-${project.code}`;

  const jalali = (date: string | null) => (date ? toEnDigits(formatJalaliDate(date)) : '');
  const percent = (value: number | null | undefined) =>
    value == null ? '' : String(Math.round(value * 100) / 100);

  const columns: Array<{ header: string; value: (item: WbsItemDto) => string | number | null }> = [
    { header: 'کد', value: (item) => item.code },
    { header: 'عنوان', value: (item) => item.title },
    { header: 'وزن در والد', value: (item) => item.weightInParent },
    { header: 'واحد', value: (item) => item.unit },
    { header: 'مقدار کل', value: (item) => item.totalQuantity },
    { header: 'شروع برنامه‌ای', value: (item) => jalali(item.plannedStart) },
    { header: 'پایان برنامه‌ای', value: (item) => jalali(item.plannedFinish) },
    {
      header: 'روش اندازه‌گیری',
      value: (item) =>
        item.measurementMethod
          ? LEAF_MEASUREMENT_METHODS[item.measurementMethod]
              .replace('گام‌های وزنی', 'گام‌ها')
              .replace('پیشرفت زمانی', 'زمانی')
          : '',
    },
    // شمارهٔ موبایل را سرور می‌گذارد؛ دادهٔ نمونه شماره ندارد
    { header: 'موبایل سرپرست', value: () => '' },
    { header: 'نقطهٔ عطف', value: (item) => (item.isMilestone ? 'بله' : '') },
    { header: 'سرپرست (فقط‌خواندنی)', value: (item) => item.supervisor?.fullName ?? '' },
    {
      header: 'پیشرفت برنامه‌ای (فقط‌خواندنی)',
      value: (item) => percent(item.progress?.plannedPercent),
    },
    {
      header: 'پیشرفت واقعی (فقط‌خواندنی)',
      value: (item) => percent(item.progress?.actualPercent),
    },
    { header: 'انحراف (فقط‌خواندنی)', value: (item) => percent(item.progress?.deviation) },
    {
      header: 'وضعیت (فقط‌خواندنی)',
      value: (item) => (item.progress ? WBS_PROGRESS_STATUS[item.progress.status] : ''),
    },
  ];
  if (options.includeAmounts) {
    columns.push({ header: 'BAC ریال (فقط‌خواندنی)', value: (item) => item.progress?.bac ?? '' });
  }

  downloadCsv(fileName, toCsv(items, columns));
}
