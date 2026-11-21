import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { ProjectPlanAccess, type ProjectPlanContext } from '../../projects/index.js';
import { PlanVersion } from '../domain/plan.entities.js';
import { type CurrentContent, type PlanContent, PlanContentStore } from './plan-content.store.js';
import type { ApplyVerdict } from './plan-types.js';

// گام‌های پایانی اعمال نسخه (F04 ۵.۳ گام ۴ تا ۱۰) — مشترک اعمال بازنگری کاری و بازنگری بودجه (cbs.md ۷.۲).

const REMOVED_IDS_IN_EVENT = 1000;

/** شمارهٔ بعدی نسخهٔ اعمال‌شده؛ زیر قفل ردیف پروژه پیوسته و بی تکرار (AC-PV-05). */
export async function nextPlanNumber(em: EntityManager, projectId: string): Promise<number> {
  const applied = await em.find(PlanVersion, { projectId, status: 'applied' }, { fields: ['number'], orderBy: { number: 'desc' }, limit: 1 });
  return (applied[0]?.number ?? 0) + 1;
}

@Injectable()
export class PlanApplyStep {
  constructor(
    private readonly store: PlanContentStore,
    private readonly projects: ProjectPlanAccess,
    private readonly outbox: Outbox,
    private readonly audit: Audit,
  ) {}

  /**
   * اعمال مبنا هنگام فعال‌سازی پروژه (F02 ۸.۱؛ F04 ۳) درون تراکنش فعال‌سازی: اعتبارسنجی دوباره، نسخهٔ ۰ اعمال‌شده،
   * جاری، و مبنا/جاری/مرجع PV پروژه. رویداد مال فعال‌سازی است (ProjectActivated)، نه PlanVersionApplied.
   */
  async applyBaseline(
    tx: EntityManager,
    projectId: string,
    check: (state: { readonly project: ProjectPlanContext; readonly draft: PlanContent; readonly current: CurrentContent }) => Promise<ApplyVerdict>,
    actorUserId: string,
    now: Date,
  ): Promise<{ versionId: string }> {
    const project = await this.projects.context(projectId, tx);
    if (project.status !== 'draft') throw new ConflictError('PLAN_APPLY_NOT_ALLOWED', { status: project.status });
    const draft = await tx.findOne(PlanVersion, { projectId, status: 'draft', kind: 'baseline' });
    if (!draft) throw new NotFoundError('PLAN_DRAFT_NOT_FOUND');
    const content = await this.store.ofVersion(tx, draft.id);
    const verdict = await check({ project, draft: content, current: await this.store.current(tx, projectId) });
    if (verdict.error) throw new DomainError('PROJECT_ACTIVATION_BLOCKED', 422, { message: verdict.error });
    Object.assign(draft, { status: 'applied', number: 0, note: 'برنامهٔ مبنا', appliedAt: now, appliedByUserId: actorUserId, changeCount: verdict.changeCount });
    await this.store.syncCurrent(tx, project, content, null, now);
    await this.projects.recordApplied(tx, projectId, {
      versionId: draft.id,
      kind: 'baseline',
      plannedStart: verdict.plannedStart,
      plannedFinish: verdict.plannedFinish,
    });
    this.audit.record(tx, {
      action: 'plan.baseline_applied',
      entityType: 'PlanVersion',
      entityId: draft.id,
      projectId,
      after: { number: 0, kind: 'baseline', ...verdict.summary },
    });
    return { versionId: draft.id };
  }

  /** گام‌های ۴ تا ۱۰ اعمال (F04 ۵.۳). */
  async finish(
    tx: EntityManager,
    project: ProjectPlanContext,
    version: PlanVersion,
    content: PlanContent,
    verdict: ApplyVerdict,
    note: string,
    actorUserId: string,
    now: Date,
  ): Promise<{ versionId: string; number: number }> {
    const number = await nextPlanNumber(tx, project.id);
    version.status = 'applied';
    version.number = number;
    version.note = note;
    version.appliedAt = now;
    version.appliedByUserId = actorUserId;
    version.changeCount = verdict.changeCount;
    const removedIds = await this.store.syncCurrent(tx, project, content, version.id, now);
    await this.projects.recordApplied(tx, project.id, {
      versionId: version.id,
      kind: 'revision',
      plannedStart: verdict.plannedStart,
      plannedFinish: verdict.plannedFinish,
    });
    // تبدیل روش برگ دارای پیشرفت (گام ۸) با سرویس F09 در برش گزارش کارگاه
    await this.outbox.emit(tx, {
      type: 'PlanVersionApplied',
      projectId: project.id,
      payload: {
        v: 1,
        versionId: version.id,
        number,
        kind: version.kind,
        source: version.source,
        ...verdict.summary,
        removedItemIds: removedIds.slice(0, REMOVED_IDS_IN_EVENT),
        removedItemIdsTruncated: removedIds.length > REMOVED_IDS_IN_EVENT,
      },
    });
    this.audit.record(tx, {
      action: 'plan.version_applied',
      entityType: 'PlanVersion',
      entityId: version.id,
      projectId: project.id,
      after: { number, kind: version.kind, source: version.source, ...verdict.summary },
      reason: note,
    });
    return { versionId: version.id, number };
  }
}
