import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { ConflictError, DomainError, ForbiddenError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { FieldRecords, type ItemRecord, leafForEntry, type ReportRecord, valuesFor, type ValuesInput } from '../../field/index.js';
import type { RequiredAction } from '../domain/review.entity.js';
import { ReviewAccess } from './review-access.js';
import { Workflow } from './workflow.js';

// تصمیم‌های ناظر و مدیر پروژه (approval-workflow.md ۴.۳–۴.۹). هر تصمیم در یک تراکنش با قفل ردیف آیتم؛ اولین تصمیم
// برنده است و دومی ۴۰۹ (۹.۱).

const invalid = (reason: string, extra: Record<string, unknown> = {}) => new DomainError('FIELD_DECISION_INVALID', 422, { reason, ...extra });
const conflict = (reason: string, extra: Record<string, unknown> = {}) => new ConflictError('FIELD_DECISION_CONFLICT', { reason, ...extra });
const denied = () => new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'report.approve.stage1' });

export interface DecisionInput {
  readonly decision: 'approve' | 'request_revision' | 'reject';
  readonly note?: string | null;
  readonly requiredActions?: readonly RequiredAction[];
  readonly unsuitablePhotoIds?: readonly string[];
  readonly confirmOverTotal?: boolean;
}

@Injectable()
export class Decisions {
  constructor(
    private readonly em: EntityManager,
    private readonly audit: Audit,
    private readonly records: FieldRecords,
    private readonly workflow: Workflow,
    private readonly access: ReviewAccess,
  ) {}

  /** `POST /projects/:pid/field-items/:itemId/decision` */
  async decide(projectId: string, itemId: string, input: DecisionInput): Promise<{ itemId: string; message: string | null }> {
    const actor = this.access.actorId();
    return this.em.transactional(async (tx) => {
      const { item, report } = await this.load(tx, projectId, itemId);
      if (item.status !== 'stage1' && item.status !== 'stage2')
        throw conflict('درباره این آیتم پیش‌تر تصمیم گرفته شده است. صفحه را تازه کنید.', { status: item.status });
      await this.assertCanDecide(tx, report, item, actor);
      const message = await this.apply(tx, report, item, actor, input);
      return { itemId, message };
    });
  }

  /** `POST /projects/:pid/field-reports/:reportId/approve-clean` — فقط آیتم‌های بی‌پرچمِ بی‌نیاز به مرحلهٔ دوم (۴.۹؛ AC-AP-10). */
  async approveClean(projectId: string, reportId: string): Promise<{ approved: number; movedToStage2: number; skipped: number }> {
    const actor = this.access.actorId();
    return this.em.transactional(async (tx) => {
      const report = await this.records.report(tx, projectId, reportId);
      const items = await this.records.items(tx, { reportIds: [reportId], statuses: ['stage1', 'stage2'] });
      const reviews = await this.access.reviewsOf(
        tx,
        items.map((item) => item.id),
      );
      const result = { approved: 0, movedToStage2: 0, skipped: 0 };
      for (const item of items) {
        const mine = this.access.canDecide(
          report,
          item,
          reviews.filter((review) => review.itemId === item.id),
          actor,
        );
        if (!mine || item.status !== 'stage1' || item.flags.length > 0 || item.requiresStage2) {
          result.skipped += 1;
          continue;
        }
        const locked = await this.records.lockItem(tx, projectId, item.id);
        await this.apply(tx, report, locked, actor, { decision: 'approve' });
        if (locked.status === 'approved') result.approved += 1;
        else result.movedToStage2 += 1;
      }
      return result;
    });
  }

  /** `POST /projects/:pid/field-reports/:reportId/request-revision` — درخواست اصلاح همهٔ آیتم‌های باز گزارش (اصلاح 1405/08/15). */
  async requestReportRevision(
    projectId: string,
    reportId: string,
    input: { readonly note: string; readonly requiredActions?: readonly RequiredAction[] },
  ): Promise<{ count: number }> {
    const actor = this.access.actorId();
    return this.em.transactional(async (tx) => {
      const report = await this.records.report(tx, projectId, reportId);
      const items = await this.records.items(tx, { reportIds: [reportId], statuses: ['stage1', 'stage2'] });
      const reviews = await this.access.reviewsOf(
        tx,
        items.map((item) => item.id),
      );
      const mine = items.filter((item) =>
        this.access.canDecide(
          report,
          item,
          reviews.filter((review) => review.itemId === item.id),
          actor,
        ),
      );
      if (mine.length === 0) throw conflict('آیتم بازی در این گزارش نیست که تصمیمش با شما باشد.');
      for (const item of mine) {
        await this.apply(tx, report, await this.records.lockItem(tx, projectId, item.id), actor, {
          decision: 'request_revision',
          note: input.note,
          requiredActions: input.requiredActions ?? [],
        });
      }
      return { count: mine.length };
    });
  }

  /** `POST /projects/:pid/field-items/:itemId/revoke-auto` — فقط تأیید خودکار و فقط در مهلت (۴.۶؛ AC-AP-09). */
  async revokeAuto(projectId: string, itemId: string, noteInput: string): Promise<{ itemId: string; message: string | null }> {
    const actor = this.access.actorId();
    const note = noteInput.trim();
    if (note.length < 3) throw invalid('دلیل برگرداندن را بنویسید تا سرپرست بداند چه کند.');
    return this.em.transactional(async (tx) => {
      const { item, report } = await this.load(tx, projectId, itemId);
      const ctx = await this.workflow.context(tx, projectId, report);
      if (item.status !== 'approved' || !item.autoApproved)
        throw conflict('فقط آیتمی که خودکار تأیید شده برگردانده می‌شود؛ آیتم تأییدشدهٔ دستی را با «اصلاح» درست کنید.');
      const deadline = (item.approvedAt?.getTime() ?? 0) + ctx.rules.reviewDeadlineHours * 3_600_000;
      if (this.workflow.now().getTime() > deadline)
        throw conflict(`مهلت برگرداندن تأیید خودکار (${toFaDigits(ctx.rules.reviewDeadlineHours)} ساعت) گذشته است؛ برای تغییر مقدار از «اصلاح» استفاده کنید.`);
      const approver = await this.workflow.assigneeFor(ctx, item, 1);
      if (!this.access.canActOnApproved(report, item, 'report.approve.stage1', approver, actor)) throw denied();
      this.records.transition(item, { status: 'needs_revision', currentStage: null, autoApproved: false, approvedAt: null });
      this.workflow.close(tx, ctx, item, { stage: 1, decision: 'revoke_auto', reviewer: actor, note });
      await this.workflow.emit(tx, item, 'FieldReportItemRevoked', {});
      await this.workflow.notifyAuthor(tx, report, item, 'NT-FLD-01', `آیتم ${this.code(ctx, item)} برای اصلاح برگشت: ${note}`, note);
      return { itemId, message: 'تأیید خودکار برگردانده شد و آیتم برای اصلاح نزد سرپرست رفت.' };
    });
  }

  /** `POST /projects/:pid/field-items/:itemId/correct` — آیتم تازهٔ approved، قبلی superseded (۴.۷؛ AC-AP-08). */
  async correct(
    projectId: string,
    itemId: string,
    input: { readonly values: ValuesInput; readonly reason: string },
  ): Promise<{ itemId: string; message: string | null }> {
    const actor = this.access.actorId();
    const reason = input.reason.trim();
    if (reason.length < 3) throw invalid('دلیل اصلاح لازم است.');
    return this.em.transactional(async (tx) => {
      const { item, report } = await this.load(tx, projectId, itemId);
      const ctx = await this.workflow.context(tx, projectId, report);
      if (item.status !== 'approved') throw conflict('فقط آیتم تأییدشده اصلاح می‌شود.');
      const approver = await this.workflow.assigneeFor(ctx, item, 1);
      if (report.authorUserId === actor) throw conflict('نویسندهٔ گزارش آن را خودش اصلاح نمی‌کند (منع خودتأییدی)؛ از تأییدکنندهٔ حوزه یا مدیر پروژه بخواهید.');
      if (!this.access.canActOnApproved(report, item, 'report.correct', approver, actor))
        throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'report.correct' });
      const leaf = ctx.leaves.get(item.wbsItemId);
      if (!leaf) throw conflict('این فعالیت دیگر در برنامه نیست.');
      let values;
      try {
        values = valuesFor(leafForEntry(leaf), input.values);
      } catch (error) {
        throw invalid(error instanceof Error ? error.message : 'مقادیر نامعتبر است.');
      }
      this.records.transition(item, { status: 'superseded' });
      await tx.flush();
      const created = await this.records.createCorrection(tx, { original: item, report, values, authorUserId: actor, note: reason, now: this.workflow.now() });
      const correctionCtx = { ...ctx, report: created.report, photos: [] };
      await this.workflow.evaluate(tx, correctionCtx, created.item);
      this.workflow.close(tx, correctionCtx, created.item, { stage: 1, decision: 'approve', reviewer: actor, note: reason });
      await this.workflow.markApproved(tx, created.item, false);
      await this.workflow.emit(tx, item, 'FieldReportItemSuperseded', { byItemId: created.item.id });
      this.audit.record(tx, {
        action: 'field.item_corrected',
        entityType: 'FieldReportItem',
        entityId: item.id,
        projectId,
        after: { byItemId: created.item.id },
        reason,
      });
      await this.workflow.notifyAuthor(
        tx,
        report,
        item,
        'NT-FLD-03',
        `آیتم ${this.code(ctx, item)} پس از تأیید اصلاح شد؛ درصد تازه ${toFaDigits(Math.round(created.item.computedPercent * 10) / 10)}٪.`,
        reason,
      );
      return { itemId: created.item.id, message: 'اصلاح ثبت شد؛ آیتم قبلی جایگزین شد و مقادیرش دست‌نخورده ماند.' };
    });
  }

  /** `POST /projects/:pid/field-items/:itemId/resolve {accept, note}` — تعیین تکلیف (۴.۸). */
  async resolve(
    projectId: string,
    itemId: string,
    input: { readonly accept: boolean; readonly note: string },
  ): Promise<{ itemId: string; message: string | null }> {
    const actor = this.access.actorId();
    const note = input.note.trim();
    return this.em.transactional(async (tx) => {
      const { item, report } = await this.load(tx, projectId, itemId);
      if (item.status !== 'needs_resolution') throw conflict('این آیتم تعیین تکلیف لازم ندارد.');
      await this.assertCanDecide(tx, report, item, actor);
      const ctx = await this.workflow.context(tx, projectId, report);
      const review = await this.workflow.openReview(tx, item.id);
      if (input.accept && item.resolution === 'leaf_removed') throw invalid('این فعالیت از برنامه حذف شده است؛ فقط «رد» ممکن است.');
      if (!input.accept && note.length < 3) throw invalid('دلیل رد را بنویسید.');
      if (review) this.workflow.decide(review, 'resolve_assignment', actor, note || null);
      if (!input.accept) {
        this.records.transition(item, { status: 'rejected', currentStage: null });
        await this.workflow.emit(tx, item, 'FieldReportItemRejected', { resolution: item.resolution });
        await this.workflow.notifyAuthor(tx, report, item, 'NT-FLD-02', `آیتم ${this.code(ctx, item)} رد شد: ${note}`, note);
        return { itemId, message: 'آیتم رد شد.' };
      }
      this.records.transition(item, { resolution: null, flags: [] });
      const assignee = await this.workflow.enter(tx, ctx, item, { skipAssignmentCheck: true });
      await tx.flush();
      if (assignee && assignee !== actor) await this.workflow.notifyNewReport(tx, report, [assignee], 'تعیین تکلیف');
      return { itemId, message: 'آیتم پذیرفته شد و وارد بررسی عادی شد.' };
    });
  }

  // ── درونی ──

  private async apply(tx: EntityManager, report: ReportRecord, item: ItemRecord, actor: string, input: DecisionInput): Promise<string | null> {
    const ctx = await this.workflow.context(tx, item.projectId, report);
    const review = await this.workflow.openReview(tx, item.id);
    if (!review) throw conflict('مرحلهٔ بازی برای این آیتم پیدا نشد. صفحه را تازه کنید.');
    const note = input.note?.trim() || null;
    await this.records.markUnsuitable(tx, report.id, input.unsuitablePhotoIds ?? []);
    if (input.decision === 'approve') {
      const evaluation = await this.workflow.evaluate(tx, ctx, item);
      if (evaluation?.flags.includes('over_total_quantity') && !input.confirmOverTotal) {
        throw conflict('با این تأیید مقدار تجمعی از مقدار کل فعالیت بیشتر می‌شود و درصد برگ روی ۱۰۰ می‌ماند. اگر درست است، تأیید را دوباره بزنید.', {
          needsConfirm: true,
        });
      }
      const { message } = await this.workflow.approve(tx, ctx, item, review, actor);
      return message;
    }
    if (!note || note.length < 3)
      throw invalid(input.decision === 'reject' ? 'دلیل رد را بنویسید تا سرپرست بداند چه شد.' : 'یادداشت درخواست اصلاح را بنویسید تا سرپرست بداند چه کند.');
    if (input.decision === 'request_revision') {
      this.workflow.decide(review, 'request_revision', actor, note, input.requiredActions?.length ? [...input.requiredActions] : null);
      this.records.transition(item, { status: 'needs_revision', currentStage: null });
      await this.workflow.emit(tx, item, 'FieldReportItemReturned', {});
      await this.workflow.notifyAuthor(tx, report, item, 'NT-FLD-01', `آیتم ${this.code(ctx, item)} برای اصلاح برگشت: ${note}`, note);
      return null;
    }
    this.workflow.decide(review, 'reject', actor, note);
    this.records.transition(item, { status: 'rejected', currentStage: null });
    await this.workflow.emit(tx, item, 'FieldReportItemRejected', {});
    await this.workflow.notifyAuthor(tx, report, item, 'NT-FLD-02', `آیتم ${this.code(ctx, item)} رد شد: ${note}`, note);
    return null;
  }

  private async load(tx: EntityManager, projectId: string, itemId: string) {
    const item = await this.records.lockItem(tx, projectId, itemId);
    return { item, report: await this.records.report(tx, projectId, item.reportId) };
  }

  private async assertCanDecide(tx: EntityManager, report: ReportRecord, item: ItemRecord, actor: string): Promise<void> {
    if (report.authorUserId === actor) throw conflict('آیتمی را که خودتان ثبت کرده‌اید تأیید نمی‌کنید (منع خودتأییدی)؛ نزد تأییدکنندهٔ جایگزین است.');
    const reviews = await this.access.reviewsOf(tx, [item.id]);
    if (!this.access.canDecide(report, item, reviews, actor)) throw denied();
  }

  private code(ctx: Awaited<ReturnType<Workflow['context']>>, item: ItemRecord): string {
    return ctx.leaves.get(item.wbsItemId)?.code ?? '';
  }
}
