import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { ProjectAlertRules, type AlertRuleView, ProjectRules } from '../../projects/index.js';
import { AlertRuleSetting } from '../domain/alert.entities.js';
import { ALERT_RULES, RULES_BY_CODE } from '../domain/registry.js';
import { AlertEvaluator } from './alert-evaluator.js';
import { AlertQueue } from './alert-triggers.js';

// قواعد هشدار در W30 (04-alert-engine ۲.۴؛ G8): فهرست با پارامترهای حل‌شده و تنظیم پروژه. خاموش کردن هشدارهای باز همان قاعده را
// رفع می‌کند (AC-AL-05)؛ AL-INT-01 و AL-STR-06 خاموش نمی‌شوند. پیش‌فرض سازمان فقط ذخیره و حل می‌شود؛ ویرایشش با صفحهٔ
// مدیر سازمان (تصمیم 1405/08/24).

const invalid = (reason: string) => new DomainError('ALERT_RULE_INVALID', 422, { reason });

@Injectable()
export class AlertRulesConfig extends ProjectAlertRules {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly rules: ProjectRules,
    private readonly evaluator: AlertEvaluator,
    private readonly queue: AlertQueue,
  ) {
    super();
  }

  /** `GET /projects/:pid/alert-rules` و بخش `alertRules` تنظیمات. */
  async list(projectId: string): Promise<AlertRuleView[]> {
    const settings = await this.evaluator.settings(projectId);
    return ALERT_RULES.map((rule) => {
      const resolved = settings.get(rule.code);
      return {
        code: rule.code,
        name: rule.name,
        group: rule.group,
        enabled: resolved?.enabled ?? true,
        canDisable: rule.canDisable,
        severityText: rule.severityText,
        params: rule.params.map((param) => ({
          key: param.key,
          label: param.label,
          value: resolved?.params[param.key] ?? param.default,
          unit: param.unit,
          min: param.min,
          max: param.max,
          step: param.step,
        })),
      };
    });
  }

  /** `PATCH /projects/:pid/alert-rules/:code {enabled, params}` */
  async update(
    projectId: string,
    code: string,
    input: { readonly enabled?: boolean; readonly params?: Readonly<Record<string, number>> },
  ): Promise<AlertRuleView> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const rule = RULES_BY_CODE.get(code);
    if (!rule) throw new NotFoundError('NOT_FOUND');
    if (input.enabled === false && !rule.canDisable) throw invalid('این قاعده غیرقابل‌خاموش است.');
    const params: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.params ?? {})) {
      const def = rule.params.find((param) => param.key === key);
      if (!def) throw invalid(`پارامتر ${key} برای این قاعده تعریف نشده است.`);
      if (!Number.isFinite(value) || value < def.min || value > def.max) throw invalid(`«${def.label}» باید بین ${def.min} و ${def.max} باشد.`);
      params[key] = value;
    }
    const project = await this.rules.of(projectId);
    await this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AlertRuleSetting, { projectId, ruleCode: code });
      const before = existing ? { enabled: existing.enabled ?? null, params: existing.params } : null;
      const row =
        existing ??
        tx.create(AlertRuleSetting, { id: newId(), orgId: project.orgId, projectId, ruleCode: code, enabled: null, params: {}, updatedAt: this.clock.now() });
      Object.assign(row, {
        enabled: input.enabled ?? row.enabled ?? null,
        params: { ...row.params, ...params },
        updatedByUserId: actor.userId,
        updatedAt: this.clock.now(),
      });
      this.audit.record(tx, {
        action: 'alert_rule.updated',
        entityType: 'AlertRuleSetting',
        entityId: row.id,
        projectId,
        before,
        after: { ruleCode: code, enabled: row.enabled ?? null, params: row.params },
      });
      await this.queue.request(tx, project.orgId, projectId);
    });
    // خاموش شد ← رفع فوری (AC-AL-05)؛ ارزیابی بعدی هم همین را می‌کند
    if (input.enabled === false) await this.evaluator.resolveAll(projectId, 'rule_disabled', [code]);
    return (await this.list(projectId)).find((entry) => entry.code === code) as AlertRuleView;
  }
}
