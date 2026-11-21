import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FieldReview, type RequiredAction } from '../domain/review.entity.js';

// آخرین درخواست اصلاح هر آیتم (approval-workflow.md ۴.۳) برای اپ کارگاه (M11؛ field-app.md ۴.۷، ۵.۱): یادداشت ناظر و چک‌لیست.
// خواندن فقط؛ Review مال approvals است.

export interface RevisionRequestView {
  readonly note: string | null;
  readonly requiredActions: readonly RequiredAction[];
  readonly reviewerUserId: string | null;
  readonly requestedAt: string | null;
}

@Injectable()
export class RevisionRequests {
  constructor(private readonly em: EntityManager) {}

  async latest(itemIds: readonly string[]): Promise<Map<string, RevisionRequestView>> {
    if (itemIds.length === 0) return new Map();
    const reviews = await this.em.find(FieldReview, { itemId: { $in: [...itemIds] }, decision: 'request_revision' }, { orderBy: { decidedAt: 'asc' } });
    const result = new Map<string, RevisionRequestView>();
    for (const review of reviews) {
      result.set(review.itemId, {
        note: review.note ?? null,
        requiredActions: review.requiredActions ?? [],
        reviewerUserId: review.reviewerUserId ?? null,
        requestedAt: review.decidedAt?.toISOString() ?? null,
      });
    }
    return result;
  }
}
