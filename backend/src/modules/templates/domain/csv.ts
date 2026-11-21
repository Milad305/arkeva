import { parseCsv, toEn } from '../../wbs/index.js';
import { type CostType, type Issue, type Method, SETTINGS_DEFAULTS, type TemplateContent } from './content.js';

// ساخت قالب از فایل (templates.md ۵.۱ راه سوم؛ تصمیم 1405/08/19): دو برگهٔ CSV (WBS و CBS) با ستون‌های ورود WBS به‌علاوهٔ
// «شروع نسبی»، «مدت نسبی»، «اقلام CBS» و «ضریب تقسیم»؛ برگهٔ CBS با «سهم بودجه». ردیف خطادار وارد نمی‌شود.

const METHOD_BY_LABEL: Record<string, Method> = { مقداری: 'quantity', درصدی: 'percent', 'گام‌های وزنی': 'steps', 'پیشرفت زمانی': 'time_based' };
const COST_TYPE_BY_LABEL: Record<string, CostType> = {
  مصالح: 'materials',
  'نیروی انسانی': 'labor',
  تجهیزات: 'equipment',
  ماشین‌آلات: 'equipment',
  'پیمانکار جزء': 'subcontract',
  سربار: 'overhead',
  'بالاسری و تجهیز کارگاه': 'overhead',
  'حمل و نقل': 'transport',
  حمل: 'transport',
  سایر: 'other',
};
const EPSILON = 0.0001;

export interface ImportRow {
  row: number;
  code: string;
  title: string;
  depth: number;
  isParent: boolean;
  weight: number | null;
  startOffsetWd: number | null;
  durationWd: number | null;
  status: 'ok' | 'warning' | 'error';
  error: string | null;
}

export interface ParsedTemplate {
  wbsRows: ImportRow[];
  cbsRows: ImportRow[];
  issues: Issue[];
  content: TemplateContent;
  cbsShareSum: number;
}

export class TemplateFileError extends Error {}

const num = (value: string): number | null => {
  const text = toEn(value).replace('٫', '.').trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

function sheet(text: string, label: string): string[][] {
  const table = parseCsv(text);
  if (table.length < 2) throw new TemplateFileError(`برگهٔ ${label} ردیفی ندارد. قالب را دانلود کنید و دست‌کم یک ردیف بنویسید.`);
  return table;
}

const columnFinder = (header: readonly string[]) => (name: string) => header.findIndex((cell) => cell.trim().startsWith(name));

export function parseTemplateCsv(wbsText: string, cbsText: string | null, referenceDurationWd: number): ParsedTemplate {
  const issues: Issue[] = [];
  const wbsTable = sheet(wbsText, 'WBS');
  const col = columnFinder(wbsTable[0] as string[]);
  const columns = {
    code: col('کد'),
    title: col('عنوان'),
    weight: col('وزن'),
    unit: col('واحد'),
    method: col('روش'),
    milestone: col('نقطهٔ عطف'),
    start: col('شروع نسبی'),
    duration: col('مدت نسبی'),
    cbs: col('اقلام CBS'),
    parts: col('ضریب تقسیم'),
  };
  if (columns.code < 0 || columns.title < 0) throw new TemplateFileError('ستون «کد» یا «عنوان» در سرستون برگهٔ WBS نیست. از «دانلود قالب» استفاده کنید.');

  const seen = new Set<string>();
  const drafts = wbsTable.slice(1).map((cells, index) => {
    const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
    const code = toEn(get(columns.code));
    const title = get(columns.title);
    const methodLabel = get(columns.method);
    const cbsCodes = get(columns.cbs)
      .split(/[،,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const parts = get(columns.parts)
      .split(/[،,]/)
      .map(num)
      .filter((value): value is number => value !== null);
    const draft = {
      row: index + 2,
      code,
      title,
      weight: num(get(columns.weight)),
      unit: get(columns.unit) || null,
      method: METHOD_BY_LABEL[methodLabel] ?? null,
      milestone: /^(بله|آری|yes|1)$/i.test(get(columns.milestone)),
      start: num(get(columns.start)),
      duration: num(get(columns.duration)),
      links: cbsCodes.map((cbsCode, position) => [toEn(cbsCode), Math.max(1, Math.round(parts[position] ?? 1))] as const),
      status: 'ok' as ImportRow['status'],
      error: null as string | null,
    };
    if (!/^\d+(\.\d+)*$/.test(code)) Object.assign(draft, { status: 'error', error: 'کد باید مثل ۱.۲.۳ باشد.' });
    else if (title === '') Object.assign(draft, { status: 'error', error: 'عنوان خالی است.' });
    else if (seen.has(code)) Object.assign(draft, { status: 'error', error: 'این کد تکراری است.' });
    else if (methodLabel !== '' && !METHOD_BY_LABEL[methodLabel]) Object.assign(draft, { status: 'error', error: `روش «${methodLabel}» شناخته نشد.` });
    else if (draft.weight === null) Object.assign(draft, { status: 'warning', error: 'وزن خالی است؛ صفر گرفته می‌شود.' });
    seen.add(code);
    return draft;
  });
  const ok = drafts.filter((draft) => draft.status !== 'error');
  const hasChild = (code: string) => ok.some((draft) => draft.code.startsWith(`${code}.`));

  const cbsDrafts: {
    row: number;
    code: string;
    title: string;
    costType: CostType;
    unit: string | null;
    share: number | null;
    status: ImportRow['status'];
    error: string | null;
  }[] = [];
  if (cbsText) {
    const cbsTable = sheet(cbsText, 'CBS');
    const cbsCol = columnFinder(cbsTable[0] as string[]);
    const cbsColumns = { code: cbsCol('کد'), title: cbsCol('عنوان'), costType: cbsCol('نوع هزینه'), unit: cbsCol('واحد'), share: cbsCol('سهم بودجه') };
    if (cbsColumns.code < 0 || cbsColumns.title < 0)
      throw new TemplateFileError('ستون «کد» یا «عنوان» در سرستون برگهٔ CBS نیست. از «دانلود قالب» استفاده کنید.');
    cbsTable.slice(1).forEach((cells, index) => {
      const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
      const typeLabel = get(cbsColumns.costType);
      const entry = {
        row: index + 2,
        code: toEn(get(cbsColumns.code)),
        title: get(cbsColumns.title),
        costType: COST_TYPE_BY_LABEL[typeLabel] ?? 'materials',
        unit: get(cbsColumns.unit) || null,
        share: num(get(cbsColumns.share)),
        status: 'ok' as ImportRow['status'],
        error: null as string | null,
      };
      if (entry.code === '' || entry.title === '') Object.assign(entry, { status: 'error', error: 'کد یا عنوان خالی است.' });
      else if (typeLabel !== '' && !COST_TYPE_BY_LABEL[typeLabel]) Object.assign(entry, { status: 'error', error: `نوع هزینهٔ «${typeLabel}» شناخته نشد.` });
      cbsDrafts.push(entry);
    });
  } else {
    issues.push({ severity: 'warning', rule: 'NO_CBS', message: 'برگهٔ CBS نیامد؛ قالب بی‌قلم هزینه ساخته می‌شود و بودجه در پروژه نمی‌شکند.', at: null });
  }
  const cbsOk = cbsDrafts.filter((entry) => entry.status !== 'error');
  const cbsLeafCodes = new Set(cbsOk.filter((entry) => !cbsOk.some((other) => other.code.startsWith(`${entry.code}.`))).map((entry) => entry.code));
  const cbsShareSum = cbsOk.filter((entry) => cbsLeafCodes.has(entry.code)).reduce((value, entry) => value + (entry.share ?? 0), 0);

  const wbsKey = (code: string) => `w${code.replace(/\./g, '-')}`;
  const cbsKey = (code: string) => `c${code.replace(/\./g, '-')}`;
  const parentOf = (code: string) => (code.includes('.') ? code.split('.').slice(0, -1).join('.') : null);
  const wbsCodes = new Set(ok.map((draft) => draft.code));
  const cbsCodes = new Set(cbsOk.map((entry) => entry.code));
  const content: TemplateContent = {
    schemaVersion: 1,
    referenceDurationWd: Math.max(1, Math.round(referenceDurationWd)),
    wbs: ok.map((draft, index) => {
      const parent = parentOf(draft.code);
      return {
        key: wbsKey(draft.code),
        // ردیفی که والدش در فایل نیست خودش ریشه است
        parentKey: parent && wbsCodes.has(parent) ? wbsKey(parent) : null,
        code: draft.code,
        title: draft.title,
        sortOrder: index + 1,
        isMilestone: draft.milestone,
        weightInParent: draft.weight ?? 0,
        measurementMethod: hasChild(draft.code) || draft.milestone ? null : (draft.method ?? 'percent'),
        steps: [],
        unit: draft.unit,
        startOffsetWd: draft.start ?? 0,
        durationWd: draft.milestone ? 0 : (draft.duration ?? 1),
        areaKey: null,
      };
    }),
    cbs: cbsOk.map((entry) => {
      const parent = parentOf(entry.code);
      return {
        key: cbsKey(entry.code),
        parentKey: parent && cbsCodes.has(parent) ? cbsKey(parent) : null,
        code: entry.code,
        title: entry.title,
        costType: entry.costType,
        unit: entry.unit,
        pricingMode: 'lump_sum' as const,
        sharePct: cbsLeafCodes.has(entry.code) ? (entry.share ?? 0) : null,
      };
    }),
    links: ok.flatMap((draft) =>
      draft.links.flatMap(([code, parts]) => (cbsCodes.has(code) ? [{ wbsKey: wbsKey(draft.code), cbsKey: cbsKey(code), parts }] : [])),
    ),
    areas: [],
    settings: { ...SETTINGS_DEFAULTS },
  };

  const errorCount = drafts.filter((draft) => draft.status === 'error').length + cbsDrafts.filter((entry) => entry.status === 'error').length;
  if (errorCount > 0) {
    issues.push({
      severity: 'error',
      rule: 'ROWS',
      message: `${errorCount} ردیف خطا دارد و وارد نمی‌شود. خطاها را در فایل درست کنید و دوباره بارگذاری کنید.`,
      at: null,
    });
  }
  if (content.wbs.length === 0) issues.push({ severity: 'error', rule: 'EMPTY', message: 'هیچ ردیف سالمی برای ساخت قالب نماند.', at: null });
  if (content.cbs.length > 0 && Math.abs(cbsShareSum - 100) > EPSILON) {
    issues.push({
      severity: 'warning',
      rule: 'CBS_SHARE_SUM',
      message: `جمع سهم بودجهٔ برگ‌ها ${Math.round(cbsShareSum * 10_000) / 10_000} است؛ تا ۱۰۰ نشود قالب منتشر نمی‌شود.`,
      at: null,
    });
  }
  return {
    wbsRows: drafts.map((draft) => ({
      row: draft.row,
      code: draft.code,
      title: draft.title,
      depth: draft.code.split('.').length - 1,
      isParent: hasChild(draft.code),
      weight: draft.weight,
      startOffsetWd: draft.start,
      durationWd: draft.duration,
      status: draft.status,
      error: draft.error,
    })),
    cbsRows: cbsDrafts.map((entry) => ({
      row: entry.row,
      code: entry.code,
      title: entry.title,
      depth: entry.code.split('.').length - 1,
      isParent: !cbsLeafCodes.has(entry.code),
      weight: entry.share,
      startOffsetWd: null,
      durationWd: null,
      status: entry.status,
      error: entry.error,
    })),
    issues,
    content,
    cbsShareSum: Math.round(cbsShareSum * 10_000) / 10_000,
  };
}
