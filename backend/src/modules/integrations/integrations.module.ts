import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ProjectIntegrationCards } from '../projects/index.js';
import { IntegrationsController } from './api/integrations.controller.js';
import { IntegrationCards } from './application/integration-cards.js';
import { P6Export } from './application/p6-export.js';

// F19 — یکپارچه‌سازی‌های دیگر، مرز نسخهٔ اول (integrations.md ۹؛ برش ۱۹). سراسری چون تنظیمات پروژه کارت‌ها را از درگاه
// ProjectIntegrationCards می‌خواند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [IntegrationsController],
  providers: [IntegrationCards, P6Export, { provide: ProjectIntegrationCards, useExisting: IntegrationCards }],
  exports: [ProjectIntegrationCards],
})
export class IntegrationsModule {}
