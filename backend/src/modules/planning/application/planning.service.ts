import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { IdentityService } from '../../identity/index.js';
import { type KeyMilestone, type PlanDraftSummaryView, ProjectPlanAccess, type ProjectPlanContext } from '../../projects/index.js';
import { baselineNodes } from '../domain/plan-columns.js';
import type { CbsNode, LinkNode, PlanNode } from '../domain/plan-node.js';
import { PlanVersion, type PlanVersionSource, WbsItem } from '../domain/plan.entities.js';
import { nextPlanNumber, PlanApplyStep } from './plan-apply.js';
import type { ApplyVerdict, DraftState } from './plan-types.js';
import { type CurrentContent, type CurrentItem, type PlanContent, PlanContentStore } from './plan-content.store.js';

// تنها دروازهٔ تغییر برنامه (F04؛ D05؛ 01 ۴: planning مالک PlanVersion، *Plan و جدول‌های جاری). wbs (و بعد cbs،
// msp، templates) فقط از راه saveDraft و apply می‌نویسند. قفل ردیف پروژه همهٔ ذخیره‌ها و اعمال‌های یک پروژه را
// پشت سر هم می‌کند (F04 ۵.۳ گام ۱–۲؛ ۱۳.۱).

export type { CurrentContent, CurrentItem, PlanContent } from './plan-content.store.js';

export type { ApplyVerdict, DraftState } from './plan-types.js';

export { MILESTONE_GROUP_TITLE } from '../domain/plan-columns.js';

@Injectable()
export class PlanningService {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly projects: ProjectPlanAccess,
    private readonly identity: IdentityService,
    private readonly store: PlanContentStore,
    private readonly applyStep: PlanApplyStep,
  ) {}

  // ── خواندن ──

  async draftState(projectId: string): Promise<DraftState> {
    let project = await this.projects.context(projectId);
    let draft = await this.em.findOne(PlanVersion, { projectId, status: 'draft' });
    // پروژهٔ پیش‌نویسی که پیش از این برش ساخته شده مبنای کاری ندارد (F04 ۳): همین حالا ساخته می‌شود
    if (!draft && project.status === 'draft') {
      await this.em.transactional(async (tx) => {
        const locked = await this.projects.context(projectId, tx);
        await this.createBaseline(tx, { orgId: locked.orgId, projectId, actorUserId: this.context.actor?.userId ?? null, milestones: locked.keyMilestones });
      });
      project = await this.projects.context(projectId);
      draft = await this.em.findOne(PlanVersion, { projectId, status: 'draft' });
    }
    const current = await this.store.current(this.em, projectId);
    const content = draft ? await this.store.ofVersion(this.em, draft.id) : current;
    return {
      project,
      draft,
      current: current.wbs,
      nodes: content.wbs,
      currentCbs: current.cbs,
      cbs: content.cbs,
      currentLinks: current.links,
      links: content.links,
    };
  }

  async currentItems(projectId: string, em: EntityManager = this.em): Promise<CurrentItem[]> {
    return [...(await this.store.current(em, projectId)).wbs];
  }

  /** محتوای جاری کامل (WBS، CBS، اتصال‌ها). */
  currentContent(projectId: string): Promise<CurrentContent> {
    return this.store.current(this.em, projectId);
  }

  /** عکس یک نسخه — تاریخچهٔ نرخ (cbs.md ۷.۴). */
  versionContent(versionId: string): Promise<PlanContent> {
    return this.store.ofVersion(this.em, versionId);
  }

  /** نسخه‌های اعمال‌شدهٔ پروژه به ترتیب اعمال. */
  appliedVersions(projectId: string): Promise<PlanVersion[]> {
    return this.em.find(PlanVersion, { projectId, status: 'applied' }, { orderBy: { appliedAt: 'asc' } });
  }

  /** ردیف یک قلم CBS در هر نسخهٔ اعمال‌شده، به ترتیب اعمال — تاریخچهٔ نرخ (cbs.md ۷.۴؛ D01). */
  async cbsItemHistory(projectId: string, cbsItemId: string): Promise<{ readonly version: PlanVersion; readonly item: CbsNode }[]> {
    return this.store.cbsItemHistory(this.em, await this.appliedVersions(projectId), cbsItemId);
  }

  /** خلاصهٔ نسخهٔ کاری برای سربرگ (PlanDraftSummary فرانت). */
  async summaryOf(draft: PlanVersion): Promise<PlanDraftSummaryView> {
    const people = await this.identity.personRefs(draft.lastSavedByUserId ? [draft.lastSavedByUserId] : []);
    return {
      versionId: draft.id,
      kind: draft.kind,
      number: draft.number ?? (await nextPlanNumber(this.em, draft.projectId)),
      draftRevision: draft.draftRevision,
      changeCount: draft.changeCount,
      lastSavedAt: draft.lastSavedAt?.toISOString() ?? null,
      lastSavedBy: draft.lastSavedByUserId ? (people.get(draft.lastSavedByUserId) ?? null) : null,
    };
  }

  // ── نوشتن ──

  /**
   * ذخیرهٔ نسخهٔ کاری (F04 ۳). بی نسخهٔ کاری در پروژهٔ فعال یا متوقف بازنگری کاری تازه ساخته می‌شود؛ در پروژهٔ
   * پیش‌نویس جدول جاری همان لحظه همگام می‌شود (AC-PV-03) و در پروژهٔ فعال دست نمی‌خورد (AC-PV-02).
   */
  async saveDraft(
    projectId: string,
    input: {
      readonly expectedRevision: number;
      /** هر بخش نیامده همان محتوای فعلی نسخهٔ کاری (یا جاری برای نسخهٔ تازه) می‌ماند. */
      readonly nodes?: readonly PlanNode[];
      readonly cbs?: readonly CbsNode[];
      readonly links?: readonly LinkNode[];
      readonly changeCount: number;
      readonly source?: PlanVersionSource;
    },
  ): Promise<PlanVersion> {
    const actor = this.actor();
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      this.assertEditable(project);
      let draft = await tx.findOne(PlanVersion, { projectId, status: 'draft' });
      if (!draft && project.status === 'draft') {
        await this.createBaseline(tx, { orgId: project.orgId, projectId, actorUserId: actor.userId, milestones: project.keyMilestones });
        draft = await tx.findOneOrFail(PlanVersion, { projectId, status: 'draft' });
      }
      let base: PlanContent | null = null;
      if (!draft) {
        // بازنگری کاری تازه از روی جاری (F04 ۳)
        base = await this.store.current(tx, projectId);
        draft = tx.create(PlanVersion, {
          id: newId(),
          orgId: project.orgId,
          projectId,
          kind: 'revision',
          number: null,
          status: 'draft',
          source: input.source ?? 'manual_edit',
          note: null,
          draftRevision: 0,
          changeCount: 0,
          lastSavedAt: null,
          lastSavedByUserId: null,
          appliedByUserId: null,
          appliedAt: null,
          discardedAt: null,
          createdByUserId: actor.userId,
        });
        await tx.flush();
      }
      if (draft.draftRevision !== input.expectedRevision) throw new ConflictError('PLAN_DRAFT_STALE', { draftRevision: draft.draftRevision });

      base ??= await this.store.ofVersion(tx, draft.id);
      const content: PlanContent = { wbs: input.nodes ?? base.wbs, cbs: input.cbs ?? base.cbs, links: input.links ?? base.links };
      await this.store.writeVersion(tx, draft, content);
      // چند منبع در یک بازنگری کاری ← manual_edit (F04 ۸)
      if (input.source && draft.source !== input.source && draft.kind === 'revision') draft.source = 'manual_edit';
      draft.draftRevision += 1;
      draft.changeCount = input.changeCount;
      draft.lastSavedAt = now;
      draft.lastSavedByUserId = actor.userId;
      if (project.status === 'draft') await this.store.syncCurrent(tx, project, content, null, now);
      return draft;
    });
  }

  /** اعمال بازنگری کاری (F04 ۵.۳) در یک تراکنش. مبنای پروژهٔ پیش‌نویس با فعال‌سازی (F02 ۸.۱) اعمال می‌شود. */
  async apply(
    projectId: string,
    input: { readonly expectedRevision: number; readonly note: string },
    check: (state: { readonly project: ProjectPlanContext; readonly draft: PlanContent; readonly current: CurrentContent }) => Promise<ApplyVerdict>,
  ): Promise<{ versionId: string; number: number }> {
    const actor = this.actor();
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status !== 'active' && project.status !== 'paused') throw new ConflictError('PLAN_APPLY_NOT_ALLOWED', { status: project.status });
      const draft = await tx.findOne(PlanVersion, { projectId, status: 'draft' });
      if (!draft || draft.kind !== 'revision') throw new NotFoundError('PLAN_DRAFT_NOT_FOUND');
      if (draft.draftRevision !== input.expectedRevision) throw new ConflictError('PLAN_DRAFT_STALE', { draftRevision: draft.draftRevision });
      const note = input.note.trim();
      if (note.length < 3) throw new DomainError('PLAN_NOTE_REQUIRED', 422);

      const content = await this.store.ofVersion(tx, draft.id);
      const current = await this.store.current(tx, projectId);
      const verdict = await check({ project, draft: content, current });
      if (verdict.error) throw new DomainError('PLAN_DRAFT_INVALID', 422, { message: verdict.error });
      if (verdict.changeCount === 0) throw new DomainError('PLAN_DRAFT_EMPTY', 422);
      if (verdict.source) draft.source = verdict.source;
      return this.applyStep.finish(tx, project, draft, content, verdict, note, actor.userId, now);
    });
  }

  /** اعمال مبنا درون تراکنش فعال‌سازی (F02 ۸.۱) — گام‌ها در PlanApplyStep. */
  applyBaseline(tx: EntityManager, projectId: string, check: Parameters<PlanApplyStep['applyBaseline']>[2]): Promise<{ versionId: string }> {
    return this.applyStep.applyBaseline(tx, projectId, check, this.actor().userId, this.clock.now());
  }

  /** بازنگری بودجهٔ تأییدشده (cbs.md ۷.۲): بازنگری مستقل `budget_revision`، همان لحظه اعمال؛ بازنگری کاری باز ← مسدود (AC-CBS-08). */
  async applyRevision(
    projectId: string,
    input: { readonly note: string; readonly source: PlanVersionSource },
    build: (state: {
      readonly project: ProjectPlanContext;
      readonly current: CurrentContent;
    }) => Promise<{ readonly content: PlanContent; readonly verdict: ApplyVerdict }>,
    /** درون همان تراکنش پس از اعمال (مثلاً بستن درخواست بازنگری). */
    onApplied?: (tx: EntityManager, applied: { readonly versionId: string; readonly number: number }) => Promise<void>,
  ): Promise<{ versionId: string; number: number }> {
    const actor = this.actor();
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status !== 'active' && project.status !== 'paused') throw new ConflictError('PLAN_APPLY_NOT_ALLOWED', { status: project.status });
      const open = await tx.findOne(PlanVersion, { projectId, status: 'draft' });
      if (open) throw new ConflictError('PLAN_DRAFT_OPEN', { number: open.number ?? (await nextPlanNumber(tx, projectId)) });
      const current = await this.store.current(tx, projectId);
      const { content, verdict } = await build({ project, current });
      if (verdict.error) throw new DomainError('PLAN_DRAFT_INVALID', 422, { message: verdict.error });
      const version = tx.create(PlanVersion, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        kind: 'revision',
        number: null,
        status: 'draft',
        source: input.source,
        note: null,
        draftRevision: 1,
        changeCount: verdict.changeCount,
        lastSavedAt: now,
        lastSavedByUserId: actor.userId,
        appliedByUserId: null,
        appliedAt: null,
        discardedAt: null,
        createdByUserId: actor.userId,
      });
      await tx.flush();
      await this.store.writeVersion(tx, version, content);
      const applied = await this.applyStep.finish(tx, project, version, content, verdict, input.note.trim(), actor.userId, now);
      if (onApplied) await onApplied(tx, applied);
      return applied;
    });
  }

  /** کنار گذاشتن بازنگری کاری (F04 ۵.۴)؛ جدول جاری دست نمی‌خورد. */
  async discard(projectId: string): Promise<{ versionId: string; status: 'discarded' }> {
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      await this.projects.context(projectId, tx);
      const draft = await tx.findOne(PlanVersion, { projectId, status: 'draft' });
      if (!draft) throw new NotFoundError('PLAN_DRAFT_NOT_FOUND');
      if (draft.kind === 'baseline') throw new ConflictError('PLAN_BASELINE_NOT_DISCARDABLE');
      draft.status = 'discarded';
      draft.discardedAt = now;
      this.audit.record(tx, {
        action: 'plan.draft_discarded',
        entityType: 'PlanVersion',
        entityId: draft.id,
        projectId,
        before: { status: 'draft', changeCount: draft.changeCount },
        after: { status: 'discarded' },
      });
      return { versionId: draft.id, status: 'discarded' as const };
    });
  }

  /** یادداشت وضعیت (wbs.md ۴.۱): عملیاتی و بی نسخه، روی جدول جاری. */
  async setStatusNote(projectId: string, itemId: string, note: string | null): Promise<{ id: string; statusNote: string | null }> {
    return this.em.transactional(async (tx) => {
      const item = await tx.findOne(WbsItem, { id: itemId, projectId, removedAt: null });
      if (!item) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
      const before = item.statusNote ?? null;
      item.statusNote = note?.trim() || null;
      if (before !== item.statusNote) {
        this.audit.record(tx, {
          action: 'wbs.status_note_changed',
          entityType: 'WbsItem',
          entityId: item.id,
          projectId,
          before: { statusNote: before },
          after: { statusNote: item.statusNote },
        });
      }
      return { id: item.id, statusNote: item.statusNote };
    });
  }

  /**
   * مبنای کاری (F04 ۳؛ project-setup.md ۵.۲): نسخهٔ ۰ با منبع wizard؛ نقاط عطف کلیدی زیر گروه سطح اول «نقاط عطف
   * کلیدی» با وزن ۰ تا پیشرفت را عوض نکنند (فرزندان هم ۰ — wbs.md ۱۳.۹). تکرار بی‌اثر است.
   */
  async createBaseline(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly projectId: string;
      readonly actorUserId: string | null;
      readonly milestones: readonly KeyMilestone[];
      /** محتوای ساخته‌شده از قالب (templates.md ۵.۳ گام ۷؛ منبع template)؛ گروه نقاط عطف پس از ریشه‌های آن. */
      readonly content?: PlanContent;
    },
  ): Promise<void> {
    const existing = await tx.count(PlanVersion, { projectId: input.projectId, kind: 'baseline', status: { $ne: 'discarded' } });
    if (existing > 0) return;
    const version = tx.create(PlanVersion, {
      id: newId(),
      orgId: input.orgId,
      projectId: input.projectId,
      kind: 'baseline',
      number: 0,
      status: 'draft',
      source: input.content ? 'template' : 'wizard',
      note: null,
      draftRevision: 0,
      changeCount: 0,
      lastSavedAt: null,
      lastSavedByUserId: null,
      appliedByUserId: null,
      appliedAt: null,
      discardedAt: null,
      createdByUserId: input.actorUserId,
    });
    await tx.flush();
    const roots = input.content ? input.content.wbs.filter((node) => node.parentId === null).length : 0;
    const content: PlanContent = {
      wbs: [...(input.content?.wbs ?? []), ...baselineNodes(input.milestones, newId, roots)],
      cbs: [...(input.content?.cbs ?? [])],
      links: [...(input.content?.links ?? [])],
    };
    await this.store.writeVersion(tx, version, content);
    const project = await this.projects.context(input.projectId, tx);
    await this.store.syncCurrent(tx, project, content, null, this.clock.now());
  }

  // ── درونی ──

  private assertEditable(project: ProjectPlanContext): void {
    if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
