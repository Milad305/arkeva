// API عمومی ماژول field (docs/backend/03 ۵).
import { DeviceQueueState, FieldPhoto, FieldReport, FieldReportItem } from './domain/field.entities.js';
import { SiteIssue, SiteIssuePhoto } from './domain/site-issue.entities.js';

export { FieldModule } from './field.module.js';
export { type AppReportInput, FieldIntake } from './application/field-intake.js';
export type { RevisionPhotoInput } from './application/field-photos.js';
export { OpeningProgress } from './application/opening-progress.js';
export { DeviceHeartbeats, type HeartbeatInput } from './application/device-heartbeats.js';
export { entriesOf, FieldReads, leafForEntry } from './application/field-reads.js';
export { FieldRecords, type ItemPatch, type ItemRecord, type PhotoRecord, type ReportRecord } from './application/field-records.js';
export { type ReceivedBatch, ReportPipeline } from './application/report-pipeline.js';
export { valuesFor, type ValuesInput } from './domain/values.js';
export { SiteIssues, type SiteIssueInput } from './application/site-issues.js';
export { ISSUE_EFFECTS, ISSUE_TYPES, type IssueEffect, type IssueType, type SiteIssue } from './domain/site-issue.entities.js';

const ENTITIES = [FieldReport, FieldReportItem, FieldPhoto, DeviceQueueState, SiteIssue, SiteIssuePhoto];
export const FIELD_ENTITIES = ENTITIES;
export const FIELD_TENANT_ENTITIES = ENTITIES;
