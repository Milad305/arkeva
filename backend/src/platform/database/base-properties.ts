import { p } from '@mikro-orm/postgresql';
import { newId } from './ids.js';

// ستون‌های پایه (docs/backend/05 ۳.۱). هر بار builder تازه تا Entityها هیچ وضعیتی را شریک نشوند.
// استراتژی نام‌گذاری پیش‌فرض camelCase را snake_case می‌کند (orgId ← org_id).

/** شناسهٔ UUID v7 ساخته‌شده در اپلیکیشن (C01). */
export function idColumn() {
  return p
    .uuid()
    .primary()
    .onCreate(() => newId());
}

/** لحظهٔ ساخت ردیف؛ برای جدول‌های بیرون از tenantBase (سازمان، نقش سیستمی). */
export function createdAtColumn() {
  return p.datetime().onCreate(() => new Date());
}

/** لحظهٔ آخرین تغییر ردیف. */
export function updatedAtColumn() {
  return p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date());
}

/** واقعیت تغییرناپذیر یا عملیاتی مستأجر: بدون updatedAt و version. */
export function tenantBase() {
  return {
    id: idColumn(),
    orgId: p.uuid(),
    createdAt: createdAtColumn(),
  };
}

/** زمان‌ها و نسخهٔ قفل خوش‌بینانه (05 ۹) — برای جدول‌هایی که کلید اصلی خودشان را دارند (projectId). */
export function versionedColumns() {
  return {
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    version: p.integer().version(),
  };
}

/** موجودیت قابل‌ویرایش مستأجر: قفل خوش‌بینانه با version (05 ۹). */
export function mutableBase() {
  return {
    ...tenantBase(),
    ...versionedColumns(),
  };
}
