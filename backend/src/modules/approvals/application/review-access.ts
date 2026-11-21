import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { Permission, PermissionScope } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import type { ItemRecord, ReportRecord } from '../../field/index.js';
import { FieldReview } from '../domain/review.entity.js';

// چه کسی روی یک آیتم تصمیم می‌گیرد (approval-workflow.md ۴.۳، ۴.۴، ۷؛ F07 ۶.۲). دامنهٔ «all» (مدیر پروژه، مدیر سازمان)
// همهٔ آیتم‌های پروژه؛ ناظر (own_area) آیتمی که مرحلهٔ بازش به او سپرده شده یا پیش از ارجاع سپرده شده بود.

export interface ItemAbilities {
  readonly decide: boolean;
  readonly revokeAuto: boolean;
  readonly correct: boolean;
  readonly resolve: boolean;
}

@Injectable()
export class ReviewAccess {
  constructor(private readonly context: AppContext) {}

  actorId(): string {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor.userId;
  }

  scope(projectId: string, code: Permission): PermissionScope | null {
    const access = this.context.access;
    if (!access) return null;
    if (access.isOrgAdmin) return 'all';
    return access.projects.get(projectId)?.get(code) ?? null;
  }

  /** آیا این کاربر روی مرحلهٔ باز آیتم تصمیم می‌گیرد. خودتأییدی هرگز (F07 ۶.۲). */
  canDecide(report: ReportRecord, item: ItemRecord, reviews: readonly FieldReview[], userId: string): boolean {
    if (report.authorUserId === userId) return false;
    const stage = item.currentStage === 2 ? 2 : 1;
    const code: Permission = item.status === 'needs_resolution' ? 'report.resolve' : stage === 2 ? 'report.approve.stage2' : 'report.approve.stage1';
    const scope = this.scope(item.projectId, code);
    const assigned = reviews.some(
      (review) =>
        review.stage === stage &&
        (review.assigneeUserId === userId || review.escalatedToUserId === userId) &&
        (review.decidedAt === null || review.decision === 'escalate'),
    );
    if (assigned) return scope !== null || stage === 2 || this.scope(item.projectId, 'report.approve.stage1') !== null;
    return scope === 'all';
  }

  /** برگرداندن تأیید خودکار و اصلاح: تأییدکنندهٔ حوزه (همان مسئول مرحلهٔ اول) یا مدیر پروژه (۴.۶، ۴.۷). */
  canActOnApproved(report: ReportRecord, item: ItemRecord, code: Permission, firstStageApprover: string | null, userId: string): boolean {
    if (report.authorUserId === userId) return false;
    const scope = this.scope(item.projectId, code);
    if (scope === 'all') return true;
    return scope !== null && firstStageApprover === userId;
  }

  async reviewsOf(em: EntityManager, itemIds: readonly string[]): Promise<FieldReview[]> {
    return itemIds.length === 0 ? [] : em.find(FieldReview, { itemId: { $in: [...itemIds] } }, { orderBy: { createdAt: 'asc' } });
  }
}
