import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase, tenantBase } from '../../../platform/database/base-properties.js';

// دفتر ریسک (risk.md ۴؛ `02` ۹ و ۵ ContingencyAllocation). مالک: risks (F14).

export const RISK_STATUSES = ['identified', 'assessed', 'in_action', 'occurred', 'closed'] as const;
export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const RESPONSE_STRATEGIES = ['avoid', 'mitigate', 'transfer', 'accept'] as const;
export const REVIEW_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export const CLOSE_REASONS = ['mitigated', 'not_applicable', 'accepted', 'other'] as const;
export const ACTION_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;
export const LINK_TYPES = ['wbs_item', 'cbs_item', 'field_report'] as const;
export const NOTE_KINDS = ['note', 'score', 'status', 'created', 'action', 'contingency'] as const;

export type RiskStatus = (typeof RISK_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type ResponseStrategy = (typeof RESPONSE_STRATEGIES)[number];
export type ReviewFrequency = (typeof REVIEW_FREQUENCIES)[number];
export type CloseReason = (typeof CLOSE_REASONS)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type LinkType = (typeof LINK_TYPES)[number];
export type NoteKind = (typeof NOTE_KINDS)[number];

const RiskSchema = defineEntity({
  name: 'Risk',
  tableName: 'risk',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    code: p.string(),
    title: p.text(),
    category: p.string(),
    cause: p.text().nullable(),
    event: p.text().nullable(),
    consequence: p.text().nullable(),
    probability: p.smallint().nullable(),
    impact: p.smallint().nullable(),
    score: p.smallint().nullable(),
    level: p.enum(RISK_LEVELS).nullable(),
    status: p.enum(RISK_STATUSES),
    responseStrategy: p.enum(RESPONSE_STRATEGIES).nullable(),
    ownerUserId: p.uuid(),
    triggerText: p.text().nullable(),
    nextReviewDate: p.date().nullable(),
    reviewFrequency: p.enum(REVIEW_FREQUENCIES).nullable(),
    costImpact: p.bigint('string').nullable(),
    scheduleImpactDays: p.integer().nullable(),
    targetProbability: p.smallint().nullable(),
    targetImpact: p.smallint().nullable(),
    source: p.enum(['manual', 'field'] as const),
    sourceReportedByUserId: p.uuid().nullable(),
    sourceIssueType: p.string().nullable(),
    sourceIssueEffect: p.enum(['stop', 'slow', 'none'] as const).nullable(),
    closeReason: p.enum(CLOSE_REASONS).nullable(),
    closedAt: p.datetime().nullable(),
    closedByUserId: p.uuid().nullable(),
    occurredAt: p.datetime().nullable(),
    actualCost: p.bigint('string').nullable(),
    actualDelayDays: p.integer().nullable(),
    createdByUserId: p.uuid(),
  },
});
export class Risk extends RiskSchema.class {}
RiskSchema.setClass(Risk);

const RiskActionSchema = defineEntity({
  name: 'RiskAction',
  tableName: 'risk_action',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    riskId: p.uuid(),
    title: p.text(),
    ownerUserId: p.uuid(),
    dueDate: p.date(),
    status: p.enum(ACTION_STATUSES),
    costNote: p.text().nullable(),
    completedAt: p.datetime().nullable(),
    completionNote: p.text().nullable(),
  },
});
export class RiskAction extends RiskActionSchema.class {}
RiskActionSchema.setClass(RiskAction);

const RiskLinkSchema = defineEntity({
  name: 'RiskLink',
  tableName: 'risk_link',
  properties: {
    ...tenantBase(),
    projectId: p.uuid(),
    riskId: p.uuid(),
    targetType: p.enum(LINK_TYPES),
    targetId: p.uuid(),
  },
});
export class RiskLink extends RiskLinkSchema.class {}
RiskLinkSchema.setClass(RiskLink);

const RiskScoreHistorySchema = defineEntity({
  name: 'RiskScoreHistory',
  tableName: 'risk_score_history',
  properties: {
    ...tenantBase(),
    riskId: p.uuid(),
    probability: p.smallint(),
    impact: p.smallint(),
    score: p.smallint(),
    changedByUserId: p.uuid(),
    reason: p.text().nullable(),
  },
});
export class RiskScoreHistory extends RiskScoreHistorySchema.class {}
RiskScoreHistorySchema.setClass(RiskScoreHistory);

const RiskNoteSchema = defineEntity({
  name: 'RiskNote',
  tableName: 'risk_note',
  properties: {
    ...tenantBase(),
    riskId: p.uuid(),
    kind: p.enum(NOTE_KINDS),
    text: p.text(),
    authorUserId: p.uuid(),
    attachmentKeys: p.json<string[]>(),
    mentionedUserIds: p.json<string[]>(),
  },
});
export class RiskNote extends RiskNoteSchema.class {}
RiskNoteSchema.setClass(RiskNote);

const RiskFollowerSchema = defineEntity({
  name: 'RiskFollower',
  tableName: 'risk_follower',
  properties: {
    riskId: p.uuid().primary(),
    userId: p.uuid().primary(),
    orgId: p.uuid(),
    createdAt: p.datetime(),
  },
});
export class RiskFollower extends RiskFollowerSchema.class {}
RiskFollowerSchema.setClass(RiskFollower);

const ContingencyAllocationSchema = defineEntity({
  name: 'ContingencyAllocation',
  tableName: 'contingency_allocation',
  properties: {
    ...tenantBase(),
    projectId: p.uuid(),
    riskId: p.uuid(),
    /** تغییر تخصیص (مثبت یا منفی)؛ تخصیص فعلی ریسک = جمع. */
    amount: p.bigint('string'),
    note: p.text(),
    createdByUserId: p.uuid(),
  },
});
export class ContingencyAllocation extends ContingencyAllocationSchema.class {}
ContingencyAllocationSchema.setClass(ContingencyAllocation);

const RiskCategorySchema = defineEntity({
  name: 'RiskCategory',
  tableName: 'risk_category',
  properties: {
    ...tenantBase(),
    name: p.string(),
    isActive: p.boolean(),
    sortOrder: p.integer(),
  },
});
export class RiskCategory extends RiskCategorySchema.class {}
RiskCategorySchema.setClass(RiskCategory);

export const RISK_ENTITIES = [Risk, RiskAction, RiskLink, RiskScoreHistory, RiskNote, RiskFollower, ContingencyAllocation, RiskCategory];
