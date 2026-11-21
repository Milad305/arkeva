import { Injectable } from '@nestjs/common';
import { cbsLeafBudget, quantityScaled } from '../../computation/index.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { COST_TYPES, type CostType, type DraftState, type PricingModeCode } from '../../planning/index.js';
import { IMPORT_MAX_BYTES, parseCsv, toEn, type UploadedCsv, WbsDraftService } from '../../wbs/index.js';
import type { CbsOp } from '../domain/cbs-ops.js';
import { faNum, locateCbs, toCbsForest, walkCbs } from '../domain/cbs-tree.js';
import { CbsDraftService, isLive } from './cbs-draft.service.js';
import { NEEDS_REVISE_BUDGET } from '../domain/cbs-ops.js';

// ورود اقلام CBS از فایل به نسخهٔ کاری (cbs.md ۱۰؛ تصمیم 1405/08/15): پیش‌نمایش ردیف‌ها با بودجهٔ ساختهٔ سرور، سپس
// تأیید همه یا هیچ با همان فایل. فقط CSV UTF-8 (همان تصمیم W39، 1405/08/23). ستون بودجهٔ فایل نادیده گرفته می‌شود.

export interface CbsImportInput {
  readonly file: UploadedCsv | undefined;
  readonly mode: 'replace' | 'append';
  readonly parentId: string | null;
  readonly draftRevision: number;
}

/** برچسب‌های تأییدشدهٔ نوع هزینه (cbs.md ۴.۲؛ تصمیم کاربر 1405/08/23) و خود کدها. */
export const COST_TYPE_LABELS: Record<CostType, string> = {
  materials: 'مصالح',
  labor: 'نیروی انسانی',
  equipment: 'ماشین‌آلات',
  transport: 'حمل',
  subcontract: 'پیمانکار جزء',
  overhead: 'بالاسری و تجهیز کارگاه',
  other: 'سایر',
};
const COST_TYPE_BY_TEXT = new Map<string, CostType>([
  ...COST_TYPES.map((code) => [code, code] as [string, CostType]),
  ...Object.entries(COST_TYPE_LABELS).map(([code, label]) => [label, code as CostType] as [string, CostType]),
  ['بالاسری', 'overhead'],
  ['تجهیز کارگاه', 'overhead'],
]);

interface ImportRow {
  readonly row: number;
  readonly code: string;
  readonly title: string;
  readonly costType: CostType | null;
  readonly pricing: PricingModeCode | null;
  readonly unit: string | null;
  readonly qty: number | null;
  readonly rate: string | null;
  readonly lump: string | null;
  readonly supplier: string | null;
  readonly budget: string | null;
  readonly isGroup: boolean;
  readonly errors: string[];
}

const digitsOnly = (value: string): string | null => toEn(value).replace(/[^\d]/g, '') || null;

@Injectable()
export class CbsImport {
  constructor(
    private readonly wbs: WbsDraftService,
    private readonly drafts: CbsDraftService,
  ) {}

  /** `POST /projects/:pid/plan-draft/cbs/import/preview` */
  async preview(projectId: string, input: CbsImportInput) {
    const { rows, file } = await this.parse(projectId, input);
    return {
      fileName: file.originalname,
      mode: input.mode,
      parentId: input.parentId,
      rows,
      errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0),
      itemCount: rows.length,
      budgetTotal: rows.reduce((sum, row) => sum + BigInt(row.budget ?? '0'), 0n).toString(),
    };
  }

  /** `POST /projects/:pid/plan-draft/cbs/import/confirm` — همه یا هیچ. */
  async confirm(projectId: string, input: CbsImportInput) {
    const { rows, state } = await this.parse(projectId, input);
    const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
    if (errorCount > 0) {
      throw new DomainError('CBS_IMPORT_INVALID', 422, {
        reason: `فایل ${faNum(errorCount)} خطا دارد؛ هیچ ردیفی وارد نشد. خطاها را در فایل رفع کنید و دوباره بارگذاری کنید.`,
      });
    }
    const idMap = await this.drafts.commit(state, opsOf(rows, state, input), input.draftRevision, (error) => {
      throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: error.message });
    });
    return { ...(await this.drafts.tree(projectId)), idMap };
  }

  private async parse(projectId: string, input: CbsImportInput): Promise<{ rows: ImportRow[]; file: UploadedCsv; state: DraftState }> {
    const state = await this.wbs.editable(projectId);
    if (input.mode === 'replace' && state.project.status !== 'draft') {
      throw new ConflictError('CBS_IMPORT_NOT_ALLOWED', {
        reason: 'جایگزینی کامل CBS فقط در پروژهٔ پیش‌نویس است. در پروژهٔ فعال ردیف‌ها زیر یک گروه افزوده می‌شوند.',
      });
    }
    if (isLive(state) && !this.drafts.canReviseBudget(projectId)) throw new ConflictError('CBS_IMPORT_NOT_ALLOWED', { reason: NEEDS_REVISE_BUDGET });
    const file = input.file;
    if (!file) throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'فایلی نرسید. فایل CSV را دوباره انتخاب کنید.' });
    if (file.size > IMPORT_MAX_BYTES) throw new DomainError('CBS_IMPORT_INVALID', 413, { reason: 'حجم فایل بیش از ۲۰ مگابایت است. فایل را کوچک‌تر کنید.' });
    if (/\.xlsx?$/i.test(file.originalname)) {
      throw new DomainError('CBS_IMPORT_INVALID', 422, {
        reason: 'فایل Excel مستقیم خوانده نمی‌شود. «دانلود قالب» را بزنید، در Excel پر کنید و با قالب «CSV UTF-8» ذخیره کنید.',
      });
    }
    this.wbs.checkRevision(state, input.draftRevision);
    if (input.mode === 'append' && input.parentId && !locateCbs(toCbsForest(state.cbs), input.parentId)) throw new NotFoundError('CBS_ITEM_NOT_FOUND');
    return { rows: parseRows(file.buffer.toString('utf8'), state, input.mode), file, state };
  }
}

function parseRows(text: string, state: DraftState, mode: 'replace' | 'append'): ImportRow[] {
  const table = parseCsv(text);
  if (table.length < 2) throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'فایل ردیفی ندارد. قالب را دانلود کنید و دست‌کم یک ردیف بنویسید.' });
  const header = (table[0] as string[]).map((cell) => cell.trim());
  const col = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.startsWith(name)));
  const columns = {
    code: col('کد'),
    title: col('عنوان'),
    costType: col('نوع هزینه'),
    pricing: col('شیوهٔ قیمت', 'شیوه قیمت'),
    unit: col('واحد'),
    qty: col('مقدار برآورد'),
    rate: col('نرخ واحد'),
    lump: col('مبلغ مقطوع'),
    supplier: col('تأمین‌کننده', 'توضیح'),
  };
  if (columns.code < 0 || columns.title < 0)
    throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'ستون «کد» یا «عنوان» در سرستون فایل نیست. از «دانلود قالب» استفاده کنید.' });

  const existing = new Set<string>();
  if (mode === 'append') walkCbs(toCbsForest(state.cbs), (node) => existing.add(node.code));
  const records = table.slice(1).map((cells, index) => {
    const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
    return {
      row: index + 2,
      code: toEn(get(columns.code)),
      title: get(columns.title),
      costType: get(columns.costType),
      pricing: get(columns.pricing),
      unit: get(columns.unit),
      qty: toEn(get(columns.qty))
        .replace(/[,٬\s]/g, '')
        .replace('٫', '.'),
      rate: get(columns.rate),
      lump: get(columns.lump),
      supplier: get(columns.supplier),
    };
  });
  const codes = records.map((record) => record.code);
  const isGroup = (code: string) => codes.some((other) => other !== code && other.startsWith(`${code}.`));

  return records.map((record) => {
    const errors: string[] = [];
    if (!record.code) errors.push('کد خالی است.');
    else if (codes.filter((code) => code === record.code).length > 1) errors.push('کد در فایل تکراری است.');
    else if (existing.has(record.code)) errors.push('این کد در CBS نسخهٔ کاری هست.');
    if (!record.title) errors.push('عنوان خالی است.');
    const costType = COST_TYPE_BY_TEXT.get(record.costType) ?? null;
    if (!costType) errors.push(`نوع هزینهٔ «${record.costType || '—'}» شناخته نشد؛ یکی از ${Object.values(COST_TYPE_LABELS).join('، ')} را بنویسید.`);
    const group = record.code ? isGroup(record.code) : false;
    let pricing: PricingModeCode | null = null;
    let qty: number | null = null;
    let rate: string | null = null;
    let lump: string | null = null;
    let budget: string | null = null;
    if (!group) {
      pricing = /مقطوع|lump/i.test(record.pricing) ? 'lump_sum' : /نرخ|unit/i.test(record.pricing) ? 'unit_rate' : null;
      if (!pricing) errors.push('شیوهٔ قیمت باید «نرخ واحد» یا «مقطوع» باشد.');
      if (pricing === 'unit_rate') {
        const scaled = record.qty ? quantityScaled(record.qty) : null;
        rate = digitsOnly(record.rate);
        if (!record.unit) errors.push('واحد خالی است.');
        if (scaled === null || scaled <= 0n) errors.push('مقدار برآورد باید عددی بزرگ‌تر از صفر با حداکثر چهار رقم اعشار باشد.');
        else qty = Number(record.qty);
        if (!rate || BigInt(rate) <= 0n) errors.push('نرخ واحد (ریال) لازم است.');
        if (errors.length === 0)
          budget = cbsLeafBudget({ pricingMode: 'unit_rate', estimatedQuantity: record.qty, unitRate: rate, lumpSumAmount: null }).toString();
      } else if (pricing === 'lump_sum') {
        lump = digitsOnly(record.lump);
        if (!lump || BigInt(lump) <= 0n) errors.push('مبلغ مقطوع (ریال) لازم است.');
        else budget = lump;
      }
    }
    return {
      row: record.row,
      code: record.code,
      title: record.title,
      costType,
      pricing,
      unit: pricing === 'unit_rate' ? record.unit || null : null,
      qty: pricing === 'unit_rate' ? qty : null,
      rate: pricing === 'unit_rate' ? rate : null,
      lump,
      supplier: record.supplier || null,
      budget,
      isGroup: group,
      errors,
    };
  });
}

/** والد هر ردیف بلندترین کد پیشوند در فایل است، یا گروه مقصد؛ والد پیش از فرزند و ترتیب خواهرها همان فایل. */
function opsOf(rows: readonly ImportRow[], state: DraftState, input: CbsImportInput): CbsOp[] {
  const codes = rows.map((row) => row.code);
  const parentCodeOf = (code: string) => codes.filter((other) => other !== code && code.startsWith(`${other}.`)).sort((a, b) => b.length - a.length)[0] ?? null;
  const depthOf = (code: string): number => {
    const parent = parentCodeOf(code);
    return parent ? 1 + depthOf(parent) : 0;
  };
  const tempOf = new Map(rows.map((row) => [row.code, `import:${newId()}`]));
  const ops: CbsOp[] = input.mode === 'replace' ? toCbsForest(state.cbs).map((node) => ({ type: 'remove', id: node.id })) : [];
  const ordered = rows.map((row, index) => ({ row, index, depth: depthOf(row.code) })).sort((a, b) => a.depth - b.depth || a.index - b.index);
  for (const { row } of ordered) {
    const parentCode = parentCodeOf(row.code);
    ops.push({
      type: 'add',
      tempId: tempOf.get(row.code) as string,
      parentId: parentCode ? (tempOf.get(parentCode) as string) : input.mode === 'append' ? input.parentId : null,
      item: {
        title: row.title,
        code: row.code,
        costType: row.costType ?? 'other',
        supplier: row.supplier,
        ...(row.isGroup || !row.pricing ? {} : { pricing: row.pricing, unit: row.unit, qty: row.qty, rate: row.rate, lump: row.lump }),
      },
    });
  }
  return ops;
}
