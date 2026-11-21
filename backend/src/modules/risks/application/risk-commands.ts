import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { Notifier } from '../../notifications/index.js';
import { ProjectRules } from '../../projects/index.js';
import { autoStatus, CLOSE_LABEL, isActiveAction, isOpen, scoreOf, URGENT_SCORE } from '../domain/risk-rules.js';
import { type CloseReason, ContingencyAllocation, Risk, RiskAction, RiskLink, RiskScoreHistory } from '../domain/risk.entities.js';
import { RiskAccess } from './risk-access.js';
import { type NormalizedRisk, rialOf, riskConflict, type RiskInput, RiskInputs, riskInvalid } from './risk-input.js';
import { RiskStore } from './risk-store.js';
import { RiskViews } from './risk-views.js';

// ثبت، ویرایش، وضعیت و ادغام ریسک (risk.md ۵.۱–۵.۲، ۱۱؛ AC-RK-02، ۰۳، ۰۶، ۰۷). هر نوشتن: قفل ردیف، تاریخچه، RiskChanged و
// ممیزی در یک تراکنش؛ اعلان از راه Notifier در همان تراکنش (D09).

export interface CreateRiskInput extends RiskInput {
  readonly firstAction: { readonly title: string; readonly dueDate: string | null } | null;
  readonly notifyBelowThreshold: boolean;
}

export interface StatusInput {
  readonly status: 'occurred' | 'closed' | 'assessed';
  readonly closeReason?: CloseReason;
  readonly actualCost?: string | null;
  readonly actualDelayDays?: number | null;
  readonly note?: string;
}

const READ_ONLY = new Set(['completed', 'archived']);
export const riskLink = (projectId: string, riskId: string) => `/projects/${projectId}/risks/${riskId}`;

@Injectable()
export class RiskCommands {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly notifier: Notifier,
    private readonly access: RiskAccess,
    private readonly store: RiskStore,
    private readonly inputs: RiskInputs,
    private readonly rules: ProjectRules,
    private readonly views: RiskViews,
  ) {}

  async writable(projectId: string) {
    const rules = await this.rules.of(projectId);
    if (READ_ONLY.has(rules.status)) throw riskConflict('دفتر ریسک پروژهٔ تمام‌شده یا بایگانی‌شده فقط خواندنی است.');
    return rules;
  }

  private changed(tx: EntityManager, risk: Risk, change: string, extra: Record<string, unknown> = {}): Promise<string> {
    return this.outbox.emit(tx, {
      type: 'RiskChanged',
      projectId: risk.projectId,
      payload: { v: 1, riskId: risk.id, change, status: risk.status, score: risk.score ?? null, ...extra },
    });
  }

  private replaceLinks(tx: EntityManager, risk: Risk, links: NormalizedRisk['links'], existing: readonly RiskLink[]): void {
    const wanted = new Set(links.map((link) => `${link.kind}|${link.targetId}`));
    for (const link of existing) if (link.targetType !== 'field_report' && !wanted.has(`${link.targetType}|${link.targetId}`)) tx.remove(link);
    const have = new Set(existing.map((link) => `${link.targetType}|${link.targetId}`));
    for (const link of links) {
      if (have.has(`${link.kind}|${link.targetId}`)) continue;
      tx.create(RiskLink, {
        id: newId(),
        orgId: risk.orgId,
        projectId: risk.projectId,
        riskId: risk.id,
        targetType: link.kind,
        targetId: link.targetId,
        createdAt: this.clock.now(),
      });
    }
  }

  /** `POST /projects/:pid/risks` (W44). */
  async create(projectId: string, input: CreateRiskInput) {
    this.access.require(projectId, 'risk.create');
    const { actor } = this.access.actor();
    const rules = await this.writable(projectId);
    const data = await this.inputs.normalize(actor.orgId, projectId, input);
    const firstTitle = input.firstAction?.title.trim() ?? '';
    if (firstTitle && !input.firstAction?.dueDate) throw riskInvalid('هر اقدام موعد لازم دارد.');
    const id = await this.em.transactional(async (tx) => {
      const now = this.clock.now();
      const { score, level } = scoreOf(data.probability, data.impact);
      const { links, ...fields } = data;
      const risk = tx.create(Risk, {
        id: newId(),
        orgId: actor.orgId,
        projectId,
        code: await this.store.nextCode(tx, actor.orgId, projectId),
        ...fields,
        score,
        level,
        status: 'identified',
        source: 'manual',
        sourceReportedByUserId: null,
        sourceIssueType: null,
        sourceIssueEffect: null,
        closeReason: null,
        closedAt: null,
        closedByUserId: null,
        occurredAt: null,
        actualCost: null,
        actualDelayDays: null,
        createdByUserId: actor.userId,
        createdAt: now,
        updatedAt: now,
      });
      // ردیف‌های وابسته (پیوند، تاریخچه، یادداشت) کلید خارجی به risk دارند؛ ترتیب درج را unit of work نمی‌داند
      await tx.flush();
      this.replaceLinks(tx, risk, links, []);
      if (score !== null) {
        tx.create(RiskScoreHistory, {
          id: newId(),
          orgId: actor.orgId,
          riskId: risk.id,
          probability: data.probability as number,
          impact: data.impact as number,
          score,
          changedByUserId: actor.userId,
          reason: null,
          createdAt: now,
        });
      }
      const actions: RiskAction[] = [];
      if (firstTitle && input.firstAction?.dueDate) {
        actions.push(
          tx.create(RiskAction, {
            id: newId(),
            orgId: actor.orgId,
            projectId,
            riskId: risk.id,
            title: firstTitle,
            ownerUserId: data.ownerUserId,
            dueDate: input.firstAction.dueDate,
            status: 'open',
            costNote: null,
            completedAt: null,
            completionNote: null,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
      risk.status = autoStatus('identified', score !== null, actions);
      this.store.note(tx, risk, 'created', 'ریسک ثبت شد', actor.userId);
      await this.store.follow(tx, risk, [actor.userId, data.ownerUserId]);
      await this.changed(tx, risk, 'created');
      this.audit.record(tx, {
        action: 'risk.created',
        entityType: 'Risk',
        entityId: risk.id,
        projectId,
        after: { code: risk.code, score, status: risk.status },
      });
      // NT-RSK-02: امتیاز ≥ ۱۵ همیشه؛ کمتر فقط با انتخاب ثبت‌کننده (AC-RK-02؛ تصمیم 1405/08/15)
      if ((score ?? 0) >= URGENT_SCORE || input.notifyBelowThreshold) {
        await this.notifier.notify(tx, {
          code: 'NT-RSK-02',
          projectId,
          recipients: [rules.managerUserId, data.ownerUserId].filter((userId) => userId !== actor.userId),
          subjectId: risk.id,
          title: `ریسک ${risk.code} «${risk.title}»${score !== null ? ` با امتیاز ${toFaDigits(score)}` : ''} ثبت شد.`,
          body: rules.name,
          link: riskLink(projectId, risk.id),
        });
      }
      return risk.id;
    });
    return this.views.detail(id);
  }

  /** `PATCH /risks/:id` — تغییر امتیاز تاریخچه و NT-RSK-01 می‌سازد (AC-RK-03). */
  async update(riskId: string, input: RiskInput) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.requireEdit(current);
    await this.writable(current.projectId);
    const data = await this.inputs.normalize(actor.orgId, current.projectId, input);
    if (data.ownerUserId !== current.ownerUserId) this.access.require(current.projectId, 'risk.change_status_owner');
    await this.em.transactional(async (tx) => {
      const risk = await this.store.lock(tx, riskId);
      if (risk.status === 'closed') throw riskConflict('ریسک بسته ویرایش نمی‌شود؛ اول آن را بازگشایی کنید.');
      const now = this.clock.now();
      const before = risk.score ?? null;
      const scoreChanged = risk.probability !== data.probability || risk.impact !== data.impact;
      const { links, ...fields } = data;
      const { score, level } = scoreOf(data.probability, data.impact);
      Object.assign(risk, fields, { score, level, updatedAt: now });
      this.replaceLinks(tx, risk, links, await tx.find(RiskLink, { riskId }));
      await this.store.follow(tx, risk, [risk.ownerUserId]);
      if (scoreChanged && score !== null) {
        tx.create(RiskScoreHistory, {
          id: newId(),
          orgId: risk.orgId,
          riskId,
          probability: data.probability as number,
          impact: data.impact as number,
          score,
          changedByUserId: actor.userId,
          reason: null,
          createdAt: now,
        });
        this.store.note(
          tx,
          risk,
          'score',
          before ? `امتیاز از ${toFaDigits(before)} به ${toFaDigits(score)} رسید` : `ارزیابی شد: امتیاز ${toFaDigits(score)}`,
          actor.userId,
        );
        const followers = await this.store.followers(riskId, tx);
        await this.notifier.notify(tx, {
          code: 'NT-RSK-01',
          projectId: risk.projectId,
          recipients: followers.filter((userId) => userId !== actor.userId),
          subjectId: `${risk.id}:${score}`,
          title: `امتیاز ریسک ${risk.code} ${before ? `از ${toFaDigits(before)} ` : ''}به ${toFaDigits(score)} رسید.`,
          body: risk.title,
          link: riskLink(risk.projectId, risk.id),
        });
      }
      await this.store.refreshStatus(tx, risk);
      await this.changed(tx, risk, scoreChanged ? 'score' : 'content', { previousScore: before });
      this.audit.record(tx, {
        action: 'risk.updated',
        entityType: 'Risk',
        entityId: risk.id,
        projectId: risk.projectId,
        before: { score: before },
        after: { score },
      });
    });
    return this.views.detail(riskId);
  }

  /** `POST /risks/:id/status` — رخ‌داده، بستن با دلیل، بازگشایی (۵.۱؛ AC-RK-07). */
  async status(riskId: string, input: StatusInput) {
    const { actor } = this.access.actor();
    const current = await this.store.find(riskId);
    this.access.require(current.projectId, 'risk.change_status_owner');
    await this.writable(current.projectId);
    await this.em.transactional((tx) => this.applyStatus(tx, riskId, input, actor.userId));
    return this.views.detail(riskId);
  }

  async applyStatus(tx: EntityManager, riskId: string, input: StatusInput, actorUserId: string): Promise<void> {
    const risk = await this.store.lock(tx, riskId);
    const now = this.clock.now();
    const note = input.note?.trim() ? ` — ${input.note.trim()}` : '';
    if (input.status === 'closed') {
      if (!input.closeReason) throw riskInvalid('برای بستن ریسک دلیل را انتخاب کنید.');
      if (risk.status === 'closed') throw riskConflict('این ریسک از پیش بسته است.');
      const open = (await tx.find(RiskAction, { riskId })).filter((action) => isActiveAction(action.status));
      for (const action of open) Object.assign(action, { status: 'cancelled', updatedAt: now });
      // ذخیرهٔ تخصیص‌یافتهٔ مصرف‌نشده آزاد می‌شود
      const allocated = (await tx.find(ContingencyAllocation, { riskId })).reduce((sum, row) => sum + BigInt(row.amount), 0n);
      if (allocated !== 0n) {
        tx.create(ContingencyAllocation, {
          id: newId(),
          orgId: risk.orgId,
          projectId: risk.projectId,
          riskId,
          amount: (-allocated).toString(),
          note: 'آزاد شدن با بستن ریسک',
          createdByUserId: actorUserId,
          createdAt: now,
        });
      }
      Object.assign(risk, { status: 'closed', closeReason: input.closeReason, closedAt: now, closedByUserId: actorUserId, updatedAt: now });
      this.store.note(
        tx,
        risk,
        'status',
        `بسته شد · ${CLOSE_LABEL[input.closeReason]}${open.length ? ` · ${toFaDigits(open.length)} اقدام باز لغو شد` : ''}${note}`,
        actorUserId,
      );
    } else if (input.status === 'occurred') {
      if (!isOpen(risk.status)) throw riskConflict('این ریسک باز نیست.');
      const delay = input.actualDelayDays ?? null;
      if (delay !== null && (!Number.isInteger(delay) || delay < 0)) throw riskInvalid('تأخیر واقعی را به روز بنویسید.');
      Object.assign(risk, { status: 'occurred', occurredAt: now, actualCost: rialOf(input.actualCost, 'هزینهٔ واقعی'), actualDelayDays: delay, updatedAt: now });
      this.store.note(tx, risk, 'status', `رخ داد و به مسئله تبدیل شد${delay ? ` · ${toFaDigits(delay)} روز تأخیر` : ''}${note}`, actorUserId);
    } else {
      if (risk.status !== 'closed' && risk.status !== 'occurred') throw riskConflict('فقط ریسک بسته یا رخ‌داده بازگشایی می‌شود.');
      Object.assign(risk, { status: 'assessed', closeReason: null, closedAt: null, closedByUserId: null, updatedAt: now });
      await this.store.refreshStatus(tx, risk);
      this.store.note(tx, risk, 'status', `بازگشایی شد${note}`, actorUserId);
    }
    await this.changed(tx, risk, `status:${input.status}`);
    this.audit.record(tx, {
      action: 'risk.status_changed',
      entityType: 'Risk',
      entityId: risk.id,
      projectId: risk.projectId,
      after: { status: risk.status, closeReason: risk.closeReason ?? null },
    });
  }
}
