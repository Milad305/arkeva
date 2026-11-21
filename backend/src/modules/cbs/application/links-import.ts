import { Injectable } from '@nestjs/common';
import { linkSubBudget } from '../../computation/index.js';
import { DomainError } from '../../../platform/http/errors.js';
import type { CbsNode, DraftState, PlanNode } from '../../planning/index.js';
import { IMPORT_MAX_BYTES, parseCsv, toEn, type UploadedCsv, WbsDraftService } from '../../wbs/index.js';
import { faNum, MAX_LINKS_PER_LEAF } from '../domain/cbs-tree.js';
import { type LinkOp, linkValue } from '../domain/link-ops.js';
import { LinksService } from './links.service.js';

// ورود اتصال‌ها از فایل (cbs.md ۱۰): کد WBS، کد CBS، مقدار یا مبلغ. اتصال‌های هر برگِ آمده در فایل با ردیف‌های فایل
// جایگزین می‌شوند؛ همه یا هیچ. فقط CSV UTF-8 (تصمیم 1405/08/23).

export interface LinkImportInput {
  readonly file: UploadedCsv | undefined;
  readonly draftRevision: number;
}

interface LinkImportRow {
  readonly row: number;
  readonly wbsCode: string;
  readonly cbsCode: string;
  readonly wbsTitle: string | null;
  readonly cbsTitle: string | null;
  readonly quantity: number | null;
  readonly amount: string | null;
  readonly subBudget: string | null;
  readonly errors: string[];
}

@Injectable()
export class LinksImport {
  constructor(
    private readonly wbs: WbsDraftService,
    private readonly links: LinksService,
  ) {}

  /** `POST /projects/:pid/plan-draft/links/import/preview` */
  async preview(projectId: string, input: LinkImportInput) {
    const { rows, file, leafIds } = await this.parse(projectId, input);
    return {
      fileName: file.originalname,
      rows,
      errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0),
      leafCount: leafIds.size,
      budgetTotal: rows.reduce((sum, row) => sum + BigInt(row.subBudget ?? '0'), 0n).toString(),
    };
  }

  /** `POST /projects/:pid/plan-draft/links/import/confirm` */
  async confirm(projectId: string, input: LinkImportInput) {
    const { rows, state, ops } = await this.parse(projectId, input);
    const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
    if (errorCount > 0) {
      throw new DomainError('CBS_IMPORT_INVALID', 422, {
        reason: `فایل ${faNum(errorCount)} خطا دارد؛ هیچ اتصالی وارد نشد. خطاها را در فایل رفع کنید و دوباره بارگذاری کنید.`,
      });
    }
    await this.links.commit(state, ops, input.draftRevision, (error) => {
      throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: error.message });
    });
    return this.links.draft(projectId);
  }

  private async parse(projectId: string, input: LinkImportInput) {
    const state = await this.wbs.editable(projectId);
    const file = input.file;
    if (!file) throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'فایلی نرسید. فایل CSV را دوباره انتخاب کنید.' });
    if (file.size > IMPORT_MAX_BYTES) throw new DomainError('CBS_IMPORT_INVALID', 413, { reason: 'حجم فایل بیش از ۲۰ مگابایت است. فایل را کوچک‌تر کنید.' });
    if (/\.xlsx?$/i.test(file.originalname)) {
      throw new DomainError('CBS_IMPORT_INVALID', 422, {
        reason: 'فایل Excel مستقیم خوانده نمی‌شود. «دانلود قالب» را بزنید، در Excel پر کنید و با قالب «CSV UTF-8» ذخیره کنید.',
      });
    }
    this.wbs.checkRevision(state, input.draftRevision);
    return { ...parseRows(file.buffer.toString('utf8'), state), file, state };
  }
}

function parseRows(text: string, state: DraftState): { rows: LinkImportRow[]; ops: LinkOp[]; leafIds: Set<string> } {
  const table = parseCsv(text);
  if (table.length < 2) throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'فایل ردیفی ندارد. قالب را دانلود کنید و دست‌کم یک ردیف بنویسید.' });
  const header = (table[0] as string[]).map((cell) => cell.trim());
  const col = (name: string) => header.findIndex((cell) => cell.startsWith(name));
  const columns = { wbs: col('کد WBS'), cbs: col('کد CBS'), qty: col('مقدار'), amount: col('مبلغ') };
  if (columns.wbs < 0 || columns.cbs < 0)
    throw new DomainError('CBS_IMPORT_INVALID', 422, { reason: 'ستون «کد WBS» یا «کد CBS» در سرستون فایل نیست. از «دانلود قالب» استفاده کنید.' });

  const wbsByCode = new Map<string, PlanNode>();
  for (const node of state.nodes) if (!wbsByCode.has(node.code)) wbsByCode.set(node.code, node);
  const cbsByCode = new Map<string, CbsNode>();
  for (const node of state.cbs) if (!cbsByCode.has(node.code)) cbsByCode.set(node.code, node);
  const seen = new Set<string>();
  const perLeaf = new Map<string, number>();
  const ops: LinkOp[] = [];
  const leafIds = new Set<string>();

  const rows = table.slice(1).map((cells, index): LinkImportRow => {
    const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
    const errors: string[] = [];
    const wbsCode = toEn(get(columns.wbs));
    const cbsCode = toEn(get(columns.cbs));
    const leaf = wbsByCode.get(wbsCode);
    const item = cbsByCode.get(cbsCode);
    if (!leaf) errors.push(`کد WBS «${wbsCode || '—'}» در نسخهٔ کاری نیست.`);
    else if (!leaf.isLeaf) errors.push('فعالیت برگ نیست؛ اتصال فقط روی برگ است.');
    else if (leaf.isMilestone) errors.push('نقطهٔ عطف اتصال نمی‌گیرد.');
    if (!item) errors.push(`کد CBS «${cbsCode || '—'}» در نسخهٔ کاری نیست.`);
    else if (!item.isLeaf) errors.push('قلم CBS برگ نیست.');
    const pair = `${wbsCode}|${cbsCode}`;
    if (seen.has(pair)) errors.push('این جفت در فایل تکراری است.');
    seen.add(pair);
    if (leaf) {
      perLeaf.set(wbsCode, (perLeaf.get(wbsCode) ?? 0) + 1);
      if ((perLeaf.get(wbsCode) ?? 0) > MAX_LINKS_PER_LEAF) errors.push(`بیش از ${faNum(MAX_LINKS_PER_LEAF)} اتصال برای این فعالیت.`);
    }
    const qtyText = toEn(get(columns.qty))
      .replace(/[,٬\s]/g, '')
      .replace('٫', '.');
    const amount = toEn(get(columns.amount)).replace(/[^\d]/g, '') || null;
    let subBudget: string | null = null;
    if (leaf && item && errors.length === 0) {
      try {
        const value = linkValue(item, qtyText || null, amount);
        subBudget = linkSubBudget(item, value).toString();
        leafIds.add(leaf.id);
        ops.push({ type: 'link', wbsItemId: leaf.id, cbsItemId: item.id, quantity: value.quantity, amount: value.allocatedAmount });
      } catch (cause) {
        errors.push(cause instanceof Error ? cause.message : 'مقدار یا مبلغ نامعتبر است.');
      }
    }
    return {
      row: index + 2,
      wbsCode,
      cbsCode,
      wbsTitle: leaf?.title ?? null,
      cbsTitle: item?.title ?? null,
      quantity: item?.pricingMode === 'unit_rate' && qtyText ? Number(qtyText) : null,
      amount: item?.pricingMode === 'lump_sum' ? amount : null,
      subBudget,
      errors,
    };
  });

  // جایگزینی کامل اتصال‌های هر برگ موجود در فایل: اول برداشتن، بعد افزودن
  const unlinks: LinkOp[] = state.links
    .filter((link) => leafIds.has(link.wbsItemId))
    .map((link) => ({ type: 'unlink', wbsItemId: link.wbsItemId, cbsItemId: link.cbsItemId }));
  return { rows, ops: [...unlinks, ...ops], leafIds };
}
