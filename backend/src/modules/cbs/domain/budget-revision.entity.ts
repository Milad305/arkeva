import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase } from '../../../platform/database/base-properties.js';

// درخواست بازنگری بودجه (cbs.md ۷.۳؛ OD-11؛ فرم G14). مالک: cbs. تأیید نسخهٔ «بازنگری بودجه» را از راه planning
// می‌سازد و همان لحظه اعمال می‌کند (۷.۲)؛ درخواست فقط وضعیت و نتیجه را نگه می‌دارد.

export const REVISION_FIELDS = ['unitRate', 'estimatedQuantity', 'lumpSumAmount'] as const;
export const REVISION_STATUSES = ['pending', 'approved', 'rejected', 'applied', 'withdrawn'] as const;
export type RevisionField = (typeof REVISION_FIELDS)[number];
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

export interface StoredRevisionChange {
  readonly cbsItemId: string;
  readonly field: RevisionField;
  readonly from: string;
  readonly to: string;
  /** کد و عنوان لحظهٔ ثبت — قلم ممکن است بعد عوض شود. */
  readonly cbsCode: string;
  readonly cbsTitle: string;
}

export interface StoredRevisionImpact {
  readonly budgetChange: string;
  readonly bacChange: string;
}

const BudgetRevisionRequestSchema = defineEntity({
  name: 'BudgetRevisionRequest',
  tableName: 'budget_revision_request',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    requestedByUserId: p.uuid(),
    reason: p.text(),
    changes: p.json<StoredRevisionChange[]>(),
    impact: p.json<StoredRevisionImpact>(),
    status: p.enum(REVISION_STATUSES).default('pending'),
    decidedByUserId: p.uuid().nullable(),
    decidedAt: p.datetime().nullable(),
    decisionNote: p.text().nullable(),
    resultVersionId: p.uuid().nullable(),
  },
});

export class BudgetRevisionRequest extends BudgetRevisionRequestSchema.class {}
BudgetRevisionRequestSchema.setClass(BudgetRevisionRequest);
