import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FieldReview } from '../domain/review.entity.js';

// آمار صف تأیید برای قواعد AL-APR-01 و AL-APR-02 (04-alert-engine ۳.۵) — خواندنی؛ Review مال approvals است.

export interface ReviewQueueStats {
  readonly userId: string;
  readonly overdueCount: number;
  /** ساعت از ورود قدیمی‌ترین مرحلهٔ معوق. */
  readonly oldestOverdueHours: number;
  readonly decisions14d: number;
  readonly avgDecisionHours: number | null;
}

const HOUR = 3_600_000;

@Injectable()
export class ReviewStats {
  constructor(private readonly em: EntityManager) {}

  async forProject(projectId: string, now: Date): Promise<ReviewQueueStats[]> {
    const since = new Date(now.getTime() - 14 * 86_400_000);
    const [open, decided] = await Promise.all([
      this.em.find(FieldReview, { projectId, decidedAt: null }, { fields: ['assigneeUserId', 'createdAt', 'dueAt'] }),
      this.em.find(
        FieldReview,
        { projectId, decidedAt: { $gte: since }, reviewerUserId: { $ne: null }, decision: { $in: ['approve', 'request_revision', 'reject'] } },
        { fields: ['reviewerUserId', 'createdAt', 'decidedAt'] },
      ),
    ]);
    const stats = new Map<string, { overdue: number; oldest: number; decisions: number; hours: number }>();
    const entry = (userId: string) => {
      const known = stats.get(userId);
      if (known) return known;
      const fresh = { overdue: 0, oldest: 0, decisions: 0, hours: 0 };
      stats.set(userId, fresh);
      return fresh;
    };
    for (const review of open) {
      if (!review.assigneeUserId) continue;
      const target = entry(review.assigneeUserId);
      if (review.dueAt <= now) {
        target.overdue += 1;
        target.oldest = Math.max(target.oldest, (now.getTime() - review.createdAt.getTime()) / HOUR);
      }
    }
    for (const review of decided) {
      if (!review.reviewerUserId || !review.decidedAt) continue;
      const target = entry(review.reviewerUserId);
      target.decisions += 1;
      target.hours += (review.decidedAt.getTime() - review.createdAt.getTime()) / HOUR;
    }
    return [...stats].map(([userId, value]) => ({
      userId,
      overdueCount: value.overdue,
      oldestOverdueHours: Math.round(value.oldest),
      decisions14d: value.decisions,
      avgDecisionHours: value.decisions > 0 ? value.hours / value.decisions : null,
    }));
  }
}
