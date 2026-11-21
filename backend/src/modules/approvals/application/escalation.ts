import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, LockMode, MikroORM } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, ForbiddenError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { type JobData, type JobRun, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { MembershipPort } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { ProjectRules } from '../../projects/index.js';
import { reviewDueAt } from '../domain/deadline.js';
import { FieldReview } from '../domain/review.entity.js';
import { ReviewAccess } from './review-access.js';

// مهلت و ارجاع (approval-workflow.md ۴.۴؛ AC-AP-06). HourlyTick سراسری سررسیده‌ها را با تابع SECURITY DEFINER پیدا
// می‌کند و برای هر پروژه کار جدا در سازمان خودش صف می‌کند (همان الگوی PurgeTick). ارجاع فقط یک بار برای هر مرحله؛
// AL-APR-01 با برش هشدارها. یادآوری و واگذاری گلوگاه W23 (charts.md؛ تصمیم 1405/08/15) هم اینجاست.

export const ESCALATION_QUEUE: QueueDef = {
  name: 'approvals.escalate',
  policy: 'standard',
  retryLimit: 3,
  retryDelaySec: 60,
  retryBackoff: true,
  expireInSeconds: 600,
  priority: 30,
  concurrency: 2,
};

interface EscalationJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
}

@Injectable()
@OnTick('HourlyTick')
export class Escalation implements TickHandler, OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly orm: MikroORM,
    private readonly jobs: Jobs,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly rules: ProjectRules,
    private readonly notifier: Notifier,
    private readonly memberships: MembershipPort,
    private readonly access: ReviewAccess,
  ) {}

  onModuleInit(): void {
    this.jobs.work<EscalationJob>(ESCALATION_QUEUE, (job: JobRun<EscalationJob>) => this.escalateProject(job.data.projectId).then(() => undefined));
  }

  async onTick(): Promise<number> {
    const due = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from due_field_reviews(?)', [this.clock.now()]);
    for (const row of due) await this.jobs.send(null, ESCALATION_QUEUE, { orgId: row.org_id, projectId: row.project_id });
    return due.length;
  }

  /** مرحله‌های سررسیدهٔ یک پروژه: با `escalate` یک بار به تأییدکنندهٔ جایگزین؛ با `remind_only` یا پس از ارجاع فقط می‌مانند. */
  async escalateProject(projectId: string): Promise<number> {
    return this.em.transactional(async (tx) => {
      const rules = await this.rules.of(projectId, tx);
      if (rules.onDeadline !== 'escalate') return 0;
      const now = this.clock.now();
      const due = await tx.find(FieldReview, { projectId, decidedAt: null, dueAt: { $lte: now } }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const alternate = rules.alternateReviewerUserId ?? rules.managerUserId;
      let escalated = 0;
      for (const review of due) {
        const already = await tx.count(FieldReview, { itemId: review.itemId, stage: review.stage, decision: 'escalate' });
        // ارجاع فقط یک بار؛ تأییدکنندهٔ اصلی همان جایگزین است ← کاری نیست
        if (already > 0 || review.assigneeUserId === alternate) continue;
        Object.assign(review, { decision: 'escalate', decidedAt: now, escalatedToUserId: alternate });
        tx.create(FieldReview, {
          id: newId(),
          orgId: review.orgId,
          projectId,
          itemId: review.itemId,
          stage: review.stage,
          assigneeUserId: alternate,
          reviewerUserId: null,
          decision: null,
          note: null,
          requiredActions: null,
          dueAt: reviewDueAt(now, rules.reviewDeadlineHours, rules.calendar),
          decidedAt: null,
          escalatedToUserId: null,
        });
        escalated += 1;
      }
      if (escalated > 0) {
        await this.notifier.notify(tx, {
          orgId: rules.orgId,
          code: 'NT-APR-01',
          projectId,
          recipients: [alternate],
          subjectId: `escalation:${projectId}:${now.getTime()}`,
          title: `${toFaDigits(escalated)} آیتم پس از گذشت مهلت بررسی به شما ارجاع شد.`,
          body: rules.name,
          link: `/projects/${projectId}/reports`,
        });
        this.audit.record(tx, {
          actor: 'system',
          orgId: rules.orgId,
          action: 'field.reviews_escalated',
          entityType: 'Project',
          entityId: projectId,
          projectId,
          after: { escalated, to: alternate },
        });
      }
      return escalated;
    });
  }

  /** `POST /projects/:pid/approvers/:userId/remind` — یادآوری به تأییدکننده (W23). */
  async remind(projectId: string, userId: string): Promise<{ count: number }> {
    this.assertStage2(projectId);
    return this.em.transactional(async (tx) => {
      const open = await tx.count(FieldReview, { projectId, assigneeUserId: userId, decidedAt: null });
      if (open === 0) throw new DomainError('FIELD_DECISION_INVALID', 422, { reason: 'این تأییدکننده آیتم در انتظاری ندارد.' });
      const rules = await this.rules.of(projectId, tx);
      await this.notifier.notify(tx, {
        code: 'NT-APR-01',
        projectId,
        recipients: [userId],
        subjectId: `remind:${projectId}:${this.clock.now().getTime()}`,
        title: `یادآوری: ${toFaDigits(open)} آیتم گزارش کارگاه منتظر بررسی شماست.`,
        body: rules.name,
        link: `/projects/${projectId}/reports`,
      });
      return { count: open };
    });
  }

  /** `POST /projects/:pid/approvers/:userId/reassign {substituteUserId}` — واگذاری مرحله‌های باز به دیگری (W23). */
  async reassign(projectId: string, userId: string, substituteUserId: string): Promise<{ count: number }> {
    this.assertStage2(projectId);
    if (substituteUserId === userId) throw new DomainError('FIELD_DECISION_INVALID', 422, { reason: 'جایگزین باید شخص دیگری باشد.' });
    const member = (await this.memberships.memberships([substituteUserId])).find((entry) => entry.projectId === projectId);
    if (!member || !member.roles.some((role) => role === 'reviewer' || role === 'project_manager')) {
      throw new DomainError('FIELD_DECISION_INVALID', 422, { reason: 'جایگزین باید ناظر یا مدیر پروژهٔ همین پروژه باشد.' });
    }
    return this.em.transactional(async (tx) => {
      const rules = await this.rules.of(projectId, tx);
      const open = await tx.find(FieldReview, { projectId, assigneeUserId: userId, decidedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const now = this.clock.now();
      for (const review of open) {
        Object.assign(review, { assigneeUserId: substituteUserId, dueAt: reviewDueAt(now, rules.reviewDeadlineHours, rules.calendar) });
      }
      if (open.length > 0) {
        await this.notifier.notify(tx, {
          code: 'NT-APR-01',
          projectId,
          recipients: [substituteUserId],
          subjectId: `reassign:${projectId}:${now.getTime()}`,
          title: `${toFaDigits(open.length)} آیتم گزارش کارگاه برای بررسی به شما واگذار شد.`,
          body: rules.name,
          link: `/projects/${projectId}/reports`,
        });
        this.audit.record(tx, {
          action: 'field.reviews_reassigned',
          entityType: 'Project',
          entityId: projectId,
          projectId,
          before: { assignee: userId },
          after: { assignee: substituteUserId, count: open.length },
        });
      }
      return { count: open.length };
    });
  }

  private assertStage2(projectId: string): void {
    if (this.access.scope(projectId, 'report.approve.stage2') === null)
      throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'report.approve.stage2' });
  }
}
