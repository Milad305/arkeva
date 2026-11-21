import type { RuleDef } from './rule-types.js';
import { APPROVAL_RULES, FIELD_RULES, STRUCTURE_RULES } from './rules/operations.js';
import { OTHER_RULES } from './rules/other.js';
import { RISK_RULES } from './rules/risk.js';
import { COST_RULES, PROGRESS_RULES } from './rules/progress-cost.js';

// رجیستری همهٔ قواعد هشدار (04-alert-engine ۳؛ AC-AL-09). قاعده‌ساز کاربری نیست (D09).

export const ALERT_RULES: readonly RuleDef[] = [
  ...PROGRESS_RULES,
  ...COST_RULES,
  ...STRUCTURE_RULES,
  ...FIELD_RULES,
  ...APPROVAL_RULES,
  ...RISK_RULES,
  ...OTHER_RULES,
];
export const RULES_BY_CODE: ReadonlyMap<string, RuleDef> = new Map(ALERT_RULES.map((rule) => [rule.code, rule]));

/** قواعدی که با پارامتر مبلغ متن جدا دارند (فقط نقش‌های دارای `cbs.view_amounts` مبلغ می‌بینند). */
export const AMOUNT_RULES: ReadonlySet<string> = new Set(['AL-CST-02', 'AL-STR-02']);

export interface RuleSettingLevel {
  readonly enabled: boolean | null;
  readonly params: Readonly<Record<string, number>>;
}

/** پیش‌فرض کد ← سازمان ← پروژه؛ نزدیک‌ترین برنده (۲.۴؛ AC-AL-08). قاعدهٔ غیرقابل‌خاموش همیشه روشن. */
export function resolveSetting(rule: RuleDef, org: RuleSettingLevel | undefined, project: RuleSettingLevel | undefined) {
  const params: Record<string, number> = {};
  for (const def of rule.params) params[def.key] = project?.params[def.key] ?? org?.params[def.key] ?? def.default;
  const enabled = rule.canDisable ? (project?.enabled ?? org?.enabled ?? true) : true;
  return { enabled, params };
}
