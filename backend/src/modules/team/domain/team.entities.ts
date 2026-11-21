import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, idColumn, mutableBase } from '../../../platform/database/base-properties.js';

// ApprovalRoute (`02` ۳) و WbsAssignmentHistory (`02` ۴). مالک: team (F07؛ `03` ۲).

const ApprovalRouteSchema = defineEntity({
  name: 'ApprovalRoute',
  tableName: 'approval_route',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    areaName: p.string(),
    /** ریشه‌های زیردرخت WBS؛ ریشهٔ حذف‌شده در بازنگری در خواندن کنار می‌رود (team-assignment.md ۶.۱). */
    rootItemIds: p.json<string[]>(),
    reviewerUserId: p.uuid().nullable(),
    sortOrder: p.integer().default(0),
  },
});

export class ApprovalRoute extends ApprovalRouteSchema.class {}
ApprovalRouteSchema.setClass(ApprovalRoute);

const WbsAssignmentHistorySchema = defineEntity({
  name: 'WbsAssignmentHistory',
  tableName: 'wbs_assignment_history',
  properties: {
    id: idColumn(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    wbsItemId: p.uuid(),
    supervisorUserId: p.uuid(),
    fromAt: p.datetime(),
    toAt: p.datetime().nullable(),
    assignedByUserId: p.uuid().nullable(),
    createdAt: createdAtColumn(),
  },
});

export class WbsAssignmentHistory extends WbsAssignmentHistorySchema.class {}
WbsAssignmentHistorySchema.setClass(WbsAssignmentHistory);
