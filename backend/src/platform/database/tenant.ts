import type { EntityManager } from '@mikro-orm/postgresql';

// چندمستأجری (D12؛ docs/backend/05 ۴). دو لایهٔ مستقل:
//   ۱. فیلتر ORM «tenant» که شرط org_id را به هر پرس‌وجوی Entity می‌افزاید.
//   ۲. متغیر نشست `app.org_id` که سیاست‌های RLS پستگرس می‌خوانند. MikroORM هر پرس‌وجوی بیرون از
//      تراکنش را در تراکنش کوتاهی با set_config(…, true) می‌پیچد و درون تراکنش هنگام begin تنظیم
//      می‌کند (sessionContext: 'transaction')؛ پس SQL خام هم بی‌این متغیر هیچ ردیفی نمی‌بیند.

export const TENANT_FILTER = 'tenant';
export const RLS_ORG_SETTING = 'app.org_id';

export interface TenantFilterArgs {
  readonly orgId: string;
}

/** تعریف فیلتر؛ فهرست Entityها را ریشهٔ ترکیب (app.module) از ماژول‌ها جمع می‌کند. */
export function tenantFilter(entities: readonly (abstract new (...args: never[]) => object)[]) {
  return {
    name: TENANT_FILTER,
    cond: (args: TenantFilterArgs) => ({ orgId: args.orgId }),
    entity: [...entities],
    default: true,
    args: true,
    strict: true,
  };
}

/** زمینهٔ سازمان را روی EntityManager این درخواست یا کار می‌گذارد — پیش از هر تراکنش. */
export function applyTenant(em: EntityManager, orgId: string): void {
  em.setFilterParams(TENANT_FILTER, { orgId } satisfies TenantFilterArgs);
  em.setSessionContext({ variables: { [RLS_ORG_SETTING]: orgId } });
}

/** خواندن گزارشی در تراکنش فقط‌خواندنی تا متغیر RLS روی اتصال Kysely هم اعمال شود (05 ۸). */
export function readTransaction<T>(em: EntityManager, work: (tx: EntityManager) => Promise<T>): Promise<T> {
  return em.transactional((tx) => work(tx), { readOnly: true });
}
