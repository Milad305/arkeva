import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { plannedLeafPercent } from '../../computation/index.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { PeriodReads } from '../../computation/reads.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { entriesOf, FieldRecords, type ItemRecord, type PhotoRecord, type ReportRecord } from '../../field/index.js';
import { Notifier } from '../../notifications/index.js';
import { type CurrentItem, PlanningService } from '../../planning/index.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import { ApprovalRoutes } from '../../team/index.js';
import { reviewDueAt } from '../domain/deadline.js';
import { type Evaluation, evaluateItem } from '../domain/evaluate.js';
import { FieldReview, type RequiredAction, type ReviewDecision } from '../domain/review.entity.js';

// هستهٔ خط پردازش آیتم (approval-workflow.md ۲–۴؛ D08). همهٔ انتقال‌های وضعیت FieldReportItem و همهٔ Reviewها فقط از
// این ماژول (`03` ۲). هر انتقال به approved دوباره‌ارزیابی دارد (۳.۳) و FieldReportItemApproved منتشر می‌کند (D07).

export const OPEN_STATUSES = ['submitted', 'stage1', 'stage2', 'needs_resolution'] as const;
const methodOf = (leaf: CurrentItem) => (leaf.measurementMethod === 'quantity' || leaf.measurementMethod === 'percent' ? leaf.measurementMethod : 'steps');

export interface ItemContext {
  readonly rules: ProjectRulesView;
  readonly report: ReportRecord;
  readonly leaves: ReadonlyMap<string, CurrentItem>;
  readonly photos: readonly PhotoRecord[];
}

@Injectable()
export class Workflow {
  constructor(
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly notifier: Notifier,
    private readonly records: FieldRecords,
    private readonly planning: PlanningService,
    private readonly rulesOf: ProjectRules,
    private readonly routes: ApprovalRoutes,
    private readonly periods: PeriodReads,
  ) {}

  async context(tx: EntityManager, projectId: string, report: ReportRecord): Promise<ItemContext> {
    const [rules, leaves, photos] = await Promise.all([
      this.rulesOf.of(projectId, tx),
      this.planning.currentItems(projectId, tx),
      this.records.photos(tx, [report.id]),
    ]);
    return { rules, report, leaves: new Map(leaves.map((leaf) => [leaf.id, leaf])), photos };
  }

  /** مقادیر ۳.۱ و پرچم‌های ۳.۲ و ثبتشان روی آیتم. */
  async evaluate(tx: EntityManager, ctx: ItemContext, item: ItemRecord): Promise<Evaluation | null> {
    const leaf = ctx.leaves.get(item.wbsItemId);
    if (!leaf) return null;
    const approvedItems = (await this.records.items(tx, { projectId: item.projectId, wbsItemIds: [item.wbsItemId], statuses: ['approved'] })).filter(
      (entry) => entry.id !== item.id,
    );
    const approved = entriesOf(approvedItems, await this.records.reports(tx, { ids: [...new Set(approvedItems.map((entry) => entry.reportId))] }));
    const photos = ctx.photos.filter((photo) => photo.itemId === item.id || photo.itemId === null);
    const evaluation = evaluateItem({
      leaf: {
        method: methodOf(leaf),
        totalQuantity: leaf.totalQuantity === null ? null : Number(leaf.totalQuantity),
        steps: leaf.steps,
        isCritical: leaf.isCritical ?? false,
      },
      approved,
      item: {
        workDate: ctx.report.workDate,
        recordedAt: ctx.report.deviceRecordedAt.toISOString(),
        quantityToday: item.quantityToday ?? null,
        reportedPercent: item.reportedPercent ?? null,
        stepsProgress: item.stepsProgress ?? null,
      },
      source: ctx.report.source,
      photos: { count: photos.length, pending: photos.filter((photo) => photo.uploadStatus === 'pending').length },
      distanceFromSiteM: ctx.report.distanceFromSiteM ?? null,
      delayHours: (ctx.report.serverReceivedAt.getTime() - ctx.report.deviceRecordedAt.getTime()) / 3_600_000,
      deviceFlags: ctx.report.flags,
      plannedPercentAtDate: plannedLeafPercent(
        { start: leaf.plannedStart, finish: leaf.plannedFinish, isMilestone: leaf.isMilestone },
        ctx.report.workDate,
        ctx.rules.calendar,
      ),
      settings: ctx.rules.workflow,
    });
    this.records.transition(item, {
      computedPercent: evaluation.computedPercent,
      lastApprovedPercent: evaluation.lastApprovedPercent,
      deltaPercent: evaluation.deltaPercent,
      plannedPercentAtDate: evaluation.plannedPercentAtDate,
      flags: evaluation.flags,
      requiresStage2: evaluation.requiresStage2,
    });
    return evaluation;
  }

  /**
   * ورود به خط پردازش (دریافت، تکمیل عکس، ارسال دوباره، پذیرش تعیین تکلیف). تأییدکنندهٔ مسئول را برمی‌گرداند (برای
   * NT-APR-01) یا null اگر آیتم منتظر عکس ماند یا تمام شد.
   */
  async enter(
    tx: EntityManager,
    ctx: ItemContext,
    item: ItemRecord,
    options: { readonly assignee?: string | null; readonly skipAssignmentCheck?: boolean } = {},
  ): Promise<string | null> {
    const leaf = ctx.leaves.get(item.wbsItemId);
    const author = ctx.report.authorUserId;
    // برگ حذف‌شده، یا برگی که دیگر به نویسنده تخصیص ندارد (فقط اپ؛ ۲) ← تعیین تکلیف
    const reassigned = !!leaf && ctx.report.source === 'app' && !options.skipAssignmentCheck && leaf.supervisorUserId !== author;
    if (!leaf || reassigned) {
      this.records.transition(item, {
        status: 'needs_resolution',
        currentStage: 1,
        flags: ['needs_resolution'],
        resolution: leaf ? 'reassigned' : 'leaf_removed',
      });
      return this.open(tx, ctx, item, 1, options.assignee);
    }
    const evaluation = (await this.evaluate(tx, ctx, item)) as Evaluation;
    if (evaluation.gpsBlocked) {
      this.records.transition(item, { status: 'rejected', currentStage: null });
      this.close(tx, ctx, item, {
        stage: 1,
        decision: 'reject',
        reviewer: null,
        note: 'رد خودکار سیستم: مهر مکان بیرون از محدودهٔ کارگاه است (gpsMode = block).',
      });
      await this.emit(tx, item, 'FieldReportItemRejected', { auto: true });
      return null;
    }
    if (evaluation.flags.includes('photos_pending')) {
      this.records.transition(item, { status: 'submitted', currentStage: null });
      return null;
    }
    if (evaluation.autoApprove) {
      this.close(tx, ctx, item, { stage: 1, decision: 'auto_approve', reviewer: null, note: null });
      await this.markApproved(tx, item, true);
      return null;
    }
    this.records.transition(item, { status: 'stage1', currentStage: 1 });
    return this.open(tx, ctx, item, 1, options.assignee);
  }

  /**
   * تأیید یک مرحله (۴.۳): دوباره‌ارزیابی (۳.۳)؛ مرحلهٔ اول با نیاز به مرحلهٔ دوم ← stage2، وگرنه approved.
   */
  async approve(tx: EntityManager, ctx: ItemContext, item: ItemRecord, review: FieldReview, reviewerId: string): Promise<{ message: string | null }> {
    const before = item.deltaPercent;
    const evaluation = await this.evaluate(tx, ctx, item);
    this.decide(review, 'approve', reviewerId, null);
    if (item.currentStage === 1 && evaluation?.requiresStage2) {
      this.records.transition(item, { status: 'stage2', currentStage: 2 });
      await this.open(tx, ctx, item, 2, null);
      const changed = Math.abs(evaluation.deltaPercent - before) > 1e-6;
      return {
        message: changed
          ? `با تأیید گزارش‌های دیگر، تغییر این آیتم ${toFaDigits(Math.round(evaluation.deltaPercent * 10) / 10)}٪ شد و به مرحلهٔ دوم می‌رود.`
          : 'تأیید مرحلهٔ اول ثبت شد و آیتم به مرحلهٔ دوم (مدیر پروژه) رفت.',
      };
    }
    await this.markApproved(tx, item, false);
    return { message: null };
  }

  async markApproved(tx: EntityManager, item: ItemRecord, auto: boolean): Promise<void> {
    // workDate در دورهٔ بسته: اثرش از دورهٔ باز بعد و برچسب «اثر منتقل‌شده» (F10 ۵.۷؛ AC-PC-05)
    const [report] = await this.records.reports(tx, { ids: [item.reportId] });
    const carried = !!report && (await this.periods.inClosedPeriod(item.projectId, report.workDate, tx));
    const flags = carried && !item.flags.includes('carried_effect') ? [...item.flags, 'carried_effect'] : item.flags;
    this.records.transition(item, { status: 'approved', currentStage: null, autoApproved: auto, approvedAt: this.clock.now(), flags });
    await this.emit(tx, item, 'FieldReportItemApproved', { auto });
  }

  /** مرحلهٔ باز تازه با مهلت (۴.۴). تأییدکننده با منع خودتأییدی (F07 ۶.۲). */
  async open(tx: EntityManager, ctx: ItemContext, item: ItemRecord, stage: 1 | 2, assignee: string | null | undefined): Promise<string | null> {
    const resolved = assignee ?? (await this.assigneeFor(ctx, item, stage));
    const now = this.clock.now();
    tx.create(FieldReview, {
      id: newId(),
      orgId: item.orgId,
      projectId: item.projectId,
      itemId: item.id,
      stage,
      assigneeUserId: resolved,
      reviewerUserId: null,
      decision: null,
      note: null,
      requiredActions: null,
      dueAt: reviewDueAt(now, ctx.rules.reviewDeadlineHours, ctx.rules.calendar),
      decidedAt: null,
      escalatedToUserId: null,
    });
    return resolved;
  }

  async assigneeFor(ctx: ItemContext, item: ItemRecord, stage: 1 | 2): Promise<string | null> {
    const approvers = await this.routes.approverFor(item.projectId, item.wbsItemId, ctx.report.authorUserId);
    return stage === 1 ? approvers.firstStage : approvers.secondStage;
  }

  /** ردیف بسته (تأیید خودکار، رد خودکار، برگرداندن، تعیین تکلیف). */
  close(
    tx: EntityManager,
    ctx: Pick<ItemContext, 'rules'>,
    item: ItemRecord,
    input: { readonly stage: 1 | 2; readonly decision: ReviewDecision; readonly reviewer: string | null; readonly note: string | null },
  ): void {
    const now = this.clock.now();
    tx.create(FieldReview, {
      id: newId(),
      orgId: item.orgId,
      projectId: item.projectId,
      itemId: item.id,
      stage: input.stage,
      assigneeUserId: input.reviewer,
      reviewerUserId: input.reviewer,
      decision: input.decision,
      note: input.note,
      requiredActions: null,
      dueAt: reviewDueAt(now, ctx.rules.reviewDeadlineHours, ctx.rules.calendar),
      decidedAt: now,
      escalatedToUserId: null,
    });
  }

  decide(review: FieldReview, decision: ReviewDecision, reviewerId: string, note: string | null, requiredActions: RequiredAction[] | null = null): void {
    Object.assign(review, { decision, reviewerUserId: reviewerId, note, requiredActions, decidedAt: this.clock.now() });
  }

  async openReview(tx: EntityManager, itemId: string): Promise<FieldReview | null> {
    return tx.findOne(FieldReview, { itemId, decidedAt: null }, { orderBy: { createdAt: 'desc' } });
  }

  async emit(
    tx: EntityManager,
    item: ItemRecord,
    type: 'FieldReportItemApproved' | 'FieldReportItemReturned' | 'FieldReportItemRejected' | 'FieldReportItemRevoked' | 'FieldReportItemSuperseded',
    extra: Record<string, unknown> = {},
  ) {
    await this.outbox.emit(tx, {
      type,
      projectId: item.projectId,
      payload: { v: 1, itemId: item.id, reportId: item.reportId, wbsItemId: item.wbsItemId, ...extra },
    });
  }

  /** NT-APR-01: یک اعلان برای هر گزارش و هر تأییدکننده (AC-NT-02؛ ۶). */
  async notifyNewReport(tx: EntityManager, report: ReportRecord, assignees: readonly (string | null)[], authorName: string): Promise<void> {
    const counts = new Map<string, number>();
    for (const userId of assignees) if (userId && userId !== report.authorUserId) counts.set(userId, (counts.get(userId) ?? 0) + 1);
    for (const [userId, count] of counts) {
      await this.notifier.notify(tx, {
        code: 'NT-APR-01',
        projectId: report.projectId,
        recipients: [userId],
        subjectId: report.id,
        title: `${authorName} گزارش ${report.reportNo} را فرستاد؛ ${toFaDigits(count)} آیتم منتظر بررسی شماست.`,
        body: '',
        link: `/projects/${report.projectId}/reports?report=${report.id}`,
      });
    }
  }

  async notifyAuthor(
    tx: EntityManager,
    report: ReportRecord,
    item: ItemRecord,
    code: 'NT-FLD-01' | 'NT-FLD-02' | 'NT-FLD-03',
    title: string,
    body: string,
  ): Promise<void> {
    await this.notifier.notify(tx, {
      code,
      projectId: report.projectId,
      recipients: [report.authorUserId],
      subjectId: `${item.id}:${this.clock.now().getTime()}`,
      title,
      body,
      link: `/projects/${report.projectId}/reports?report=${report.id}`,
    });
  }

  now(): Date {
    return this.clock.now();
  }
}
