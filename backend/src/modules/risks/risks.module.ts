import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { ProjectRiskCounts } from '../projects/index.js';
import { RisksController } from './api/risks.controller.js';
import { RiskOwnerOnMemberRemoved } from './application/member-removed.consumer.js';
import { RiskAccess } from './application/risk-access.js';
import { RiskCommands } from './application/risk-commands.js';
import { RiskInputs } from './application/risk-input.js';
import { RiskIntake } from './application/risk-intake.js';
import { RiskMerge } from './application/risk-merge.js';
import { RiskReads } from './application/risk-reads.js';
import { RiskStore } from './application/risk-store.js';
import { RiskViews } from './application/risk-views.js';
import { RiskWork } from './application/risk-work.js';

// F14 — ریسک (risk.md): Risk و زیرموجودیت‌ها و ContingencyAllocation (`03` ۲). سراسری چون مشکل کارگاه (F08، برش ۱۳ب)،
// قواعد هشدار ریسک (F12) و شمار ریسک باز سربرگ پروژه از این ماژول می‌خوانند یا آن را صدا می‌زنند.
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [RisksController],
  providers: [
    RiskAccess,
    RiskStore,
    RiskInputs,
    RiskViews,
    RiskCommands,
    RiskWork,
    RiskMerge,
    RiskIntake,
    RiskReads,
    RiskOwnerOnMemberRemoved,
    { provide: ProjectRiskCounts, useExisting: RiskReads },
  ],
  exports: [RiskCommands, RiskViews, RiskIntake, RiskReads, RiskOwnerOnMemberRemoved, ProjectRiskCounts],
})
export class RisksModule {}
