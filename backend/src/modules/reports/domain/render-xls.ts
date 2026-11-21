import type { ReportContent } from '../application/report-data.js';

// Excel گزارش (management-reports.md ۷.۲ بند ۴؛ تصمیم کاربر 1405/08/26: SpreadsheetML بی وابستگی): هر بخش یک برگه؛ مبلغ ریال
// خام (عدد، بی قالب‌بندی نمایش)؛ درصدها عدد. Excel و LibreOffice آن را باز می‌کنند (پسوند .xls).

type Row = Record<string, unknown>;
const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'bigint' ? String(value) : '');
const esc = (value: unknown) => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

function cell(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  if (typeof value === 'bigint' || (typeof value === 'string' && /^-?\d{1,18}$/.test(value)))
    return `<Cell><Data ss:Type="Number">${String(value)}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${esc(value === null || value === undefined ? '' : value)}</Data></Cell>`;
}

/** جدول هر بخش: سرستون و ردیف‌ها با مقادیر خام. */
function sheetRows(section: Row): unknown[][] {
  switch (section['key']) {
    case 'summary':
      return [['شاخص', 'مقدار', 'توضیح'], ...list(section['kpis']).map((kpi) => [kpi['label'], kpi['value'], kpi['sub']]), [], ['متن', section['text']]];
    case 'progress':
      return [
        ['برنامه (٪)', section['plannedPercent'], 'واقعی (٪)', section['actualPercent']],
        [],
        ['کد', 'عنوان', 'انحراف (٪)'],
        ...list(section['deviations']).map((row) => [row['code'], row['title'], row['deviation']]),
      ];
    case 'cost':
      return [
        ['BAC (ریال)', 'AC (ریال)', 'EV (ریال)', 'EAC (ریال)', 'CPI', 'TCPI'],
        [section['bac'], section['ac'], section['ev'], section['eac'], section['cpi'], section['tcpi']],
        [],
        ['نوع هزینه', 'سهم بودجه (٪)'],
        ...list(section['byType']).map((row) => [row['label'], row['percent']]),
      ];
    case 'cost_ledger':
      return [
        ['کد', 'عنوان', 'نوع', 'بودجه (ریال)', 'هزینهٔ بازه (ریال)', 'مصرف (٪)'],
        ...list(section['rows']).map((row) => [row['code'], row['title'], row['type'], row['budget'], row['ac'], row['consumedPercent']]),
        [],
        ['جمع', '', '', '', section['total']],
      ];
    case 'risks':
      return [['کد', 'عنوان', 'امتیاز'], ...list(section['items']).map((row) => [row['code'], row['title'], row['score']])];
    case 'resources':
      return [
        ['گزارش', section['reportCount'], 'پوشش (٪)', section['coveragePercent'], 'میانگین تأیید (ساعت)', section['avgApprovalHours']],
        [],
        ['سرپرست', 'روزهای گزارش', 'پوشش (٪)'],
        ...list(section['supervisors']).map((row) => [row['name'], row['reports'], row['coveragePercent']]),
      ];
    case 'field':
      return [
        ['ثبت', 'تأیید', 'برگشت', 'در انتظار'],
        [section['submitted'], section['approved'], section['returned'], section['pending']],
      ];
    case 'photos':
      return [['کد', 'عنوان', 'تاریخ کار'], ...list(section['items']).map((row) => [row['code'], row['title'], row['takenAt']])];
    case 'milestones':
      return [
        ['نقطهٔ عطف', 'تاریخ برنامه', 'وضعیت', 'تأخیر (روز کاری)'],
        ...list(section['items']).map((row) => [row['title'], row['plannedDate'], row['status'], row['delayWorkingDays']]),
      ];
    case 'integration':
      return [['مورد', 'وضعیت'], ...list(section['rows']).map((row) => [row['label'], row['value']])];
    case 'portfolio':
      return [
        ['کد', 'پروژه', 'برنامه (٪)', 'واقعی (٪)', 'انحراف (٪)', 'CPI', 'SPI'],
        ...list(section['rows']).map((row) => [
          row['code'],
          row['name'],
          row['plannedPercent'],
          row['actualPercent'],
          row['deviation'],
          row['cpi'],
          row['spi'],
        ]),
      ];
    default:
      return [];
  }
}

export function renderXls(content: ReportContent): string {
  const used = new Set<string>();
  const sheets = (content.sections as Row[])
    .map((section) => {
      let name = String(section['title'])
        .replace(/[\\/?*[\]:]/g, ' ')
        .slice(0, 31);
      while (used.has(name)) name = `${name.slice(0, 28)} ${used.size}`;
      used.add(name);
      const rows = section['empty'] ? [[section['empty']]] : sheetRows(section);
      return `<Worksheet ss:Name="${esc(name)}"><Table>${rows.map((row) => `<Row>${row.map(cell).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet>`;
    })
    .join('');
  const info = `<Worksheet ss:Name="مشخصات"><Table>${[
    ['گزارش', content.templateName],
    ['سازمان', content.header.orgName],
    ['پروژه', `${content.header.projectName} ${content.header.projectCode}`],
    ['بازه', content.header.rangeLabel],
    ['منبع', content.sourceKind === 'period_snapshot' ? 'عکس دورهٔ بسته' : 'اعداد جاری'],
    ['یادداشت', content.openPeriodNote ?? ''],
    ['تولید', content.header.generatedAtLabel],
  ]
    .map((row) => `<Row>${row.map(cell).join('')}</Row>`)
    .join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">${info}${sheets}</Workbook>
`;
}
