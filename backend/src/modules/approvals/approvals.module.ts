import { ReportScopeReads } from './application/report-scope.js';
import { ApproverWindows } from './application/approver-window.js';
import { PendingApprovals } from './application/pending-approvals.js';
import { Global, Module } from '@nestjs/common';
import { RevisionRequests } from './application/revision-requests.js';
import { ReviewStats } from './application/review-stats.js';
import { IdentityModule } from '../identity/index.js';
import { ReportPipeline } from '../field/index.js';
import { ApprovalsController } from './api/approvals.controller.js';
import { ApprovalPipeline } from './application/approval-pipeline.js';
import { Decisions } from './application/decisions.js';
import { Escalation } from './application/escalation.js';
import { ItemViews } from './application/item-view.js';
import { PlanAppliedReports } from './application/plan-applied.consumer.js';
import { ReportViews } from './application/report-views.js';
import { ReviewAccess } from './application/review-access.js';
import { Workflow } from './application/workflow.js';

// F09 — گردش کار تأیید (docs/backend/01 ۴): همهٔ انتقال‌های وضعیت FieldReportItem و همهٔ Reviewها. سراسری چون
// ReportPipeline را به field می‌دهد (وارونگی وابستگی).
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [ApprovalsController],
  providers: [
    PendingApprovals,
    ReportScopeReads,
    ApproverWindows,
    RevisionRequests,
    ReviewStats,
    Workflow,
    ReviewAccess,
    ApprovalPipeline,
    { provide: ReportPipeline, useExisting: ApprovalPipeline },
    Decisions,
    ReportViews,
    ItemViews,
    Escalation,
    PlanAppliedReports,
  ],
  exports: [ReportPipeline, RevisionRequests, ReviewStats, PendingApprovals, ApproverWindows, ReportScopeReads],
})
export class ApprovalsModule {}
