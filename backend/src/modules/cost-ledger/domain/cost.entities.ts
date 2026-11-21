import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase } from '../../../platform/database/base-properties.js';

// CostEntry (واقعیت؛ D02) و CostImportBatch (عملیاتی) — `02` ۵؛ cost-ledger.md ۴. مالک: cost-ledger (F06).

export const COST_SOURCES = ['manual', 'excel', 'subcontractor_statement', 'integration'] as const;
export type CostSource = (typeof COST_SOURCES)[number];

export interface ImportRow {
  readonly row: number;
  readonly cbsCode: string;
  readonly cbsItemId: string | null;
  readonly costDate: string | null;
  readonly amount: string | null;
  readonly quantity: string | null;
  readonly documentNo: string | null;
  readonly counterparty: string | null;
  readonly description: string | null;
  readonly externalRef: string;
  readonly source: CostSource;
  readonly status: 'ok' | 'error' | 'duplicate';
  readonly errors: string[];
}

const CostEntrySchema = defineEntity({
  name: 'CostEntry',
  tableName: 'cost_entry',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    cbsItemId: p.uuid(),
    /** فقط ذخیره می‌شود؛ در هیچ محاسبه‌ای نیست (OD-01). */
    wbsItemId: p.uuid().nullable(),
    costDate: p.date(),
    /** ریال علامت‌دار؛ منفی فقط در ردیف برگشتی. */
    amount: p.bigint('string'),
    quantity: p.decimal('string').nullable(),
    source: p.enum(COST_SOURCES),
    externalRef: p.string().nullable(),
    documentNo: p.string().nullable(),
    description: p.text().nullable(),
    counterparty: p.string().nullable(),
    attachmentKeys: p.json<string[]>(),
    status: p.enum(['draft', 'posted'] as const),
    reversesEntryId: p.uuid().nullable(),
    reversalReason: p.text().nullable(),
    importBatchId: p.uuid().nullable(),
    periodShifted: p.boolean().default(false),
    postedByUserId: p.uuid().nullable(),
    postedAt: p.datetime().nullable(),
    createdByUserId: p.uuid(),
  },
});

export class CostEntry extends CostEntrySchema.class {}
CostEntrySchema.setClass(CostEntry);

const CostImportBatchSchema = defineEntity({
  name: 'CostImportBatch',
  tableName: 'cost_import_batch',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    fileName: p.string(),
    status: p.enum(['previewed', 'imported', 'posted', 'cancelled'] as const),
    rowCount: p.integer().default(0),
    errorCount: p.integer().default(0),
    skippedDuplicateCount: p.integer().default(0),
    totalAmount: p.bigint('string').default('0'),
    rows: p.json<ImportRow[]>(),
    createdByUserId: p.uuid(),
  },
});

export class CostImportBatch extends CostImportBatchSchema.class {}
CostImportBatchSchema.setClass(CostImportBatch);
