import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { ProjectCostCutoff } from '../../projects/index.js';
import { CostEntry } from '../domain/cost.entities.js';
import { projectAcceptsCosts } from '../domain/cost-rules.js';
import { CostEntries, type EntryInput } from './cost-entries.js';

// اصلاح ردیف قطعی (برگشت + ردیف تازه؛ cost-ledger.md ۵.۲؛ AC-CST-02) و تاریخ کامل بودن هزینه‌ها (OD-19؛ ۵.۶). هر دو در
// ممیزی ثبت می‌شوند (۹).

const invalid = (reason: string) => new DomainError('COST_ENTRY_INVALID', 422, { reason });
const notAllowed = (reason: string) => new ConflictError('COST_NOT_ALLOWED', { reason });

@Injectable()
export class CostCorrections {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly audit: Audit,
    private readonly cutoff: ProjectCostCutoff,
    private readonly entries: CostEntries,
  ) {}

  /** `POST /projects/:pid/cost-entries/:id/correct {reason, replacement?}` — برگشت (+ ردیف درست) در یک عمل (۵.۲؛ AC-CST-02). */
  async correct(projectId: string, entryId: string, input: { readonly reason: string; readonly replacement?: EntryInput | null }) {
    const actor = this.entries.require(projectId, 'cost.reverse');
    const reason = input.reason.trim();
    if (reason.length < 3) throw invalid('دلیل اصلاح لازم است.');
    return this.em.transactional(async (tx) => {
      const project = await this.cutoff.of(tx, projectId, true);
      const original = await tx.findOne(CostEntry, { id: entryId, projectId });
      if (!original) throw new NotFoundError('COST_ENTRY_NOT_FOUND');
      if (original.status !== 'posted') throw notAllowed('پیش‌نویس برگشت نمی‌خورد؛ خودش را ویرایش یا حذف کنید.');
      if (original.reversesEntryId) throw notAllowed('ردیف برگشتی خودش برگشت‌پذیر نیست.');
      if ((await tx.count(CostEntry, { reversesEntryId: original.id })) > 0) throw notAllowed('این ردیف پیش‌تر برگشت خورده است.');
      const now = this.clock.now();
      const reversalShifted = await this.entries.periodShifted(tx, projectId, original.costDate);
      const reversal = tx.create(CostEntry, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        cbsItemId: original.cbsItemId,
        wbsItemId: original.wbsItemId ?? null,
        costDate: original.costDate,
        amount: (-BigInt(original.amount)).toString(),
        quantity: null,
        source: original.source,
        externalRef: null,
        documentNo: original.documentNo ?? null,
        description: `برگشت: ${reason}`,
        counterparty: original.counterparty ?? null,
        attachmentKeys: [],
        status: 'posted',
        reversesEntryId: original.id,
        reversalReason: reason,
        importBatchId: null,
        periodShifted: reversalShifted,
        postedByUserId: actor,
        postedAt: now,
        createdByUserId: actor,
      });
      const items = await this.entries.cbsItems(projectId);
      let replacement: CostEntry | null = null;
      if (input.replacement) {
        const blocked = projectAcceptsCosts(project.status);
        if (blocked) throw notAllowed(blocked);
        const values = this.entries.validated(items, input.replacement);
        const shifted = await this.entries.periodShifted(tx, projectId, values.costDate);
        replacement = tx.create(CostEntry, {
          id: newId(),
          orgId: project.orgId,
          projectId,
          cbsItemId: input.replacement.cbsItemId,
          wbsItemId: input.replacement.wbsItemId ?? null,
          ...values,
          source: original.source,
          externalRef: null,
          documentNo: input.replacement.documentNo?.trim() || null,
          description: input.replacement.description?.trim() || null,
          counterparty: input.replacement.counterparty?.trim() || null,
          attachmentKeys: [],
          status: 'posted',
          reversesEntryId: null,
          reversalReason: null,
          importBatchId: null,
          periodShifted: shifted,
          postedByUserId: actor,
          postedAt: now,
          createdByUserId: actor,
        });
      }
      await tx.flush();
      await this.entries.posted(tx, projectId, { entryIds: [reversal.id, ...(replacement ? [replacement.id] : [])], reversedEntryId: original.id });
      this.audit.record(tx, {
        action: 'cost.entry_reversed',
        entityType: 'CostEntry',
        entityId: original.id,
        projectId,
        after: { reversalId: reversal.id, replacementId: replacement?.id ?? null },
        reason,
      });
      return {
        reversal: this.entries.view(reversal, items.get(reversal.cbsItemId), false),
        replacement: replacement ? this.entries.view(replacement, items.get(replacement.cbsItemId), false) : null,
      };
    });
  }

  /** `PUT /projects/:pid/costs-complete-through {date, reason?}` — OD-19؛ آینده رد؛ عقب بردن با دلیل (۱۱.۳–۱۱.۴). */
  async setCutoff(projectId: string, input: { readonly date: string | null; readonly reason?: string | null }) {
    const actor = this.entries.require(projectId, 'cost.set_cutoff');
    const reason = input.reason?.trim() || null;
    return this.em.transactional(async (tx) => {
      const project = await this.cutoff.of(tx, projectId, true);
      const today = tehranClock(this.clock.now()).date;
      if (input.date && input.date > today) throw invalid('تاریخ کامل بودن هزینه‌ها نمی‌تواند از تاریخ داده (امروز) جلوتر باشد.');
      const previous = project.costsCompleteThrough;
      const backwards = !!previous && (!input.date || input.date < previous);
      if (backwards && (!reason || reason.length < 3)) throw invalid('عقب بردن تاریخ کامل بودن هزینه‌ها دلیل می‌خواهد.');
      await this.cutoff.set(tx, projectId, { date: input.date, userId: actor, at: this.clock.now() });
      await this.outbox.emit(tx, { type: 'CostsCompleteThroughChanged', projectId, payload: { v: 1, from: previous, to: input.date } });
      this.audit.record(tx, {
        action: 'cost.cutoff_changed',
        entityType: 'Project',
        entityId: projectId,
        projectId,
        before: { costsCompleteThrough: previous },
        after: { costsCompleteThrough: input.date },
        reason,
      });
      return { costsCompleteThrough: input.date };
    });
  }
}
