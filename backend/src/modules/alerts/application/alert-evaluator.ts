import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { Alert, AlertRuleSetting } from '../domain/alert.entities.js';
import { type Action, dedupeKeyOf, plan, REOPEN_WINDOW_MS } from '../domain/lifecycle.js';
import { ALERT_RULES, resolveSetting, type RuleSettingLevel } from '../domain/registry.js';
import type { Audience, Finding, RuleDef } from '../domain/rule-types.js';
import { AlertFactsLoader, type LoadedFacts } from './alert-facts.js';

// ارزیابی قواعد یک پروژه (04-alert-engine ۲.۲–۲.۳؛ D09): واقعیت‌ها ← یافته‌ها ← چرخهٔ هشدار در یک تراکنش. هشدار تازه یا
// ارتقایافته AlertRaised (← F13)، رفع AlertResolved. هر ارزیابی همهٔ قواعد روشن را می‌سنجد `[پیش‌فرض فنی]`؛ چرخه تکرارپذیر است.

interface Candidate {
  readonly rule: RuleDef;
  readonly finding: Finding;
  readonly dedupeKey: string;
  readonly recipients: string[];
}

export interface EvaluationResult {
  readonly created: number;
  readonly escalated: number;
  readonly resolved: number;
  readonly reopened: number;
}

@Injectable()
export class AlertEvaluator {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly loader: AlertFactsLoader,
  ) {}

  /** تنظیم سازمان و پروژهٔ هر قاعده (AC-AL-08). */
  async settings(projectId: string, em: EntityManager = this.em) {
    const rows = await em.find(AlertRuleSetting, { $or: [{ projectId }, { projectId: null }] });
    const level = (row: AlertRuleSetting): RuleSettingLevel => ({ enabled: row.enabled ?? null, params: row.params });
    return new Map(
      ALERT_RULES.map((rule) => {
        const org = rows.find((row) => row.ruleCode === rule.code && !row.projectId);
        const project = rows.find((row) => row.ruleCode === rule.code && row.projectId === projectId);
        return [rule.code, resolveSetting(rule, org && level(org), project && level(project))] as const;
      }),
    );
  }

  async evaluate(projectId: string): Promise<EvaluationResult> {
    const now = this.clock.now();
    const loaded = await this.loader.load(projectId, now);
    // پروژهٔ بایگانی: همهٔ هشدارها رفع (AC-AL-10)؛ پیش‌نویس، متوقف و تمام‌شده ارزیابی نمی‌شوند
    if (loaded.rules.status === 'archived') return this.resolveAll(projectId, 'project_archived');
    if (loaded.rules.status !== 'active') return { created: 0, escalated: 0, resolved: 0, reopened: 0 };
    const settings = await this.settings(projectId);
    const enabled = ALERT_RULES.filter((rule) => !rule.deferredUntil && settings.get(rule.code)?.enabled);
    const candidates = enabled.flatMap((rule) =>
      rule.evaluate(loaded.facts, settings.get(rule.code)?.params ?? {}).map((finding): Candidate => ({
        rule,
        finding,
        dedupeKey: dedupeKeyOf(rule.code, finding.subjectType, finding.subjectId),
        recipients: this.recipients(finding.audience, loaded),
      })),
    );
    const disabled = ALERT_RULES.filter((rule) => !settings.get(rule.code)?.enabled).map((rule) => rule.code);

    return this.em.transactional(async (tx) => {
      const codes = enabled.map((rule) => rule.code);
      const existing = await tx.find(Alert, {
        projectId,
        ruleCode: { $in: codes },
        $or: [{ status: { $in: ['open', 'seen', 'dismissed'] } }, { status: 'resolved', resolvedAt: { $gte: new Date(now.getTime() - REOPEN_WINDOW_MS) } }],
      });
      const actions = plan(
        candidates.map((candidate) => ({ dedupeKey: candidate.dedupeKey, severity: candidate.finding.severity })),
        existing.map((alert) => ({ ...alert, resolvedAt: alert.resolvedAt ?? null, conditionClearedAt: alert.conditionClearedAt ?? null })),
        now,
      );
      const byKey = new Map(candidates.map((candidate) => [candidate.dedupeKey, candidate]));
      const byId = new Map(existing.map((alert) => [alert.id, alert]));
      const result = { created: 0, escalated: 0, resolved: 0, reopened: 0 };
      for (const action of actions) await this.apply(tx, action, byKey, byId, loaded, now, result);
      // قاعدهٔ خاموش: هشدارهای بازش رفع (AC-AL-05)
      if (disabled.length > 0) result.resolved += await this.resolveWhere(tx, projectId, disabled, 'rule_disabled', now);
      return result;
    });
  }

  private async apply(
    tx: EntityManager,
    action: Action,
    byKey: ReadonlyMap<string, Candidate>,
    byId: ReadonlyMap<string, Alert>,
    loaded: LoadedFacts,
    now: Date,
    result: { created: number; escalated: number; resolved: number; reopened: number },
  ): Promise<void> {
    if (action.kind === 'resolve') {
      const alert = byId.get(action.id) as Alert;
      Object.assign(alert, { status: 'resolved', resolvedAt: now, resolveReason: 'condition_cleared', lastEvaluatedAt: now });
      await this.outbox.emit(tx, { type: 'AlertResolved', projectId: alert.projectId, payload: { v: 1, alertId: alert.id, ruleCode: alert.ruleCode } });
      result.resolved += 1;
      return;
    }
    if (action.kind === 'clear_dismissed') {
      (byId.get(action.id) as Alert).conditionClearedAt = now;
      return;
    }
    const candidate = byKey.get(action.dedupeKey) as Candidate;
    const text = this.text(candidate);
    if (action.kind === 'create') {
      const alert = tx.create(Alert, {
        id: newId(),
        orgId: loaded.rules.orgId,
        projectId: loaded.facts.projectId,
        ruleCode: candidate.rule.code,
        severity: candidate.finding.severity,
        subjectType: candidate.finding.subjectType,
        subjectId: candidate.finding.subjectId,
        dedupeKey: candidate.dedupeKey,
        status: 'open',
        ...text,
        payload: { ...candidate.finding.values },
        audience: candidate.recipients,
        firstTriggeredAt: now,
        lastEvaluatedAt: now,
      });
      await tx.flush();
      await this.raised(tx, alert, candidate.recipients, false);
      result.created += 1;
      return;
    }
    const alert = byId.get(action.id) as Alert;
    const update = { ...text, payload: { ...candidate.finding.values }, audience: candidate.recipients, lastEvaluatedAt: now };
    if (action.kind === 'reopen') {
      // بازگشایی در ۲۴ ساعت بی اعلان تازه (AC-AL-04)
      Object.assign(alert, update, { status: 'open', resolvedAt: null, resolveReason: null, severity: candidate.finding.severity });
      result.reopened += 1;
      return;
    }
    Object.assign(alert, update, { severity: action.severity });
    if (action.notify) {
      await this.raised(tx, alert, candidate.recipients, true);
      result.escalated += 1;
    }
  }

  private text(candidate: Candidate) {
    const values = candidate.finding.values;
    return {
      title: candidate.rule.title(values),
      guidance: candidate.rule.guidance(values, true),
      guidanceSafe: candidate.rule.guidance(values, false),
      actionLink: candidate.rule.link(values),
    };
  }

  private async raised(tx: EntityManager, alert: Alert, recipients: readonly string[], escalated: boolean): Promise<void> {
    await this.outbox.emit(tx, {
      type: 'AlertRaised',
      projectId: alert.projectId,
      payload: { v: 1, alertId: alert.id, ruleCode: alert.ruleCode, severity: alert.severity, escalated, recipients: [...recipients] },
    });
  }

  /** مخاطب ← کاربر (۲.۵)؛ مدیر سازمان با قواعد یکپارچه‌سازی. */
  private recipients(audience: readonly Audience[], loaded: LoadedFacts): string[] {
    const users = audience.flatMap((entry) => {
      if ('userId' in entry) return [entry.userId];
      if (entry.role === 'pm') return loaded.roles.pm;
      if (entry.role === 'planner') return loaded.roles.planner;
      if (entry.role === 'finance') return loaded.roles.finance;
      return [];
    });
    return [...new Set(users)];
  }

  private async resolveWhere(tx: EntityManager, projectId: string, codes: readonly string[] | null, reason: string, now: Date): Promise<number> {
    const open = await tx.find(Alert, { projectId, status: { $in: ['open', 'seen'] }, ...(codes ? { ruleCode: { $in: [...codes] } } : {}) });
    for (const alert of open) {
      Object.assign(alert, { status: 'resolved', resolvedAt: now, resolveReason: reason });
      await this.outbox.emit(tx, { type: 'AlertResolved', projectId, payload: { v: 1, alertId: alert.id, ruleCode: alert.ruleCode } });
    }
    return open.length;
  }

  /** پروژهٔ بایگانی یا قاعدهٔ خاموش‌شده از تنظیمات. */
  async resolveAll(projectId: string, reason: string, codes: readonly string[] | null = null): Promise<EvaluationResult> {
    const resolved = await this.em.transactional((tx) => this.resolveWhere(tx, projectId, codes, reason, this.clock.now()));
    return { created: 0, escalated: 0, resolved, reopened: 0 };
  }
}
