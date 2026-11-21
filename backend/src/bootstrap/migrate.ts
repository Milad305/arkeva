import { MikroORM } from '@mikro-orm/postgresql';
import type { AppConfig } from '../config/config.js';
import { DATABASE } from '../database/registry.js';
import { mikroOrmOptions } from '../platform/database/database.module.js';

/** اجرای migrationها با نقش مالک (docs/backend/05 ۶، 10 ۸). نقش اپ هرگز schema را عوض نمی‌کند. */
export async function runMigrations(config: AppConfig, url = config.db.migrationUrl): Promise<string[]> {
  if (!url) throw new Error('DB_MIGRATION_URL تنظیم نشده است (نقش مالک پایگاه داده)');
  const orm = await MikroORM.init(mikroOrmOptions(config, DATABASE, url));
  try {
    const applied = await orm.migrator.up();
    return applied.map((migration) => migration.name);
  } finally {
    await orm.close(true);
  }
}
