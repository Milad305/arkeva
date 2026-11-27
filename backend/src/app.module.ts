import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppConfig } from './config/config.js';
import { DATABASE } from './database/registry.js';
import { ApprovalsModule } from './modules/approvals/index.js';
import { CbsModule } from './modules/cbs/index.js';
import { ComputationModule } from './modules/computation/module.js';
import { FieldAppModule } from './modules/field-app/index.js';
import { AlertsModule } from './modules/alerts/module.js';
import { RisksModule } from './modules/risks/index.js';
import { TemplatesModule } from './modules/templates/index.js';
import { MspModule } from './modules/msp/index.js';
import { ReportsModule } from './modules/reports/index.js';
import { BackupsModule } from './modules/backups/index.js';
import { IntegrationsModule } from './modules/integrations/index.js';
import { ChartsModule } from './modules/charts/index.js';
import { SearchModule } from './modules/search/index.js';
import { StorageModule } from './platform/storage/storage.module.js';
import { CostLedgerModule } from './modules/cost-ledger/index.js';
import { FieldModule } from './modules/field/index.js';
import { IdentityModule } from './modules/identity/index.js';
import { NotificationsModule } from './modules/notifications/index.js';
import { PlanningModule } from './modules/planning/index.js';
import { WbsModule } from './modules/wbs/index.js';
import { ProjectsModule } from './modules/projects/index.js';
import { TeamModule } from './modules/team/index.js';
import { AppContext } from './platform/context/app-context.js';
import { ContextModule } from './platform/context/context.module.js';
import { DatabaseModule } from './platform/database/database.module.js';
import { HealthController } from './platform/health/health.controller.js';
import { EnvelopeInterceptor } from './platform/http/envelope.js';
import { AllExceptionsFilter } from './platform/http/exception.filter.js';
import { buildLoggerOptions } from './platform/http/logger.options.js';
import { createValidationPipe } from './platform/http/validation.js';
import { PlatformEventsModule } from './platform/events.module.js';
import { MessagingModule } from './platform/messaging/messaging.module.js';
import { SecurityModule } from './platform/security/security.module.js';

@Global()
@Module({})
class ConfigModule {
  static with(config: AppConfig): DynamicModule {
    return { module: ConfigModule, providers: [{ provide: AppConfig, useValue: config }], exports: [AppConfig] };
  }
}

@Module({})
export class AppModule {
  /** پیکربندی از بیرون می‌آید تا تست نسخهٔ خودش را بدهد. */
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.with(config),
        ContextModule,
        LoggerModule.forRootAsync({
          inject: [AppConfig, AppContext],
          useFactory: buildLoggerOptions,
        }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 600 }]),
        DatabaseModule.forRoot(DATABASE),
        PlatformEventsModule,
        SecurityModule,
        MessagingModule,
        StorageModule,
        IdentityModule,
        TeamModule,
        ProjectsModule,
        NotificationsModule,
        PlanningModule,
        WbsModule,
        CostLedgerModule,
        CbsModule,
        FieldModule,
        ApprovalsModule,
        ComputationModule,
        FieldAppModule,
        AlertsModule,
        RisksModule,
        TemplatesModule,
        MspModule,
        ReportsModule,
        BackupsModule,
        IntegrationsModule,
        ChartsModule,
        SearchModule,
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
        { provide: APP_PIPE, useFactory: createValidationPipe },
      ],
    };
  }
}
