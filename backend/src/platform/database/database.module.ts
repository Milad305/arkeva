import { type DynamicModule, Module } from '@nestjs/common';
import { Migrator } from '@mikro-orm/migrations';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig, type Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppConfig } from '../../config/config.js';
import { RlsRoleCheck } from './rls-role.check.js';
import { tenantFilter } from './tenant.js';

// پیکربندی MikroORM (docs/backend/05 ۲). فهرست Entityها و migrationها را ریشهٔ ترکیب
// (app.module) از ماژول‌ها جمع می‌کند تا platform به ماژول‌های دامنه وابسته نشود.

type EntityList = NonNullable<Options['entities']>;
type TenantEntity = abstract new (...args: never[]) => object;
type MigrationList = NonNullable<NonNullable<Options['migrations']>['migrationsList']>;

export interface DatabaseOptions {
  readonly entities: EntityList;
  readonly tenantEntities: readonly TenantEntity[];
  readonly migrations: MigrationList;
}

export function mikroOrmOptions(config: AppConfig, options: DatabaseOptions, clientUrl = config.db.url): Options {
  return defineConfig({
    clientUrl,
    entities: options.entities,
    forceUtcTimezone: true, // C03
    allowGlobalContext: false, // الزام کاربر: Identity Map هرگز بین درخواست‌ها مشترک نیست
    filters: { tenant: tenantFilter(options.tenantEntities) },
    pool: { max: config.db.poolMax },
    driverOptions: { statement_timeout: config.db.statementTimeoutMs, application_name: 'projeyar' },
    debug: config.db.debug,
    extensions: [Migrator],
    migrations: {
      migrationsList: options.migrations,
      transactional: true,
      allOrNothing: true,
      tableName: 'mikro_orm_migrations',
    },
  });
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MikroOrmModule.forRootAsync({
          driver: PostgreSqlDriver,
          inject: [AppConfig],
          useFactory: (config: AppConfig) => mikroOrmOptions(config, options),
        }),
      ],
      providers: [RlsRoleCheck],
    };
  }
}
