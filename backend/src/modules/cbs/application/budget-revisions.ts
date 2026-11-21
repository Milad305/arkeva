import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { quantityScaled } from '../../computation/index.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { IdentityService, MembershipPort } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { type CbsNode, type CurrentContent, type DraftState, PlanningService } from '../../planning/index.js';
import { ProjectPlanAccess } from '../../projects/index.js';
import { WbsDraftService } from '../../wbs/index.js';
import { bacTotal, cbsBudgetTotal } from '../domain/cbs-checks.js';
import { applyCbsOps, type CbsOp, NO_COSTS } from '../domain/cbs-ops.js';
import { toCbsForest, toCbsNodes } from '../domain/cbs-tree.js';
import {
  BudgetRevisionRequest,
  REVISION_FIELDS,
  type RevisionField,
  type RevisionStatus,
  type StoredRevisionChange,
} from '../domain/budget-revision.entity.js';

// درخواست بازنگری بودجه (cbs.md ۷.۲–۷.۳؛ OD-11؛ فرم G14). درخواست‌دهنده (`cbs.request_revision`) تغییر نرخ، مقدار
// برآورد یا مبلغ مقطوع برگ‌های CBS جاری را با دلیل می‌فرستد؛ مدیر پروژه (`cbs.approve_revision`) تأیید می‌کند و
// نسخهٔ «بازنگری بودجه» همان لحظه ساخته و اعمال می‌شود (AC-CBS-05)؛ بازنگری کاری باز مسدود می‌کند (AC-CBS-08).

const FIELD_LABELS: Record<RevisionField, string> = { unitRate: 'نرخ واحد', estimatedQuantity: 'مقدار برآورد', lumpSumAmount: 'مبلغ مقطوع' };

export interface RevisionChangeInput {
  readonly cbsItemId: string;
  readonly field: RevisionField;
  readonly to: string;
}

const invalid = (reason: string) => new DomainError('BUDGET_REVISION_INVALID', 422, { reason });

/** مقدار تازه به شکل ذخیره: ریال یا مقدار دهدهی چهار رقمی. */
function normalizeTo(field: RevisionField, raw: string): string {
  const text = raw.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[,٬\s]/g, '');
  if (field === 'estimatedQuantity') {
    const scaled = quantityScaled(text);
    if (scaled === null || scaled <= 0n) throw invalid('مقدار برآورد تازه باید عددی بزرگ‌تر از صفر با حداکثر چهار رقم اعشار باشد.');
    return `${scaled / 10_000n}.${(scaled % 10_000n).toString().padStart(4, '0')}`;
  }
  if (!/^\d+$/.test(text) || BigInt(text) <= 0n) throw invalid(`${FIELD_LABELS[field]} تازه باید عددی بزرگ‌تر از صفر به ریال باشد.`);
  return BigInt(text).toString();
}

function valueOf(item: CbsNode, field: RevisionField): string | null {
  return field === 'unitRate' ? item.unitRate : field === 'estimatedQuantity' ? item.estimatedQuantity : item.lumpSumAmount;
}

/** تغییرهای درخواست ← عملیات setPricing روی CBS جاری. */
function opsOf(changes: readonly { readonly cbsItemId: string; readonly field: RevisionField; readonly to: string }[], cbs: readonly CbsNode[]): CbsOp[] {
  const byId = new Map(cbs.map((node) => [node.id, node]));
  return changes.map((change) => {
    const item = byId.get(change.cbsItemId) as CbsNode;
    if (change.field === 'unitRate') return { type: 'setPricing', id: item.id, pricing: 'unit_rate', rate: change.to };
    if (change.field === 'estimatedQuantity') return { type: 'setPricing', id: item.id, pricing: 'unit_rate', qty: change.to };
    return { type: 'setPricing', id: item.id, pricing: 'lump_sum', lump: change.to };
  });
}

@Injectable()
export class BudgetRevisions {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly planning: PlanningService,
    private readonly projects: ProjectPlanAccess,
    private readonly wbs: WbsDraftService,
    private readonly identity: IdentityService,
    private readonly memberships: MembershipPort,
    private readonly notifier: Notifier,
  ) {}

  /** `GET /projects/:pid/budget-revisions?status=pending` */
  async list(projectId: string, status?: RevisionStatus) {
    await this.projects.context(projectId);
    const rows = await this.em.find(BudgetRevisionRequest, { projectId, ...(status ? { status } : {}) }, { orderBy: { createdAt: 'desc' } });
    return this.views(rows);
  }

  /** `POST /projects/:pid/budget-revisions` (cbs.md ۷.۳). */
  async create(projectId: string, input: { readonly reason: string; readonly changes: readonly RevisionChangeInput[] }) {
    const actor = this.actor();
    const reason = input.reason.trim();
    const created = await this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status === 'draft') {
        throw new ConflictError('BUDGET_REVISION_NOT_ALLOWED', {
          reason: 'در پروژهٔ پیش‌نویس نرخ و مقدار مستقیم در حالت ویرایش CBS عوض می‌شوند و بازنگری لازم نیست.',
        });
      }
      if (project.status !== 'active' && project.status !== 'paused') {
        throw new ConflictError('BUDGET_REVISION_NOT_ALLOWED', { reason: 'بودجهٔ پروژهٔ تمام‌شده یا بایگانی‌شده بازنگری نمی‌شود.' });
      }
      if (reason.length < 5) throw invalid('دلیل بازنگری را بنویسید؛ مدیر پروژه بر اساس آن تصمیم می‌گیرد.');
      if (input.changes.length === 0) throw invalid('دست‌کم یک تغییر لازم است.');
      if (input.changes.length > 200) throw invalid('هر درخواست حداکثر ۲۰۰ تغییر دارد.');

      const current = await this.planning.currentContent(projectId);
      const byId = new Map(current.cbs.map((node) => [node.id, node]));
      const seen = new Set<string>();
      const changes: StoredRevisionChange[] = input.changes.map((change) => {
        const item = byId.get(change.cbsItemId);
        if (!item || !item.isLeaf) throw invalid('بازنگری فقط روی قلم برگ CBS جاری است.');
        if (!REVISION_FIELDS.includes(change.field)) throw invalid('فیلد بازنگری نامعتبر است.');
        const allowed: readonly RevisionField[] = item.pricingMode === 'lump_sum' ? ['lumpSumAmount'] : ['unitRate', 'estimatedQuantity'];
        if (!allowed.includes(change.field))
          throw invalid(`قلم ${item.code} ${item.pricingMode === 'lump_sum' ? 'مقطوع است و فقط مبلغش' : 'نرخ واحد است و فقط نرخ و مقدارش'} بازنگری می‌شود.`);
        const key = `${item.id}|${change.field}`;
        if (seen.has(key)) throw invalid(`${FIELD_LABELS[change.field]} قلم ${item.code} دو بار آمده است.`);
        seen.add(key);
        const to = normalizeTo(change.field, change.to);
        const from = valueOf(item, change.field) ?? '';
        if (from === to || (change.field === 'estimatedQuantity' && Number(from) === Number(to)))
          throw invalid(`${FIELD_LABELS[change.field]} تازهٔ قلم ${item.code} همان مقدار فعلی است.`);
        return { cbsItemId: item.id, field: change.field, from, to, cbsCode: item.code, cbsTitle: item.title };
      });
      const after = this.revised(current, changes);
      const request = tx.create(BudgetRevisionRequest, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        requestedByUserId: actor.userId,
        reason,
        changes,
        impact: {
          budgetChange: (cbsBudgetTotal(after.cbs) - cbsBudgetTotal(current.cbs)).toString(),
          bacChange: (bacTotal(after.cbs, after.links) - bacTotal(current.cbs, current.links)).toString(),
        },
        status: 'pending',
        decidedByUserId: null,
        decidedAt: null,
        decisionNote: null,
        resultVersionId: null,
      });
      await tx.flush();
      this.audit.record(tx, {
        action: 'cbs.revision_requested',
        entityType: 'BudgetRevisionRequest',
        entityId: request.id,
        projectId,
        after: { changeCount: changes.length },
        reason,
      });
      // NT-BUD-01 به مدیر پروژه (notifications.md ۶)
      const managers = (await this.memberships.memberships())
        .filter((entry) => entry.projectId === projectId && entry.roles.includes('project_manager'))
        .map((entry) => entry.userId)
        .filter((userId) => userId !== actor.userId);
      const people = await this.identity.personRefs([actor.userId]);
      await this.notifier.notify(tx, {
        code: 'NT-BUD-01',
        projectId,
        recipients: managers,
        subjectId: request.id,
        title: `${people.get(actor.userId)?.fullName ?? 'یک همکار'} درخواست بازنگری بودجه ثبت کرد: ${reason}`,
        body: `${toFaDigits(changes.length)} تغییر در ${project.name}.`,
        link: `/projects/${projectId}/cbs`,
      });
      return request;
    });
    return (await this.views([created]))[0];
  }

  /** `POST /projects/:pid/budget-revisions/:id/approve` — نسخهٔ «بازنگری بودجه» ساخته و اعمال می‌شود (۷.۲). */
  async approve(projectId: string, requestId: string, note: string) {
    const actor = this.actor();
    const request = await this.pending(projectId, requestId, this.em);
    const decisionNote = note.trim() || null;
    await this.planning.applyRevision(
      projectId,
      { note: decisionNote ? `${request.reason} — ${decisionNote}` : request.reason, source: 'budget_revision' },
      ({ project, current }) => {
        const missing = request.changes.find((change) => !current.cbs.some((node) => node.id === change.cbsItemId && node.isLeaf));
        if (missing) throw invalid(`قلم ${missing.cbsCode} دیگر در CBS جاری نیست؛ درخواست را رد کنید.`);
        const content = this.revised(current, request.changes);
        const state: DraftState = {
          project,
          draft: null,
          current: current.wbs,
          nodes: current.wbs,
          currentCbs: current.cbs,
          cbs: content.cbs,
          currentLinks: current.links,
          links: content.links,
        };
        const assessed = this.wbs.assess(state);
        if (assessed.changeCount === 0) throw invalid('این درخواست دیگر چیزی را عوض نمی‌کند؛ آن را رد کنید.');
        const error = assessed.validation.errors[0]?.message ?? null;
        return Promise.resolve({
          content: assessed.content,
          verdict: {
            error: error ? `با این تغییر نسخه خطا می‌گیرد: ${error}` : null,
            changeCount: assessed.changeCount,
            summary: { changed: request.changes.length },
            plannedStart: project.plannedStart,
            plannedFinish: project.plannedFinish,
          },
        });
      },
      async (tx, applied) => {
        const locked = await this.pending(projectId, requestId, tx);
        Object.assign(locked, {
          status: 'applied',
          decidedByUserId: actor.userId,
          decidedAt: this.clock.now(),
          decisionNote,
          resultVersionId: applied.versionId,
        });
        this.audit.record(tx, {
          action: 'cbs.revision_applied',
          entityType: 'BudgetRevisionRequest',
          entityId: locked.id,
          projectId,
          after: { status: 'applied', versionNumber: applied.number },
          reason: decisionNote,
        });
        await this.decided(tx, locked, true);
      },
    );
    return this.one(projectId, requestId);
  }

  /** `POST /projects/:pid/budget-revisions/:id/reject` */
  async reject(projectId: string, requestId: string, note: string) {
    const actor = this.actor();
    const decisionNote = note.trim();
    if (decisionNote.length < 3) throw invalid('دلیل رد را بنویسید تا درخواست‌دهنده بداند چه کند.');
    await this.em.transactional(async (tx) => {
      const request = await this.pending(projectId, requestId, tx);
      Object.assign(request, { status: 'rejected', decidedByUserId: actor.userId, decidedAt: this.clock.now(), decisionNote });
      this.audit.record(tx, {
        action: 'cbs.revision_rejected',
        entityType: 'BudgetRevisionRequest',
        entityId: request.id,
        projectId,
        after: { status: 'rejected' },
        reason: decisionNote,
      });
      await this.decided(tx, request, false);
    });
    return this.one(projectId, requestId);
  }

  // ── درونی ──

  /** CBS و اتصال‌های جاری پس از تغییرهای درخواست (تغییر نرخ: مقدار اتصال ثابت، زیربودجه با نرخ تازه؛ ۴.۱). */
  private revised(current: CurrentContent, changes: readonly StoredRevisionChange[]) {
    const forest = toCbsForest(current.cbs);
    const ctx = { costs: NO_COSTS, live: true, canReviseBudget: true, links: [...current.links] };
    const errors = applyCbsOps(forest, opsOf(changes, current.cbs), ctx);
    if (errors[0]) throw invalid(errors[0].message);
    return { cbs: toCbsNodes(forest), links: ctx.links };
  }

  private async pending(projectId: string, requestId: string, em: EntityManager): Promise<BudgetRevisionRequest> {
    const request = await em.findOne(BudgetRevisionRequest, { id: requestId, projectId }, em.isInTransaction() ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {});
    if (!request) throw new NotFoundError('BUDGET_REVISION_NOT_FOUND');
    if (request.status !== 'pending') throw new ConflictError('BUDGET_REVISION_DECIDED', { status: request.status });
    return request;
  }

  /** NT-BUD-02 به درخواست‌دهنده (notifications.md ۶). */
  private async decided(tx: EntityManager, request: BudgetRevisionRequest, approved: boolean): Promise<void> {
    await this.notifier.notify(tx, {
      code: 'NT-BUD-02',
      projectId: request.projectId,
      recipients: [request.requestedByUserId].filter((userId) => userId !== this.context.actor?.userId),
      subjectId: request.id,
      title: `درخواست بازنگری بودجهٔ شما ${approved ? 'تأیید و اعمال' : 'رد'} شد.`,
      body: request.decisionNote ?? '',
      link: `/projects/${request.projectId}/cbs`,
    });
  }

  private async one(projectId: string, requestId: string) {
    const request = await this.em.findOneOrFail(BudgetRevisionRequest, { id: requestId, projectId }, { refresh: true });
    return (await this.views([request]))[0];
  }

  private async views(rows: readonly BudgetRevisionRequest[]) {
    const people = await this.identity.personRefs(rows.flatMap((row) => [row.requestedByUserId, ...(row.decidedByUserId ? [row.decidedByUserId] : [])]));
    const ref = (id: string | null | undefined) => {
      if (!id) return null;
      const person = people.get(id);
      return { id, fullName: person?.fullName ?? '' };
    };
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      requestedBy: ref(row.requestedByUserId),
      requestedAt: row.createdAt.toISOString(),
      reason: row.reason,
      // نرخ و مبلغ مقطوع مبلغ‌اند؛ مقدار برآورد نه (D11؛ AC-CBS-06)
      changes: row.changes.map((change) =>
        change.field === 'estimatedQuantity' || this.canViewAmounts(row.projectId) ? { ...change } : { ...change, from: null, to: null },
      ),
      impact: { budgetChange: row.impact.budgetChange, bacChange: row.impact.bacChange },
      status: row.status,
      decidedBy: ref(row.decidedByUserId),
      decidedAt: row.decidedAt?.toISOString() ?? null,
      decisionNote: row.decisionNote ?? null,
      resultVersionId: row.resultVersionId ?? null,
    }));
  }

  private canViewAmounts(projectId: string): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false));
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
