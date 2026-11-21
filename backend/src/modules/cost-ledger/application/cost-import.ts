import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { ProjectCostCutoff } from '../../projects/index.js';
import { parseCsv, parseDate, toEn, type UploadedCsv } from '../../wbs/index.js';
import { CostEntry, CostImportBatch, type CostSource, type ImportRow } from '../domain/cost.entities.js';
import { checkTarget, CostRuleError, externalRefOf, parseAmount, parseQuantity, projectAcceptsCosts } from '../domain/cost-rules.js';
import { CostEntries } from './cost-entries.js';

// ورود هزینه از فایل (cost-ledger.md ۶): پیش‌نمایش (دسته با ردیف‌های سالم، خطادار و تکراری) ← ورود ردیف‌های سالم به‌صورت
// پیش‌نویس ← قطعی کردن گروهی با یک رویداد (AC-CST-08). فقط CSV UTF-8، همان تصمیم ورود فایل W39 (1405/08/23). فایل نگه
// داشته نمی‌شود؛ ردیف‌های پیش‌نمایش در خود دسته‌اند. تکراری (همان منبع و externalRef) نادیده گرفته می‌شود (AC-CST-05).

export const COST_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 20_000;
const invalid = (reason: string) => new DomainError('COST_IMPORT_INVALID', 422, { reason });

const SOURCE_BY_TEXT = new Map<string, CostSource>([
  ['', 'excel'],
  ['خرید', 'excel'],
  ['excel', 'excel'],
  ['صورت‌وضعیت پیمانکار جزء', 'subcontractor_statement'],
  ['صورت وضعیت پیمانکار جزء', 'subcontractor_statement'],
  ['subcontractor_statement', 'subcontractor_statement'],
]);

@Injectable()
export class CostImport {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly entries: CostEntries,
    private readonly cutoff: ProjectCostCutoff,
  ) {}

  /** `POST /projects/:pid/cost-imports` — پیش‌نمایش؛ دستهٔ previewed. */
  async preview(projectId: string, file: UploadedCsv | undefined) {
    const actor = this.entries.require(projectId, 'cost.import');
    if (!file) throw invalid('فایلی نرسید. فایل CSV را دوباره انتخاب کنید.');
    if (file.size > COST_IMPORT_MAX_BYTES) throw invalid('حجم فایل بیش از ۱۰ مگابایت است.');
    if (/\.xlsx?$/i.test(file.originalname))
      throw invalid('فایل Excel مستقیم خوانده نمی‌شود. «دانلود قالب» را بزنید، در Excel پر کنید و با قالب «CSV UTF-8» ذخیره کنید.');
    const project = await this.cutoff.of(this.em, projectId);
    const blocked = projectAcceptsCosts(project.status);
    if (blocked) throw new ConflictError('COST_NOT_ALLOWED', { reason: blocked });
    const rows = await this.parse(projectId, file.buffer.toString('utf8'));
    const batch = await this.em.transactional((tx) =>
      Promise.resolve(
        tx.create(CostImportBatch, {
          id: newId(),
          orgId: project.orgId,
          projectId,
          fileName: file.originalname,
          status: 'previewed',
          rowCount: rows.length,
          errorCount: rows.filter((row) => row.status === 'error').length,
          skippedDuplicateCount: rows.filter((row) => row.status === 'duplicate').length,
          totalAmount: rows
            .filter((row) => row.status === 'ok')
            .reduce((sum, row) => sum + BigInt(row.amount ?? '0'), 0n)
            .toString(),
          rows,
          createdByUserId: actor,
        }),
      ),
    );
    return this.view(batch);
  }

  /** `POST /projects/:pid/cost-imports/:batchId/import` — ردیف‌های سالم ← پیش‌نویس. */
  async import(projectId: string, batchId: string) {
    const actor = this.entries.require(projectId, 'cost.import');
    return this.em.transactional(async (tx) => {
      const batch = await tx.findOne(CostImportBatch, { id: batchId, projectId });
      if (!batch) throw new NotFoundError('COST_IMPORT_NOT_FOUND');
      if (batch.status !== 'previewed') throw new ConflictError('COST_NOT_ALLOWED', { reason: 'این دسته پیش‌تر وارد شده است.' });
      const project = await this.cutoff.of(tx, projectId, true);
      // تکراری‌های تازه (ورود هم‌زمان) هم کنار می‌روند
      const existing = await this.existingRefs(tx, projectId);
      let created = 0;
      for (const row of batch.rows) {
        if (row.status !== 'ok' || existing.has(`${row.source}|${row.externalRef}`)) continue;
        tx.create(CostEntry, {
          id: newId(),
          orgId: project.orgId,
          projectId,
          cbsItemId: row.cbsItemId as string,
          wbsItemId: null,
          costDate: row.costDate as string,
          amount: row.amount as string,
          quantity: row.quantity,
          source: row.source,
          externalRef: row.externalRef,
          documentNo: row.documentNo,
          description: row.description,
          counterparty: row.counterparty,
          attachmentKeys: [],
          status: 'draft',
          reversesEntryId: null,
          reversalReason: null,
          importBatchId: batch.id,
          periodShifted: false,
          postedByUserId: null,
          postedAt: null,
          createdByUserId: actor,
        });
        existing.add(`${row.source}|${row.externalRef}`);
        created += 1;
      }
      batch.status = 'imported';
      await tx.flush();
      return { ...this.view(batch), imported: created };
    });
  }

  /** `POST /projects/:pid/cost-imports/:batchId/post` — همهٔ پیش‌نویس‌های دسته با یک رویداد (AC-CST-08). */
  async post(projectId: string, batchId: string) {
    const batch = await this.em.findOne(CostImportBatch, { id: batchId, projectId });
    if (!batch) throw new NotFoundError('COST_IMPORT_NOT_FOUND');
    if (batch.status !== 'imported') throw new ConflictError('COST_NOT_ALLOWED', { reason: 'فقط دستهٔ واردشده قطعی می‌شود.' });
    const result = await this.entries.post(projectId, { batchId });
    await this.em.transactional(async (tx) => {
      const locked = await tx.findOneOrFail(CostImportBatch, { id: batchId });
      locked.status = 'posted';
    });
    return { ...result, batchId };
  }

  private async parse(projectId: string, text: string): Promise<ImportRow[]> {
    const table = parseCsv(text);
    if (table.length < 2) throw invalid('فایل ردیفی ندارد. قالب را دانلود کنید و دست‌کم یک ردیف بنویسید.');
    if (table.length - 1 > MAX_ROWS) throw invalid('هر فایل حداکثر ۲۰٬۰۰۰ ردیف دارد؛ فایل را چند بخش کنید.');
    const header = (table[0] as string[]).map((cell) => cell.trim());
    const col = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.startsWith(name)));
    const columns = {
      code: col('کد قلم'),
      date: col('تاریخ تحقق'),
      amount: col('مبلغ'),
      quantity: col('مقدار'),
      document: col('شمارهٔ سند', 'شماره سند'),
      counterparty: col('طرف حساب'),
      description: col('شرح'),
      ref: col('شناسهٔ ردیف', 'شناسه ردیف'),
      source: col('منبع'),
    };
    if (columns.code < 0 || columns.date < 0 || columns.amount < 0)
      throw invalid('ستون «کد قلم CBS»، «تاریخ تحقق» یا «مبلغ» در سرستون فایل نیست. از «دانلود قالب» استفاده کنید.');
    const items = new Map([...(await this.entries.cbsItems(projectId)).values()].map((item) => [item.code, item]));
    const existing = await this.existingRefs(this.em, projectId);
    const seen = new Set<string>();
    const today = tehranClock(this.clock.now()).date;
    return table.slice(1).map((cells, index): ImportRow => {
      const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
      const errors: string[] = [];
      const cbsCode = toEn(get(columns.code));
      const item = items.get(cbsCode);
      const date = parseDate(get(columns.date));
      if (!date) errors.push('تاریخ تحقق خالی یا نامعتبر است.');
      else if (date > today) errors.push('تاریخ تحقق نمی‌تواند در آینده باشد.');
      let amount: string | null = null;
      let quantity: string | null = null;
      try {
        amount = parseAmount(get(columns.amount)).toString();
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'مبلغ نامعتبر است.');
      }
      try {
        quantity = parseQuantity(toEn(get(columns.quantity)).replace(/[,٬\s]/g, ''));
        checkTarget(item ? { ...item } : undefined, quantity);
      } catch (error) {
        errors.push(error instanceof CostRuleError ? error.message : 'مقدار نامعتبر است.');
      }
      const source = SOURCE_BY_TEXT.get(get(columns.source)) ?? null;
      if (!source) errors.push('منبع باید «خرید» یا «صورت‌وضعیت پیمانکار جزء» باشد.');
      const documentNo = get(columns.document) || null;
      const externalRef = get(columns.ref) || externalRefOf(cbsCode, date ?? '', amount ?? '', documentNo);
      const key = `${source ?? 'excel'}|${externalRef}`;
      const duplicate = errors.length === 0 && (existing.has(key) || seen.has(key));
      seen.add(key);
      return {
        row: index + 2,
        cbsCode,
        cbsItemId: item?.id ?? null,
        costDate: date ?? null,
        amount,
        quantity,
        documentNo,
        counterparty: get(columns.counterparty) || null,
        description: get(columns.description) || null,
        externalRef,
        source: source ?? 'excel',
        status: errors.length > 0 ? 'error' : duplicate ? 'duplicate' : 'ok',
        errors,
      };
    });
  }

  private async existingRefs(em: EntityManager, projectId: string): Promise<Set<string>> {
    const rows = await em.find(CostEntry, { projectId, externalRef: { $ne: null } }, { fields: ['source', 'externalRef'] });
    return new Set(rows.map((row) => `${row.source}|${row.externalRef}`));
  }

  private view(batch: CostImportBatch) {
    const byItem = new Map<string, bigint>();
    for (const row of batch.rows) if (row.status === 'ok') byItem.set(row.cbsCode, (byItem.get(row.cbsCode) ?? 0n) + BigInt(row.amount ?? '0'));
    return {
      batchId: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      rowCount: batch.rowCount,
      errorCount: batch.errorCount,
      skippedDuplicateCount: batch.skippedDuplicateCount,
      totalAmount: batch.totalAmount,
      totalsByItem: [...byItem].map(([cbsCode, amount]) => ({ cbsCode, amount: amount.toString() })),
      rows: batch.rows,
    };
  }
}
