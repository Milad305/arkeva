import { PROJECT_STATUS } from '@/config/constants';
import { downloadCsv, toCsv, type CsvColumn } from '@/shared/utils/csv';
import { formatJalaliDate, todayIso } from '@/shared/utils/date';
import type { ProjectListItemDto } from '../types';

/**
 * خروجی فهرست پروژه‌ها.
 *
 * مبالغ فقط وقتی می‌آیند که کاربر `cbs.view_amounts` داشته باشد؛ همان قاعدهٔ
 * حذف مبلغ در خروجی D11 که سرور برای Excel و PDF هم اعمال می‌کند.
 */
export function exportProjectsCsv(
  projects: readonly ProjectListItemDto[],
  options: { includeAmounts: boolean },
): void {
  const columns: Array<CsvColumn<ProjectListItemDto>> = [
    { header: 'کد', value: (p) => p.code },
    { header: 'نام پروژه', value: (p) => p.name },
    { header: 'کارفرما', value: (p) => p.clientName },
    { header: 'مدیر پروژه', value: (p) => p.manager.fullName },
    { header: 'وضعیت', value: (p) => PROJECT_STATUS[p.status] },
    { header: 'در خطر', value: (p) => (p.atRisk ? 'بله' : '') },
    { header: 'پیشرفت برنامه‌ای ٪', value: (p) => p.progress?.plannedPercent },
    { header: 'پیشرفت واقعی ٪', value: (p) => p.progress?.actualPercent },
    { header: 'انحراف (واحد درصد)', value: (p) => p.progress?.deviation },
    { header: 'CPI', value: (p) => p.progress?.cpi },
    { header: 'SPI', value: (p) => p.progress?.spi },
    { header: 'پایان برنامه‌ای', value: (p) => formatJalaliDate(p.plannedFinish) },
    {
      header: 'پایان پیش‌بینی',
      value: (p) => formatJalaliDate(p.progress?.forecastFinish ?? null),
    },
  ];

  if (options.includeAmounts) {
    columns.push(
      // ریال صحیح، بدون قالب‌بندی، تا Excel آن را عدد بشناسد (C02)
      { header: 'بودجه (ریال)', value: (p) => p.progress?.bac },
      { header: 'هزینهٔ واقعی (ریال)', value: (p) => p.progress?.ac },
      { header: 'مصرف بودجه ٪', value: (p) => p.budgetConsumedPercent },
    );
  }

  downloadCsv(`projects-${todayIso()}`, toCsv(projects, columns));
}
