import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FieldReview } from '../domain/review.entity.js';

// صف و تصمیم‌های تأیید یک پروژه در بازهٔ W23 (charts.md ۶.۵؛ تصمیم 1405/08/25: آمار هنگام خواندن). Review مال approvals است؛
// اینجا فقط واقعیت خام برمی‌گردد (مدت هر تصمیم به ساعت، برگشت، صف باز) و لایهٔ خواندن میانگین و صدک را از computation می‌گیرد.

const HOUR = 3_600_000;

export interface ApproverWindow {
  readonly decided: { readonly userId: string; readonly hours: number; readonly returned: boolean }[];
  readonly open: { readonly userId: string | null; readonly ageHours: number; readonly overdue: boolean }[];
}

@Injectable()
export class ApproverWindows {
  constructor(private readonly em: EntityManager) {}

  async of(projectId: string, from: Date, to: Date, now: Date): Promise<ApproverWindow> {
    const [decided, open] = await Promise.all([
      this.em.find(
        FieldReview,
        { projectId, decidedAt: { $gte: from, $lt: to }, reviewerUserId: { $ne: null }, decision: { $in: ['approve', 'request_revision', 'reject'] } },
        { fields: ['reviewerUserId', 'createdAt', 'decidedAt', 'decision'] },
      ),
      this.em.find(FieldReview, { projectId, decidedAt: null }, { fields: ['assigneeUserId', 'createdAt', 'dueAt'] }),
    ]);
    return {
      decided: decided.map((review) => ({
        userId: review.reviewerUserId as string,
        hours: ((review.decidedAt as Date).getTime() - review.createdAt.getTime()) / HOUR,
        returned: review.decision === 'request_revision',
      })),
      open: open.map((review) => ({
        userId: review.assigneeUserId ?? null,
        ageHours: (now.getTime() - review.createdAt.getTime()) / HOUR,
        overdue: review.dueAt <= now,
      })),
    };
  }
}
