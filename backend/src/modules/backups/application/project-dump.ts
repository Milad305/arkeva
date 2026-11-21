import { Injectable } from '@nestjs/common';
import { EntityManager, IsolationLevel } from '@mikro-orm/postgresql';
import { type ColumnInfo, type DumpTable, type ForeignKeyInfo, planDump, selectSql } from '../domain/dump-plan.js';

// دامپ منطقی یک پروژه (F20 ۱۲) در یک تراکنش repeatable read تا همهٔ جدول‌ها یک لحظه را ببینند. طرح جدول‌ها یک بار در هر
// فرایند از کاتالوگ ساخته می‌شود (طرح پایگاه داده فقط با migration و راه‌اندازی دوباره عوض می‌شود).

export interface DumpedTable {
  readonly name: string;
  readonly rows: Record<string, unknown>[];
}

export interface FileRef {
  readonly table: string;
  readonly row: Record<string, unknown>;
  readonly storageKey: string;
  readonly size: number;
}

export interface ProjectSnapshot {
  readonly tables: DumpedTable[];
  /** هر ستون `*storage_key` یک فایل ذخیره‌سازی است (فهرست فایل‌ها؛ تصمیم 1405/08/26: خود فایل در نسخه نیست). */
  readonly files: FileRef[];
}

const COLUMNS_SQL = `
select c.table_name as "table", c.column_name as name, c.data_type as type
from information_schema.columns c
join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position`;

const FOREIGN_KEYS_SQL = `
select con.conrelid::regclass::text as child, con.confrelid::regclass::text as parent,
  array(select a.attname from unnest(con.conkey) with ordinality k(n, i) join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n order by k.i)::text[] as "childColumns",
  array(select a.attname from unnest(con.confkey) with ordinality k(n, i) join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n order by k.i)::text[] as "parentColumns"
from pg_constraint con join pg_namespace ns on ns.oid = con.connamespace
where con.contype = 'f' and ns.nspname = 'public'`;

const sizeOf = (row: Record<string, unknown>): number => Number(row['size'] ?? row['size_bytes'] ?? 0) || 0;

@Injectable()
export class ProjectDump {
  private plan: Promise<DumpTable[]> | null = null;

  constructor(private readonly em: EntityManager) {}

  private run<T>(tx: EntityManager, sql: string, params: unknown[] = []): Promise<T[]> {
    return tx.getConnection().execute<T[]>(sql, params, 'all', tx.getTransactionContext());
  }

  private tables(tx: EntityManager): Promise<DumpTable[]> {
    this.plan ??= (async () => {
      const [columns, keys] = await Promise.all([this.run<ColumnInfo>(tx, COLUMNS_SQL), this.run<ForeignKeyInfo>(tx, FOREIGN_KEYS_SQL)]);
      return planDump(columns, keys);
    })().catch((error: unknown) => {
      this.plan = null;
      throw error;
    });
    return this.plan;
  }

  /** همهٔ ردیف‌های پروژه؛ بی مبلغ ← جدول‌های مبلغ‌دار بیرون و ستون‌های bigint برداشته (D11). */
  snapshot(projectId: string, amounts: boolean): Promise<ProjectSnapshot> {
    return this.em.transactional(
      async (tx) => {
        const tables: DumpedTable[] = [];
        for (const table of await this.tables(tx)) {
          const sql = selectSql(table, amounts);
          if (!sql) continue;
          const rows = await this.run<{ j: string }>(tx, sql, [projectId]);
          tables.push({ name: table.name, rows: rows.map((row) => JSON.parse(row.j) as Record<string, unknown>) });
        }
        return { tables, files: fileRefs(tables) };
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }
}

function fileRefs(tables: readonly DumpedTable[]): FileRef[] {
  return tables.flatMap((table) =>
    table.rows.flatMap((row) =>
      Object.entries(row).flatMap(([column, value]) =>
        column.endsWith('storage_key') && typeof value === 'string' && value ? [{ table: table.name, row, storageKey: value, size: sizeOf(row) }] : [],
      ),
    ),
  );
}
