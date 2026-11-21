// API عمومی ماژول approvals (docs/backend/03 ۵).
import { FieldReview } from './domain/review.entity.js';

export { ApprovalsModule } from './approvals.module.js';
export { PendingApprovals } from './application/pending-approvals.js';
export { ReportScopeReads } from './application/report-scope.js';
export { type ApproverWindow, ApproverWindows } from './application/approver-window.js';
export { RevisionRequests, type RevisionRequestView } from './application/revision-requests.js';
export { type ReviewQueueStats, ReviewStats } from './application/review-stats.js';

export const APPROVALS_ENTITIES = [FieldReview];
export const APPROVALS_TENANT_ENTITIES = [FieldReview];
