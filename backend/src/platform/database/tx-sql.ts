import type { EntityManager } from '@mikro-orm/postgresql';
import { CompiledQuery, type ControlledTransaction } from 'kysely';

/**
 * SQL پارامتری (`$1`، `$2`، …) روی **همان اتصال تراکنش جاری** MikroORM. دو کاربرد:
 *   - pg-boss کار را در همان تراکنش تغییر اصلی می‌فرستد (`send(…, { db })`؛ AC-PL-01).
 *   - درج‌های سطح پایین زیرساخت (`consumed_event`) که شمار ردیف درج‌شده را لازم دارند.
 * `em.getConnection().execute` پارامترها را درون متن می‌گذارد و `$n` و عملگرهای `?` jsonb را
 * نمی‌فهمد؛ پس مستقیم از تراکنش Kysely زیر MikroORM اجرا می‌شود. متغیر RLS (`app.org_id`) را
 * MikroORM هنگام begin روی همین تراکنش گذاشته است.
 */
export interface TxSql {
  executeSql(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
}

export function txSql(tx: EntityManager): TxSql {
  const ctx = tx.getTransactionContext<ControlledTransaction<unknown>>();
  if (!ctx) throw new Error('txSql فقط درون em.transactional معنا دارد');
  return {
    async executeSql(text, values = []) {
      const result = await ctx.executeQuery(CompiledQuery.raw(text, values));
      const affected = result.numAffectedRows;
      return { rows: [...result.rows], rowCount: affected === undefined ? result.rows.length : Number(affected) };
    },
  };
}
