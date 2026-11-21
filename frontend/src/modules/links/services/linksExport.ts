import { downloadCsv } from '@/shared/utils/csv';

/** قالب ورود اتصال‌ها (cbs.md ۱۰) با دو ردیف نمونه: قلم نرخ واحد با مقدار، قلم مقطوع با مبلغ. */
export function downloadLinksTemplate(): void {
  const rows = [
    ['کد WBS', 'کد CBS', 'مقدار', 'مبلغ ریال'],
    ['1.2.1.1', 'C.1.1.4', '200', ''],
    ['1.2.1.1', 'C.4.1', '', '450000000'],
  ];
  downloadCsv('links-template', rows.map((cells) => cells.join(',')).join('\r\n'));
}
