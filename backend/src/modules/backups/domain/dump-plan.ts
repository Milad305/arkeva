// طرح دامپ منطقی یک پروژه (F20 ۱۲) از کاتالوگ PostgreSQL، بی فهرست دستی جدول‌ها: ریشه `project`، هر جدول دارای `project_id`،
// و فرزندی که با کلید خارجی به یکی از این‌ها وصل است (مثل ردیف‌های نسخهٔ برنامه). جدول‌های عملیاتی بیرون‌اند. RLS سازمان را جدا
// نگه می‌دارد و شرط پروژه همان پروژه را؛ پس هر دامپ فقط یک orgId دارد.

export interface ColumnInfo {
  readonly table: string;
  readonly name: string;
  readonly type: string;
}

export interface ForeignKeyInfo {
  readonly child: string;
  readonly parent: string;
  readonly childColumns: readonly string[];
  readonly parentColumns: readonly string[];
}

export interface DumpTable {
  readonly name: string;
  readonly columns: readonly ColumnInfo[];
  /** شرط روی نام مستعار `t` با یک `?` = شناسهٔ پروژه. */
  readonly where: string;
}

/** صف رویداد، مصرف، اعلان کاربر، نشست بارگذاری و خود پشتیبان‌ها: داده نیستند `[پیش‌فرض فنی]`. */
export const OPERATIONAL_TABLES: ReadonlySet<string> = new Set([
  'domain_event',
  'consumed_event',
  'compute_run',
  'notification',
  'upload_session',
  'tick_run',
  'project_backup',
  'project_export',
  'integration_connection',
]);

/**
 * بی `cbs.view_amounts` (D11) این جدول‌ها کامل بیرون می‌مانند چون مبلغ در متن یا JSON دارند؛ از بقیه ستون‌های bigint (پول، C02)
 * برداشته می‌شوند.
 */
export const AMOUNT_TABLES: ReadonlySet<string> = new Set([
  'audit_log',
  'cost_entry',
  'cost_import_batch',
  'budget_revision_request',
  'contingency_allocation',
  'reporting_period',
  'period_snapshot',
  'alert',
  'msp_import_session',
]);

type Source =
  | { readonly kind: 'root' }
  | { readonly kind: 'project' }
  | { readonly kind: 'child'; readonly parent: string; readonly childColumns: readonly string[]; readonly parentColumns: readonly string[] };

const SAFE = /^[a-z_][a-z0-9_]*$/;
const quote = (name: string): string => {
  if (!SAFE.test(name)) throw new Error(`نام ناامن در طرح دامپ: ${name}`);
  return `"${name}"`;
};

function condition(plan: ReadonlyMap<string, Source>, table: string, alias: string, depth: number): string {
  const source = plan.get(table);
  if (!source) throw new Error(`جدول بیرون از طرح: ${table}`);
  if (source.kind === 'root') return `${alias}.id = ?`;
  if (source.kind === 'project') return `${alias}.project_id = ?`;
  const inner = `p${depth}`;
  const left = source.childColumns.map((column) => `${alias}.${quote(column)}`).join(', ');
  const right = source.parentColumns.map((column) => `${inner}.${quote(column)}`).join(', ');
  return `(${left}) in (select ${right} from ${quote(source.parent)} ${inner} where ${condition(plan, source.parent, inner, depth + 1)})`;
}

/** فرزندانی که هنوز در طرح نیستند و والدشان هست؛ تا وقتی چیزی اضافه شود. */
function addChildren(plan: Map<string, Source>, tables: ReadonlySet<string>, foreignKeys: readonly ForeignKeyInfo[]): void {
  const sorted = [...foreignKeys].sort((a, b) => `${a.child}|${a.parent}`.localeCompare(`${b.child}|${b.parent}`));
  for (let added = true; added;) {
    added = false;
    for (const key of sorted) {
      if (plan.has(key.child) || !tables.has(key.child) || key.child === key.parent || !plan.has(key.parent)) continue;
      plan.set(key.child, { kind: 'child', parent: key.parent, childColumns: key.childColumns, parentColumns: key.parentColumns });
      added = true;
    }
  }
}

export function planDump(columns: readonly ColumnInfo[], foreignKeys: readonly ForeignKeyInfo[]): DumpTable[] {
  const byTable = new Map<string, ColumnInfo[]>();
  for (const column of columns) {
    if (OPERATIONAL_TABLES.has(column.table)) continue;
    byTable.set(column.table, [...(byTable.get(column.table) ?? []), column]);
  }
  const tables = new Set(byTable.keys());
  const plan = new Map<string, Source>();
  if (tables.has('project')) plan.set('project', { kind: 'root' });
  for (const [table, list] of byTable) if (table !== 'project' && list.some((column) => column.name === 'project_id')) plan.set(table, { kind: 'project' });
  addChildren(plan, tables, foreignKeys);
  return [...plan.keys()].sort().map((name) => ({ name, columns: byTable.get(name) ?? [], where: condition(plan, name, 't', 0) }));
}

/** SELECT یک جدول به‌صورت JSON هر ردیف؛ بی مبلغ ← ستون‌های bigint بیرون. */
export function selectSql(table: DumpTable, amounts: boolean): string | null {
  if (!amounts && AMOUNT_TABLES.has(table.name)) return null;
  const columns = table.columns.filter((column) => amounts || column.type !== 'bigint');
  if (columns.length === 0) return null;
  const list = columns.map((column) => `t.${quote(column.name)}`).join(', ');
  return `select row_to_json(r)::text as j from (select ${list} from ${quote(table.name)} t where ${table.where} order by 1) r`;
}
