import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { IdentityService } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { ProjectPlanAccess } from '../../projects/index.js';
import { mentionedIn } from '../domain/risk-rules.js';
import { type ActionStatus, ACTION_STATUSES, ContingencyAllocation, type Risk, RiskAction, RiskFollower } from '../domain/risk.entities.js';
import { RiskAccess } from './risk-access.js';
import { riskLink } from './risk-commands.js';
import { rialOf, riskConflict, RiskInputs, riskInvalid } from './risk-input.js';
import { RiskStore } from './risk-store.js';
import { RiskViews } from './risk-views.js';

// اقدام‌ها، یادداشت، دنبال کردن و تخصیص ذخیره (risk.md ۵.۴، ۵.۷، ۵.۸؛ AC-RK-06، ۰۸).

export interface ActionInput {
  readonly title?: string;
  readonly ownerUserId?: string;
  readonly dueDate?: string | null;
  readonly status?: ActionStatus;
  readonly completionNote?: string | null;
  readonly costNote?: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** «۳٫۲۵ میلیارد ریال» */
function billions(value: bigint): string {
  const text = (Number(value) / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, '٬').replace('.', '٫');
  return `${toFaDigits(text)} میلیارد ریال`;
}

@Injectable()
export class RiskWork {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly notifier: Notifier,
    private readonly identity: IdentityService,
    private readonly access: RiskAccess,
    private readonly store: RiskStore,
    private readonly inputs: RiskInputs,
    private readonly projects: ProjectPlanAccess,
    private readonly views: RiskViews,
  ) {}

  private actionChanged(tx: EntityManager, risk: Risk, action: RiskAction, change: string): Promise<string> {
    return this.outbox.emit(tx, {
      type: 'RiskActionChanged',
      projectId: risk.projectId,
      payload: { v: 1, riskId: risk.id, actionId: action.id, change, status: action.status, dueDate: action.dueDate },
    });
  }

  /** `POST /risks/:id/actions` */
  async addAction(riskId: string, input: ActionInput) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.requireEdit(current);
    const title = input.title?.trim() ?? '';
    if (!title) throw riskInvalid('عنوان اقدام را بنویسید.');
    if (!input.dueDate || !DATE.test(input.dueDate)) throw riskInvalid('هر اقدام موعد لازم دارد.');
    const owner = input.ownerUserId ?? current.ownerUserId;
    if (!(await this.inputs.members(current.projectId)).includes(owner)) throw riskInvalid('مسئول اقدام باید عضو پروژه باشد.');
    await this.em.transactional(async (tx) => {
      const risk = await this.store.lock(tx, riskId);
      if (risk.status === 'closed') throw riskConflict('ریسک بسته اقدام تازه نمی‌گیرد.');
      const now = this.clock.now();
      const action = tx.create(RiskAction, {
        id: newId(),
        orgId: risk.orgId,
        projectId: risk.projectId,
        riskId,
        title,
        ownerUserId: owner,
        dueDate: input.dueDate as string,
        status: 'open',
        costNote: input.costNote?.trim() || null,
        completedAt: null,
        completionNote: null,
        createdAt: now,
        updatedAt: now,
      });
      const name = (await this.identity.personRefs([owner])).get(owner)?.fullName ?? '';
      this.store.note(tx, risk, 'action', `اقدام تازه: «${title}» · ${name}`, actor.userId);
      await tx.flush();
      await this.store.refreshStatus(tx, risk);
      await this.actionChanged(tx, risk, action, 'created');
    });
    return this.views.detail(riskId);
  }

  /** `PATCH /risk-actions/:id` */
  async updateAction(actionId: string, input: ActionInput) {
    const { actor } = this.access.actor();
    const found = await this.em.findOne(RiskAction, { id: actionId });
    if (!found) throw new NotFoundError('RISK_ACTION_NOT_FOUND');
    const current = await this.store.find(found.riskId);
    this.access.requireEdit(current);
    if (input.status && !ACTION_STATUSES.includes(input.status)) throw riskInvalid('وضعیت اقدام درست نیست.');
    if (input.dueDate !== undefined && (!input.dueDate || !DATE.test(input.dueDate))) throw riskInvalid('هر اقدام موعد لازم دارد.');
    if (input.ownerUserId && !(await this.inputs.members(current.projectId)).includes(input.ownerUserId)) throw riskInvalid('مسئول اقدام باید عضو پروژه باشد.');
    await this.em.transactional(async (tx) => {
      const risk = await this.store.lock(tx, found.riskId);
      if (risk.status === 'closed') throw riskConflict('اقدام ریسک بسته تغییر نمی‌کند.');
      const action = (await tx.findOne(RiskAction, { id: actionId })) as RiskAction;
      const now = this.clock.now();
      if (input.title !== undefined) {
        if (!input.title.trim()) throw riskInvalid('عنوان اقدام را بنویسید.');
        action.title = input.title.trim();
      }
      if (input.ownerUserId) action.ownerUserId = input.ownerUserId;
      if (input.dueDate) action.dueDate = input.dueDate;
      if (input.costNote !== undefined) action.costNote = input.costNote?.trim() || null;
      if (input.status && input.status !== action.status) {
        action.status = input.status;
        if (input.status === 'done') {
          action.completedAt = now;
          action.completionNote = input.completionNote?.trim() || null;
          this.store.note(tx, risk, 'action', `اقدام «${action.title}» انجام شد${action.completionNote ? ` — ${action.completionNote}` : ''}`, actor.userId);
        } else {
          action.completedAt = null;
          if (input.status === 'cancelled') this.store.note(tx, risk, 'action', `اقدام «${action.title}» لغو شد`, actor.userId);
        }
      }
      action.updatedAt = now;
      await tx.flush();
      await this.store.refreshStatus(tx, risk);
      await this.actionChanged(tx, risk, action, input.status ? `status:${input.status}` : 'updated');
    });
    return this.views.detail(found.riskId);
  }

  /** `POST /risks/:id/notes` — یادداشت ویرایش‌ناپذیر با @نام (۵.۸). */
  async addNote(riskId: string, text: string) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.require(current.projectId, 'risk.view');
    if (!this.access.fullView(current.projectId)) throw new NotFoundError('RISK_NOT_FOUND');
    const body = text.trim();
    if (!body) throw riskInvalid('یادداشت خالی است.');
    if (body.length > 4000) throw riskInvalid('یادداشت حداکثر ۴۰۰۰ نویسه است.');
    const members = await this.inputs.members(current.projectId);
    const refs = await this.identity.personRefs(members);
    const mentioned = mentionedIn(body, [...refs.values()]).filter((userId) => userId !== actor.userId);
    await this.em.transactional(async (tx) => {
      const risk = await this.store.lock(tx, riskId);
      const note = this.store.note(tx, risk, 'note', body, actor.userId, mentioned);
      if (mentioned.length === 0) return;
      await this.outbox.emit(tx, {
        type: 'RiskNoteMention',
        projectId: risk.projectId,
        payload: { v: 1, riskId, noteId: note.id, mentionedUserIds: mentioned },
      });
      const author = (await this.identity.personRefs([actor.userId])).get(actor.userId)?.fullName ?? '';
      await this.notifier.notify(tx, {
        code: 'NT-RSK-03',
        projectId: risk.projectId,
        recipients: mentioned,
        subjectId: note.id,
        title: `${author} شما را در یادداشت ریسک ${risk.code} نام برد.`,
        body,
        link: riskLink(risk.projectId, risk.id),
      });
    });
    return this.views.detail(riskId);
  }

  /** `POST/DELETE /risks/:id/follow` — مالک دنبال‌کنندهٔ همیشگی است. */
  async follow(riskId: string, follow: boolean) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.require(current.projectId, 'risk.view');
    if (!this.access.fullView(current.projectId)) throw new NotFoundError('RISK_NOT_FOUND');
    await this.em.transactional(async (tx) => {
      const risk = await this.store.lock(tx, riskId);
      if (follow) await this.store.follow(tx, risk, [actor.userId]);
      else if (risk.ownerUserId !== actor.userId) await tx.nativeDelete(RiskFollower, { riskId, userId: actor.userId });
    });
    return this.views.detail(riskId);
  }

  /** `PUT /risks/:id/contingency {amount}` — جمع تخصیص‌ها ≤ ذخیرهٔ پروژه (۵.۷؛ AC-RK-08). */
  async allocate(riskId: string, rawAmount: string) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.require(current.projectId, 'risk.allocate_contingency');
    const amount = BigInt(rialOf(rawAmount, 'مبلغ تخصیص') ?? '0');
    await this.em.transactional(async (tx) => {
      // قفل ردیف پروژه: دو تخصیص هم‌زمان از یک ذخیره بیش از باقی‌مانده برنمی‌دارند
      const project = await this.projects.context(current.projectId, tx);
      const risk = await this.store.lock(tx, riskId);
      if (risk.status === 'closed') throw riskConflict('به ریسک بسته ذخیره تخصیص داده نمی‌شود.');
      const rows = await tx.find(ContingencyAllocation, { projectId: risk.projectId });
      const mine = rows.filter((row) => row.riskId === riskId).reduce((sum, row) => sum + BigInt(row.amount), 0n);
      const others = rows.filter((row) => row.riskId !== riskId).reduce((sum, row) => sum + BigInt(row.amount), 0n);
      const available = BigInt(project.contingencyReserve) - others;
      if (amount > available) {
        throw new DomainError('CONTINGENCY_EXCEEDED', 422, {
          reason: `از ذخیرهٔ احتیاطی فقط ${billions(available < 0n ? 0n : available)} برای این ریسک مانده است.`,
          available: (available < 0n ? 0n : available).toString(),
        });
      }
      const delta = amount - mine;
      if (delta === 0n) return;
      tx.create(ContingencyAllocation, {
        id: newId(),
        orgId: risk.orgId,
        projectId: risk.projectId,
        riskId,
        amount: delta.toString(),
        note: '',
        createdByUserId: actor.userId,
        createdAt: this.clock.now(),
      });
      this.store.note(tx, risk, 'contingency', `ذخیرهٔ احتیاطی تخصیص‌یافته: ${billions(amount)}`, actor.userId);
      this.audit.record(tx, {
        action: 'risk.contingency_allocated',
        entityType: 'Risk',
        entityId: risk.id,
        projectId: risk.projectId,
        before: { allocated: mine.toString() },
        after: { allocated: amount.toString() },
      });
    });
    return this.views.detail(riskId);
  }
}
