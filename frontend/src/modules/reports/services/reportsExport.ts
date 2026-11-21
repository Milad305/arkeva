import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import type { FieldReportSummaryDto, InboxTab } from '../types';

/**
 * خروجی Excel صندوق (W20 ۵.۱) — سرور `GET /inbox/field-items/export.xlsx` با همان فیلترها.
 * CSV سمت مرورگر از گزارش‌های فیلترشدهٔ صفحه.
 */
export function exportInbox(
  fileName: string,
  reports: FieldReportSummaryDto[],
  tab: InboxTab,
): void {
  downloadCsv(
    `${fileName}-${tab}`,
    toCsv(reports, [
      { header: 'شمارهٔ گزارش', value: (report) => report.reportNo },
      { header: 'پروژه', value: (report) => report.projectName },
      { header: 'سرپرست', value: (report) => report.author.fullName },
      {
        header: 'منبع',
        value: (report) => (report.source === 'web_manual' ? 'ثبت دستی وب' : 'اپ'),
      },
      { header: 'تاریخ کار', value: (report) => formatJalaliDate(report.workDate) },
      { header: 'دریافت', value: (report) => formatJalaliDateTime(report.serverReceivedAt) },
      { header: 'آیتم‌ها', value: (report) => report.itemCount },
      { header: 'در انتظار', value: (report) => report.counts.pending },
      { header: 'تأییدشده', value: (report) => report.counts.approved },
      { header: 'نیاز اصلاح', value: (report) => report.counts.needs_revision },
      { header: 'رد شده', value: (report) => report.counts.rejected },
      { header: 'پرچم', value: (report) => report.flagLabel },
      { header: 'عکس', value: (report) => report.photoCount },
      { header: 'آفلاین', value: (report) => (report.offline ? 'بله' : '') },
    ]),
  );
}
