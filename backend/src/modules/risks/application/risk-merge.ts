import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundError } from '../../../platform/http/errors.js';
import { Notifier } from '../../notifications/index.js';
import { Risk } from '../domain/risk.entities.js';
import { RiskAccess } from './risk-access.js';
import { RiskCommands, riskLink } from './risk-commands.js';
import { riskConflict, RiskInputs, riskInvalid } from './risk-input.js';
import { RiskStore } from './risk-store.js';
import { RiskViews } from './risk-views.js';

// ادغام ریسک تکراری (risk.md ۱۱؛ تصمیم 1405/08/15): با `risk.change_status_owner` این ریسک `closed(other)` و ارجاع در
// یادداشت هر دو؛ بی آن فقط پیشنهاد (یادداشت و NT-RSK-03 به مدیر پروژه).

@Injectable()
export class RiskMerge {
  constructor(
    private readonly em: EntityManager,
    private readonly notifier: Notifier,
    private readonly access: RiskAccess,
    private readonly store: RiskStore,
    private readonly inputs: RiskInputs,
    private readonly commands: RiskCommands,
    private readonly views: RiskViews,
  ) {}

  /** `POST /risks/:id/merge {intoRiskId, propose}` — ادغام یا پیشنهاد ادغام (۱۱؛ تصمیم 1405/08/15). */
  async merge(riskId: string, input: { readonly intoRiskId: string; readonly propose: boolean }) {
    const { actor } = this.access.actor();
    const risk = await this.store.find(riskId);
    this.access.require(risk.projectId, 'risk.view');
    const target = await this.em.findOne(Risk, { id: input.intoRiskId });
    if (!target) throw new NotFoundError('RISK_NOT_FOUND');
    if (target.projectId !== risk.projectId || target.id === risk.id) throw riskInvalid('ریسک مقصد باید ریسک دیگری از همین پروژه باشد.');
    const rules = await this.commands.writable(risk.projectId);
    if (input.propose) {
      const manager = (await this.inputs.members(risk.projectId)).includes(rules.managerUserId) ? rules.managerUserId : null;
      await this.em.transactional(async (tx) => {
        const locked = await this.store.lock(tx, riskId);
        this.store.note(tx, locked, 'note', `پیشنهاد ادغام با ${target.code} «${target.title}»`, actor.userId, manager ? [manager] : []);
        if (manager && manager !== actor.userId) {
          await this.notifier.notify(tx, {
            code: 'NT-RSK-03',
            projectId: risk.projectId,
            recipients: [manager],
            subjectId: `${risk.id}:merge:${target.id}`,
            title: `پیشنهاد ادغام ریسک ${risk.code} در ${target.code}`,
            body: risk.title,
            link: riskLink(risk.projectId, risk.id),
          });
        }
      });
      return this.views.detail(riskId);
    }
    this.access.require(risk.projectId, 'risk.change_status_owner');
    if (risk.status === 'closed') throw riskConflict('این ریسک از پیش بسته است.');
    await this.em.transactional(async (tx) => {
      const [source, into] = await Promise.all([this.store.lock(tx, riskId), this.store.lock(tx, target.id)]);
      this.store.note(tx, source, 'note', `در ${into.code} «${into.title}» ادغام شد`, actor.userId);
      this.store.note(tx, into, 'note', `${source.code} «${source.title}» در این ریسک ادغام شد`, actor.userId);
      await this.commands.applyStatus(tx, riskId, { status: 'closed', closeReason: 'other', note: `ادغام در ${into.code}` }, actor.userId);
    });
    return this.views.detail(riskId);
  }
}
