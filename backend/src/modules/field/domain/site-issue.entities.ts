import { defineEntity, p } from '@mikro-orm/postgresql';
import { tenantBase } from '../../../platform/database/base-properties.js';

// مشکل کارگاه (M13؛ risk.md ۴ «SiteIssue — واقعیت، مالک F08»). شناسه UUID ساخته‌شده در گوشی (D10).

export const ISSUE_TYPES = ['material', 'safety', 'equipment', 'design', 'weather', 'other'] as const;
export const ISSUE_EFFECTS = ['stop', 'slow', 'none'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];
export type IssueEffect = (typeof ISSUE_EFFECTS)[number];

const SiteIssueSchema = defineEntity({
  name: 'SiteIssue',
  tableName: 'site_issue',
  properties: {
    ...tenantBase(),
    projectId: p.uuid(),
    reporterUserId: p.uuid(),
    wbsItemId: p.uuid().nullable(),
    type: p.enum(ISSUE_TYPES),
    title: p.text(),
    description: p.text(),
    effect: p.enum(ISSUE_EFFECTS),
    deviceRecordedAt: p.datetime(),
    serverReceivedAt: p.datetime(),
    riskId: p.uuid().nullable(),
  },
});
export class SiteIssue extends SiteIssueSchema.class {}
SiteIssueSchema.setClass(SiteIssue);

const SiteIssuePhotoSchema = defineEntity({
  name: 'SiteIssuePhoto',
  tableName: 'site_issue_photo',
  properties: {
    ...tenantBase(),
    projectId: p.uuid(),
    issueId: p.uuid(),
    sha256: p.string(),
    storageKey: p.text().nullable(),
    uploadStatus: p.enum(['pending', 'complete'] as const),
    takenAt: p.datetime(),
  },
});
export class SiteIssuePhoto extends SiteIssuePhotoSchema.class {}
SiteIssuePhotoSchema.setClass(SiteIssuePhoto);
