import { defineEntity, p } from '@mikro-orm/postgresql';

// ScheduleChangeProposal (`02` ۱۱؛ D05؛ msp-integration.md ۷.۳ بند ۶، ۷.۴). مالک: planning (F04؛ `03` ۲).

export const PROPOSAL_STATUSES = ['pending', 'exported', 'confirmed', 'superseded'] as const;
export const PROPOSAL_FIELDS = ['plannedStart', 'plannedFinish'] as const;
export type ProposalField = (typeof PROPOSAL_FIELDS)[number];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const ProposalSchema = defineEntity({
  name: 'ScheduleChangeProposal',
  tableName: 'schedule_change_proposal',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    wbsItemId: p.uuid(),
    field: p.enum(PROPOSAL_FIELDS),
    proposedValue: p.json<string | null>(),
    /** مقدار جاری هنگام پیشنهاد. */
    baseValue: p.json<string | null>().nullable(),
    status: p.enum(PROPOSAL_STATUSES),
    proposedByUserId: p.uuid(),
    exportedAt: p.datetime().nullable(),
    resolvedAt: p.datetime().nullable(),
    createdAt: p.datetime(),
  },
});

export class ScheduleChangeProposal extends ProposalSchema.class {}
ProposalSchema.setClass(ScheduleChangeProposal);
