import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { FieldRecords, type ItemRecord, type ReceivedBatch, type ReportRecord, ReportPipeline } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { FieldReview } from '../domain/review.entity.js';
import { Workflow } from './workflow.js';

// پیاده‌سازی ReportPipeline برای field: ورود آیتم‌های تازه، تکمیل عکس و ارسال دوباره به خط پردازش (approval-workflow.md ۲).

@Injectable()
export class ApprovalPipeline extends ReportPipeline {
  constructor(
    private readonly workflow: Workflow,
    private readonly records: FieldRecords,
    private readonly identity: IdentityService,
  ) {
    super();
  }

  async received(tx: EntityManager, batch: ReceivedBatch): Promise<void> {
    const ctx = { ...(await this.workflow.context(tx, batch.report.projectId, batch.report)), photos: batch.photos };
    const leaves = new Map(ctx.leaves);
    for (const id of batch.removedLeafIds) leaves.delete(id);
    const assignees: (string | null)[] = [];
    for (const item of batch.items) assignees.push(await this.workflow.enter(tx, { ...ctx, leaves }, item));
    await tx.flush();
    await this.notify(tx, batch.report, assignees);
  }

  async photosCompleted(tx: EntityManager, report: ReportRecord): Promise<void> {
    const ctx = await this.workflow.context(tx, report.projectId, report);
    const waiting = (await this.records.items(tx, { reportIds: [report.id], statuses: ['submitted'] })).filter((item) => item.flags.includes('photos_pending'));
    const assignees: (string | null)[] = [];
    for (const item of waiting) {
      // اصلاحی که منتظر عکس تازه بود به همان تأییدکنندهٔ قبلی برمی‌گردد (۴.۵)
      const assignee = item.revisionCount > 0 ? await this.previousReviewer(tx, item) : undefined;
      assignees.push(await this.workflow.enter(tx, ctx, item, assignee === undefined ? {} : { assignee }));
    }
    await tx.flush();
    await this.notify(tx, report, assignees);
  }

  /** پیشرفت اولیهٔ ورود MSP (msp-integration.md ۷.۲؛ OD-16): برنامه‌ریز با «ساخت» تأیید می‌دهد — استثنای منع خودتأییدی. */
  async opening(tx: EntityManager, batch: { readonly report: ReportRecord; readonly items: readonly ItemRecord[]; readonly note: string }): Promise<void> {
    const ctx = await this.workflow.context(tx, batch.report.projectId, batch.report);
    for (const item of batch.items) {
      this.workflow.close(tx, ctx, item, { stage: 1, decision: 'auto_approve', reviewer: batch.report.authorUserId, note: batch.note });
      await this.workflow.markApproved(tx, item, true);
    }
    await tx.flush();
  }

  /** همان تأییدکنندهٔ مرحلهٔ اول قبلی، با مهلت تازه (۴.۵؛ AC-AP-07). */
  async resubmitted(tx: EntityManager, report: ReportRecord, item: ItemRecord): Promise<void> {
    const ctx = await this.workflow.context(tx, report.projectId, report);
    const assignee = await this.workflow.enter(tx, ctx, item, { assignee: await this.previousReviewer(tx, item) });
    await tx.flush();
    await this.notify(tx, report, [assignee]);
  }

  private async previousReviewer(tx: EntityManager, item: ItemRecord): Promise<string | null> {
    const previous = await tx.findOne(
      FieldReview,
      { itemId: item.id, stage: 1, decision: { $in: ['request_revision', 'revoke_auto'] } },
      { orderBy: { createdAt: 'desc' } },
    );
    return previous?.reviewerUserId ?? previous?.assigneeUserId ?? null;
  }

  private async notify(tx: EntityManager, report: ReportRecord, assignees: readonly (string | null)[]): Promise<void> {
    if (!assignees.some(Boolean)) return;
    const author = (await this.identity.personRefs([report.authorUserId])).get(report.authorUserId)?.fullName ?? 'سرپرست';
    await this.workflow.notifyNewReport(tx, report, assignees, author);
  }
}
