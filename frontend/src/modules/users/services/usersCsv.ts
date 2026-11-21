import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDateTime } from '@/shared/utils/date';
import { roleLabel } from '@/modules/team/services/teamView';
import type { ImportRowInput, OrgUserRowDto } from '../types';

// ورود گروهی W26 (F01 ۵.۶): ستون‌های نام، موبایل، ایمیل (اختیاری)، کد پروژه، نقش.
// [پیش‌فرض فنی] در نسخهٔ وب CSV؛ Excel را با «ذخیره به‌صورت CSV UTF-8» می‌سازند (تصمیم 1405/08/19).

const HEADERS = ['نام', 'موبایل', 'ایمیل', 'کد پروژه', 'نقش'] as const;

export function downloadImportTemplate(): void {
  const sample = [
    {
      name: 'فرهاد کیانی',
      mobile: '09121230001',
      email: '',
      project: 'PRJ-1404-021',
      role: 'سرپرست کارگاه',
    },
    {
      name: 'لیلا رحمانی',
      mobile: '09121230002',
      email: 'l.rahmani@abadgaran.ir',
      project: 'PRJ-1402-008',
      role: 'ناظر',
    },
  ];
  downloadCsv(
    'users-import-template.csv',
    toCsv(sample, [
      { header: HEADERS[0], value: (row) => row.name },
      { header: HEADERS[1], value: (row) => row.mobile },
      { header: HEADERS[2], value: (row) => row.email },
      { header: HEADERS[3], value: (row) => row.project },
      { header: HEADERS[4], value: (row) => row.role },
    ]),
  );
}

/** CSV با نقل‌قول‌های استاندارد؛ جداکنندهٔ کاما یا نقطه‌ویرگول (Excel فارسی). */
function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index]!;
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim()));
}

export async function readImportFile(file: File): Promise<ImportRowInput[]> {
  if (!/\.(csv|txt)$/i.test(file.name))
    throw new Error('فایل را در Excel با «CSV UTF-8» ذخیره کنید و همان را بارگذاری کنید.');
  const rows = parseCsv(await file.text());
  if (rows.length === 0) throw new Error('فایل خالی است؛ از الگو استفاده کنید.');
  const header = rows[0]!.map((value) => value.trim());
  const hasHeader = header.includes(HEADERS[0]) || header.includes(HEADERS[1]);
  const index = (name: (typeof HEADERS)[number], fallback: number) =>
    hasHeader ? header.indexOf(name) : fallback;
  const at = [
    index('نام', 0),
    index('موبایل', 1),
    index('ایمیل', 2),
    index('کد پروژه', 3),
    index('نقش', 4),
  ];
  return rows.slice(hasHeader ? 1 : 0).map((cells, offset) => {
    const value = (column: number) => (at[column]! >= 0 ? (cells[at[column]!] ?? '').trim() : '');
    return {
      line: offset + (hasHeader ? 2 : 1),
      fullName: value(0),
      mobile: value(1),
      email: value(2),
      projectCode: value(3),
      role: value(4),
    };
  });
}

const STATUS: Record<OrgUserRowDto['status'], string> = {
  active: 'فعال',
  invited: 'دعوت‌شده',
  locked: 'قفل‌شده',
  disabled: 'غیرفعال',
};

/** خروجی فهرست W26 — CSV از ردیف‌های فیلترشده. */
export function exportUsers(rows: OrgUserRowDto[]): void {
  downloadCsv(
    'org-users.csv',
    toCsv(rows, [
      { header: 'نام', value: (row) => row.fullName },
      { header: 'ایمیل یا موبایل', value: (row) => row.contact },
      { header: 'نقش‌ها', value: (row) => row.roles.map(roleLabel).join('، ') },
      {
        header: 'پروژه‌ها',
        value: (row) => row.projects.map((project) => project.code).join('، '),
      },
      {
        header: 'آخرین فعالیت',
        value: (row) => (row.lastActiveAt ? formatJalaliDateTime(row.lastActiveAt) : ''),
      },
      { header: 'وضعیت', value: (row) => STATUS[row.status] },
    ]),
  );
}
