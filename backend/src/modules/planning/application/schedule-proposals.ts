import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { type ProposalField, type ProposalStatus, ScheduleChangeProposal } from '../domain/proposal.entity.js';
import { WbsItem } from '../domain/plan.entities.js';

// پیشنهاد تغییر تاریخ در پروژهٔ متصل به MSP (D05؛ plan-versions.md ۷؛ wbs.md ۹؛ تصمیم کاربر 1405/08/26: تاریخ‌های W12
// به‌جای رد، پیشنهاد می‌شوند). تا برگشتن از MSP اثری ندارد؛ با همگام‌سازی confirmed یا superseded (msp-integration.md ۷.۳).

export interface ProposalInput {
  readonly wbsItemId: string;
  readonly field: ProposalField;
  readonly value: string | null;
}

export interface ProposalView {
  readonly id: string;
  readonly wbsItemId: string;
  readonly field: ProposalField;
  readonly proposedValue: string | null;
  readonly baseValue: string | null;
  readonly status: ProposalStatus;
  readonly createdAt: string;
}

const OPEN: ProposalStatus[] = ['pending', 'exported'];
const view = (row: ScheduleChangeProposal): ProposalView => ({
  id: row.id,
  wbsItemId: row.wbsItemId,
  field: row.field,
  proposedValue: row.proposedValue ?? null,
  baseValue: row.baseValue ?? null,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class ScheduleProposals {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
  ) {}

  /** ثبت پیشنهاد؛ پیشنهاد باز قبلی همان فیلد کنار می‌رود. پیشنهادِ همان مقدار جاری چیزی نمی‌سازد. */
  async propose(projectId: string, inputs: readonly ProposalInput[]): Promise<number> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    if (inputs.length === 0) return 0;
    return this.em.transactional(async (tx) => {
      const items = await tx.find(WbsItem, { projectId, removedAt: null, id: { $in: [...new Set(inputs.map((input) => input.wbsItemId))] } });
      const byId = new Map(items.map((item) => [item.id, item]));
      const now = this.clock.now();
      let created = 0;
      for (const input of inputs) {
        const item = byId.get(input.wbsItemId);
        if (!item) throw new DomainError('WBS_ITEM_NOT_FOUND', 404);
        if (!item.isLeaf) throw new DomainError('WBS_OP_REJECTED', 422, { code: 'PARENT_DATES', message: 'تاریخ والد از فرزندانش ساخته می‌شود (wbs.md ۵.۴).' });
        const base = item[input.field] ?? null;
        const open = await tx.find(ScheduleChangeProposal, { projectId, wbsItemId: item.id, field: input.field, status: { $in: OPEN } });
        for (const row of open) Object.assign(row, { status: 'superseded', resolvedAt: now });
        if (base === input.value) continue;
        tx.create(ScheduleChangeProposal, {
          id: newId(),
          orgId: item.orgId,
          projectId,
          wbsItemId: item.id,
          field: input.field,
          proposedValue: input.value,
          baseValue: base,
          status: 'pending',
          proposedByUserId: actor.userId,
          exportedAt: null,
          resolvedAt: null,
          createdAt: now,
        });
        created += 1;
      }
      if (created > 0) {
        await this.outbox.emit(tx, { type: 'ScheduleChangeProposed', projectId, payload: { v: 1, count: created, wbsItemIds: [...byId.keys()] } });
        this.audit.record(tx, { action: 'plan.schedule_change_proposed', entityType: 'Project', entityId: projectId, projectId, after: { count: created } });
      }
      return created;
    });
  }

  /** پیشنهادهای باز (منتظر ارسال یا ارسال‌شده). */
  async open(projectId: string, em: EntityManager = this.em): Promise<ProposalView[]> {
    return (await em.find(ScheduleChangeProposal, { projectId, status: { $in: OPEN } }, { orderBy: { createdAt: 'asc' } })).map(view);
  }

  async pendingCount(projectId: string): Promise<number> {
    return this.em.count(ScheduleChangeProposal, { projectId, status: 'pending' });
  }

  /** پس از ساخت فایل خروجی (۷.۴): pending ← exported. */
  async markExported(tx: EntityManager, projectId: string): Promise<number> {
    return tx.nativeUpdate(ScheduleChangeProposal, { projectId, status: 'pending' }, { status: 'exported', exportedAt: this.clock.now() });
  }

  /**
   * فایل تازهٔ MSP پس از اعمال همگام‌سازی (۷.۳ بند ۶): همان مقدار ← confirmed؛ مقدار دیگری جز پایه ← superseded؛ هنوز
   * مقدار پایه ← باز می‌ماند. برگ حذف‌شده ← superseded.
   */
  async resolveWithFile(
    tx: EntityManager,
    projectId: string,
    fileValues: ReadonlyMap<string, { readonly plannedStart: string | null; readonly plannedFinish: string | null }>,
  ): Promise<{ confirmed: number; superseded: number }> {
    const open = await tx.find(ScheduleChangeProposal, { projectId, status: { $in: OPEN } });
    const now = this.clock.now();
    let confirmed = 0;
    let superseded = 0;
    for (const row of open) {
      const values = fileValues.get(row.wbsItemId);
      const value = values ? values[row.field] : undefined;
      if (value === undefined) {
        Object.assign(row, { status: 'superseded', resolvedAt: now });
        superseded += 1;
      } else if (value === row.proposedValue) {
        Object.assign(row, { status: 'confirmed', resolvedAt: now });
        confirmed += 1;
      } else if (value !== row.baseValue) {
        Object.assign(row, { status: 'superseded', resolvedAt: now });
        superseded += 1;
      }
    }
    return { confirmed, superseded };
  }
}
