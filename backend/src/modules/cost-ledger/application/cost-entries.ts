import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { Permission } from '@projeyar/shared';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { PeriodReads } from '../../computation/reads.js';
import { type CbsNode, PlanningService } from '../../planning/index.js';
import { ProjectCostCutoff } from '../../projects/index.js';
import { CostEntry, type CostSource } from '../domain/cost.entities.js';
import { checkTarget, CostRuleError, parseAmount, parseQuantity, projectAcceptsCosts } from '../domain/cost-rules.js';

// دفتر هزینه (F06؛ cost-ledger.md ۵، ۱۰). ردیف posted هرگز ویرایش یا حذف نمی‌شود (D02؛ تریگر پایگاه داده هم)؛ اصلاح =
// برگشتی + ردیف تازه در یک عمل. همهٔ کدها `cbs.view_amounts` هم می‌خواهند (۹). دورهٔ بسته (periodShifted) با F10.

export interface EntryInput {
  readonly cbsItemId: string;
  readonly wbsItemId?: string | null;
  readonly costDate: string;
  readonly amount: string | number;
  readonly quantity?: string | number | null;
  readonly source?: CostSource;
  readonly externalRef?: string | null;
  readonly documentNo?: string | null;
  readonly description?: string | null;
  readonly counterparty?: string | null;
}

export interface EntryFilter {
  readonly from?: string;
  readonly to?: string;
  readonly cbsItemId?: string;
  readonly costType?: string;
  readonly source?: CostSource;
  readonly status?: 'draft' | 'posted';
  readonly counterparty?: string;
}

const invalid = (reason: string) => new DomainError('COST_ENTRY_INVALID', 422, { reason });
const notAllowed = (reason: string) => new ConflictError('COST_NOT_ALLOWED', { reason });

@Injectable()
export class CostEntries {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly planning: PlanningService,
    private readonly cutoff: ProjectCostCutoff,
    private readonly periods: PeriodReads,
  ) {}

  /** `GET /projects/:pid/cost-entries` — فهرست با فیلتر و جمع (۸). */
  async list(projectId: string, filter: EntryFilter) {
    this.require(projectId, 'cost.view');
    const [project, items] = await Promise.all([this.cutoff.of(this.em, projectId), this.cbsItems(projectId)]);
    const rows = await this.em.find(
      CostEntry,
      {
        projectId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.cbsItemId ? { cbsItemId: filter.cbsItemId } : {}),
        ...(filter.source ? { source: filter.source } : {}),
        ...(filter.counterparty ? { counterparty: { $ilike: `%${filter.counterparty}%` } } : {}),
        ...(filter.from || filter.to ? { costDate: { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) } } : {}),
      },
      { orderBy: { costDate: 'desc', createdAt: 'desc' } },
    );
    const reversed = new Set(
      (await this.em.find(CostEntry, { projectId, reversesEntryId: { $ne: null } }, { fields: ['reversesEntryId'] })).map((row) => row.reversesEntryId),
    );
    const shown = filter.costType ? rows.filter((row) => items.get(row.cbsItemId)?.costType === filter.costType) : rows;
    const posted = await this.em.find(CostEntry, { projectId, status: 'posted' }, { fields: ['amount'] });
    const drafts = await this.em.find(CostEntry, { projectId, status: 'draft' }, { fields: ['amount'] });
    return {
      entries: shown.map((row) => this.view(row, items.get(row.cbsItemId), reversed.has(row.id))),
      totals: {
        postedAc: posted.reduce((sum, row) => sum + BigInt(row.amount), 0n).toString(),
        draftCount: drafts.length,
        draftAmount: drafts.reduce((sum, row) => sum + BigInt(row.amount), 0n).toString(),
      },
      costsCompleteThrough: project.costsCompleteThrough,
    };
  }

  /** `POST /projects/:pid/cost-entries {…, post}` — ذخیرهٔ پیش‌نویس یا «ذخیره و قطعی». تکراری نادیده گرفته می‌شود (۵.۵). */
  async create(projectId: string, input: EntryInput, post: boolean): Promise<{ entry: ReturnType<CostEntries['view']>; duplicate: boolean }> {
    const actor = this.require(projectId, 'cost.create');
    if (post) this.require(projectId, 'cost.post');
    return this.em.transactional(async (tx) => {
      const project = await this.cutoff.of(tx, projectId, true);
      const blocked = projectAcceptsCosts(project.status);
      if (blocked) throw notAllowed(blocked);
      const source = input.source ?? 'manual';
      const externalRef = input.externalRef?.trim() || null;
      if (externalRef) {
        const existing = await tx.findOne(CostEntry, { projectId, source, externalRef });
        if (existing) return { entry: this.view(existing, (await this.cbsItems(projectId)).get(existing.cbsItemId), false), duplicate: true };
      }
      const items = await this.cbsItems(projectId);
      const values = this.validated(items, input);
      const now = this.clock.now();
      const shifted = post && (await this.periodShifted(tx, projectId, values.costDate));
      const entry = tx.create(CostEntry, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        cbsItemId: input.cbsItemId,
        wbsItemId: input.wbsItemId ?? null,
        ...values,
        source,
        externalRef,
        documentNo: input.documentNo?.trim() || null,
        description: input.description?.trim() || null,
        counterparty: input.counterparty?.trim() || null,
        attachmentKeys: [],
        status: post ? 'posted' : 'draft',
        reversesEntryId: null,
        reversalReason: null,
        importBatchId: null,
        periodShifted: shifted,
        postedByUserId: post ? actor : null,
        postedAt: post ? now : null,
        createdByUserId: actor,
      });
      await tx.flush();
      if (post) await this.posted(tx, projectId, { entryIds: [entry.id] });
      return { entry: this.view(entry, items.get(entry.cbsItemId), false), duplicate: false };
    });
  }

  /** `POST /projects/:pid/cost-entries/post {ids[] | batchId}` — یک رویداد برای کل درخواست (AC-CST-08). */
  async post(projectId: string, input: { readonly ids?: readonly string[]; readonly batchId?: string | null }): Promise<{ posted: number }> {
    const actor = this.require(projectId, 'cost.post');
    if (!input.batchId && (!input.ids || input.ids.length === 0)) throw invalid('ردیف یا دسته‌ای برای قطعی کردن انتخاب کنید.');
    return this.em.transactional(async (tx) => {
      const project = await this.cutoff.of(tx, projectId, true);
      const blocked = projectAcceptsCosts(project.status);
      if (blocked) throw notAllowed(blocked);
      const drafts = await tx.find(
        CostEntry,
        { projectId, status: 'draft', ...(input.batchId ? { importBatchId: input.batchId } : { id: { $in: [...(input.ids ?? [])] } }) },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (drafts.length === 0) return { posted: 0 };
      // قلم ممکن است پس از ورود حذف شده باشد (۱۱.۲)
      const items = await this.cbsItems(projectId);
      for (const draft of drafts) {
        try {
          checkTarget(items.get(draft.cbsItemId), draft.quantity);
        } catch (error) {
          if (error instanceof CostRuleError) throw invalid(error.message);
          throw error;
        }
      }
      const now = this.clock.now();
      const closedEnd = await this.periods.lastClosedEnd(projectId, tx);
      for (const draft of drafts) {
        Object.assign(draft, { status: 'posted', postedByUserId: actor, postedAt: now, periodShifted: closedEnd !== null && draft.costDate <= closedEnd });
      }
      await tx.flush();
      await this.posted(
        tx,
        projectId,
        input.batchId ? { batchId: input.batchId, entryIds: drafts.map((row) => row.id) } : { entryIds: drafts.map((row) => row.id) },
      );
      return { posted: drafts.length };
    });
  }

  /** `DELETE /projects/:pid/cost-entries/:id` — فقط پیش‌نویس (۵.۱). */
  async removeDraft(projectId: string, entryId: string): Promise<{ removed: true }> {
    this.require(projectId, 'cost.create');
    await this.em.transactional(async (tx) => {
      const entry = await tx.findOne(CostEntry, { id: entryId, projectId });
      if (!entry) throw new NotFoundError('COST_ENTRY_NOT_FOUND');
      if (entry.status !== 'draft') throw notAllowed('ردیف قطعی حذف نمی‌شود؛ برای اصلاح از «اصلاح» (برگشت) استفاده کنید.');
      tx.remove(entry);
    });
    return { removed: true };
  }

  /** AC قطعی هر برگ CBS تا تاریخ (پیش‌فرض همه) — برای cbs (قفل‌های هزینهٔ ثبت‌شده) و W14. */
  async postedAcByItem(projectId: string, through?: string | null, em: EntityManager = this.em): Promise<Map<string, bigint>> {
    const rows = await em.find(
      CostEntry,
      { projectId, status: 'posted', ...(through ? { costDate: { $lte: through } } : {}) },
      { fields: ['cbsItemId', 'amount'] },
    );
    const result = new Map<string, bigint>();
    for (const row of rows) result.set(row.cbsItemId, (result.get(row.cbsItemId) ?? 0n) + BigInt(row.amount));
    return result;
  }

  /** ردیف‌های قطعی پروژه برای محاسبات (F10؛ cbs.md ۸): AC و مقدار مصرف‌شدهٔ هر قلم در هر تاریخ. */
  async postedFacts(
    projectId: string,
    em: EntityManager = this.em,
  ): Promise<{ readonly cbsItemId: string; readonly costDate: string; readonly amount: bigint; readonly quantity: number | null }[]> {
    const rows = await em.find(
      CostEntry,
      { projectId, status: 'posted' },
      { fields: ['id', 'cbsItemId', 'costDate', 'amount', 'quantity', 'reversesEntryId'] },
    );
    // ردیف برگشتی مقدار ندارد (cost-ledger.md ۵.۳)؛ مقدار ردیف برگشت‌خورده دیگر مصرف شمرده نمی‌شود
    const reversed = new Set(rows.map((row) => row.reversesEntryId).filter((id): id is string => !!id));
    return rows.map((row) => ({
      cbsItemId: row.cbsItemId,
      costDate: row.costDate,
      amount: BigInt(row.amount),
      quantity: row.quantity === null || row.quantity === undefined || reversed.has(row.id) ? null : Number(row.quantity),
    }));
  }

  /** ردیف قطعی با تاریخ تحقق در دورهٔ بسته: اثرش از دورهٔ باز بعد (cost-ledger.md ۷؛ F10 ۵.۷). */
  periodShifted(em: EntityManager, projectId: string, costDate: string): Promise<boolean> {
    return this.periods.inClosedPeriod(projectId, costDate, em);
  }

  /** ردیف‌های پیش‌نویس با تاریخ تحقق در بازه — پیش‌نمایش بستن دوره (F10 ۵.۸). */
  draftCount(projectId: string, from: string, to: string, em: EntityManager = this.em): Promise<number> {
    return em.count(CostEntry, { projectId, status: 'draft', costDate: { $gte: from, $lte: to } });
  }

  // ── درونی ──

  validated(items: ReadonlyMap<string, CbsNode>, input: EntryInput): { costDate: string; amount: string; quantity: string | null } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.costDate)) throw invalid('تاریخ تحقق نامعتبر است.');
    if (input.costDate > tehranClock(this.clock.now()).date) throw invalid('تاریخ تحقق نمی‌تواند در آینده باشد.');
    try {
      const target = items.get(input.cbsItemId);
      checkTarget(target ? { ...target, pricingMode: target.pricingMode } : undefined, input.quantity);
      return { costDate: input.costDate, amount: parseAmount(input.amount).toString(), quantity: parseQuantity(input.quantity) };
    } catch (error) {
      if (error instanceof CostRuleError) throw invalid(error.message);
      throw error;
    }
  }

  async cbsItems(projectId: string): Promise<Map<string, CbsNode>> {
    return new Map((await this.planning.currentContent(projectId)).cbs.map((item) => [item.id, item]));
  }

  view(row: CostEntry, item: CbsNode | undefined, reversed: boolean) {
    return {
      id: row.id,
      costDate: row.costDate,
      cbsItemId: row.cbsItemId,
      cbsCode: item?.code ?? '',
      cbsTitle: item?.title ?? '(قلم حذف‌شده)',
      costType: item?.costType ?? null,
      wbsItemId: row.wbsItemId ?? null,
      description: row.description ?? null,
      counterparty: row.counterparty ?? null,
      documentNo: row.documentNo ?? null,
      quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
      unit: item?.unit ?? null,
      amount: row.amount,
      source: row.source,
      status: row.status,
      reversed,
      reversesEntryId: row.reversesEntryId ?? null,
      periodShifted: row.periodShifted,
      importBatchId: row.importBatchId ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
    };
  }

  async posted(
    tx: EntityManager,
    projectId: string,
    payload: { readonly entryIds: readonly string[]; readonly batchId?: string; readonly reversedEntryId?: string },
  ): Promise<void> {
    await this.outbox.emit(tx, {
      type: 'CostEntryPosted',
      projectId,
      payload: { v: 1, count: payload.entryIds.length, ...payload, entryIds: payload.entryIds.slice(0, 1000) },
    });
  }

  /** کد دسترسی در پروژه و `cbs.view_amounts` (۹)؛ شناسهٔ کاربر. */
  require(projectId: string, code: Permission): string {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    if (access.isOrgAdmin) return actor.userId;
    const codes = access.projects.get(projectId);
    if (!codes?.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
    if (!codes.has('cbs.view_amounts')) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'cbs.view_amounts' });
    return actor.userId;
  }
}
