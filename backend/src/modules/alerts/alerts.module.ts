import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ProjectAlertRules } from '../projects/index.js';
import { AlertsController } from './api/alerts.controller.js';
import { AlertEvaluator } from './application/alert-evaluator.js';
import { AlertFactsLoader } from './application/alert-facts.js';
import { AlertQueries } from './application/alert-queries.js';
import { AlertRulesConfig } from './application/alert-rules-config.js';
import { AlertReads } from './application/alert-reads.js';
import { AlertTexts } from './application/alert-texts.js';
import { DailyNotices, DailyNoticeTicks } from './application/daily-notices.js';
import { AlertFactsConsumer, AlertQueue, AlertTicks } from './application/alert-triggers.js';

// F12 — موتور هشدار (04-alert-engine). سراسری چون notifications متن هشدار و projects قواعد W30 را می‌خوانند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [AlertsController],
  providers: [
    AlertFactsLoader,
    AlertEvaluator,
    AlertQueue,
    AlertFactsConsumer,
    AlertTicks,
    AlertQueries,
    AlertRulesConfig,
    { provide: ProjectAlertRules, useExisting: AlertRulesConfig },
    AlertTexts,
    AlertReads,
    DailyNotices,
    DailyNoticeTicks,
  ],
  exports: [AlertTexts, AlertEvaluator, ProjectAlertRules, DailyNotices, AlertReads],
})
export class AlertsModule {}
