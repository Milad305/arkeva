import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, idColumn } from '../../../platform/database/base-properties.js';

// Review (`02` ۶) — واقعیت؛ مالک: approvals (F09). هر ورود به مرحلهٔ ۱ یا ۲ یک ردیف باز با `dueAt` و تأییدکنندهٔ مسئول
// (`assigneeUserId`، برای «نزد چه کسی است» و ارجاع)؛ تصمیم همان ردیف را می‌بندد. تأیید خودکار ردیف بسته بی بازبین.

export const REVIEW_DECISIONS = ['approve', 'request_revision', 'reject', 'auto_approve', 'revoke_auto', 'escalate', 'resolve_assignment'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export interface RequiredAction {
  readonly key: string;
  readonly text: string;
  readonly type: 'check' | 'photo';
  readonly minPhotos?: number;
}

const FieldReviewSchema = defineEntity({
  name: 'FieldReview',
  tableName: 'field_review',
  properties: {
    id: idColumn(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    itemId: p.uuid(),
    stage: p.integer(),
    assigneeUserId: p.uuid().nullable(),
    reviewerUserId: p.uuid().nullable(),
    decision: p.enum(REVIEW_DECISIONS).nullable(),
    note: p.text().nullable(),
    requiredActions: p.json<RequiredAction[]>().nullable(),
    dueAt: p.datetime(),
    decidedAt: p.datetime().nullable(),
    escalatedToUserId: p.uuid().nullable(),
    createdAt: createdAtColumn(),
  },
});

export class FieldReview extends FieldReviewSchema.class {}
FieldReviewSchema.setClass(FieldReview);
