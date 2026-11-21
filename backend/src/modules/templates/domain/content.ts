// محتوای قالب (templates.md ۴) و قواعد خالص آن: اعتبارسنجی انتشار (۵.۲)، آمار، تقسیم بودجه با باقی‌مانده به آخرین مورد (۵.۳ گام
// ۳ و ۴؛ C02) و مقیاس زمان (۵.۳ گام ۲). محتوا تاریخ مطلق، مقدار کل و سرپرست ندارد.

export const CONTENT_SCHEMA_VERSION = 1;
export const METHODS = ['quantity', 'percent', 'steps', 'time_based'] as const;
export const COST_TYPES = ['materials', 'labor', 'equipment', 'subcontract', 'overhead', 'transport', 'other'] as const;
export type Method = (typeof METHODS)[number];
export type CostType = (typeof COST_TYPES)[number];

export interface TemplateSettings {
  weightGenerator: 'manual' | 'cost' | 'duration' | 'equal';
  warningThreshold: number;
  criticalThreshold: number;
  eacMethod: 'cpi' | 'remaining' | 'composite';
  minPhotos: number;
  maxJumpPct: number;
  allowDecrease: boolean;
  approvalMode: 'single_stage' | 'two_stage';
  stage2OnCritical: boolean;
  stage2OnJump: boolean;
  stage2OnGpsOut: boolean;
  stage2OnCriticalPath: boolean;
  reviewDeadlineHours: number;
  onDeadline: 'remind_only' | 'escalate';
  autoApproveEnabled: boolean;
  autoApproveMaxDelta: number;
}

export const SETTINGS_DEFAULTS: TemplateSettings = {
  weightGenerator: 'manual',
  warningThreshold: 5,
  criticalThreshold: 15,
  eacMethod: 'cpi',
  minPhotos: 2,
  maxJumpPct: 20,
  allowDecrease: false,
  approvalMode: 'two_stage',
  stage2OnCritical: true,
  stage2OnJump: true,
  stage2OnGpsOut: true,
  stage2OnCriticalPath: false,
  reviewDeadlineHours: 24,
  onDeadline: 'escalate',
  autoApproveEnabled: true,
  autoApproveMaxDelta: 2,
};

export interface ContentWbsRow {
  key: string;
  parentKey: string | null;
  code: string;
  title: string;
  sortOrder: number;
  isMilestone: boolean;
  weightInParent: number;
  measurementMethod: Method | null;
  steps: { key: string; title: string; weight: number }[];
  unit: string | null;
  startOffsetWd: number;
  durationWd: number;
  areaKey: string | null;
}

export interface ContentCbsRow {
  key: string;
  parentKey: string | null;
  code: string;
  title: string;
  costType: CostType;
  unit: string | null;
  pricingMode: 'lump_sum' | 'unit_rate';
  sharePct: number | null;
}

export interface TemplateContent {
  schemaVersion: number;
  referenceDurationWd: number;
  wbs: ContentWbsRow[];
  cbs: ContentCbsRow[];
  links: { wbsKey: string; cbsKey: string; parts: number }[];
  areas: { key: string; name: string; wbsRootKeys: string[] }[];
  settings: TemplateSettings;
}

export interface Issue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  at: string | null;
}

const EPSILON = 0.0001;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

export const childrenOf = <T extends { key: string; parentKey: string | null; sortOrder?: number }>(rows: readonly T[], key: string | null): T[] =>
  rows.filter((row) => row.parentKey === key).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

export const isLeaf = (rows: readonly { key: string; parentKey: string | null }[], key: string) => !rows.some((row) => row.parentKey === key);

function depthOf(rows: readonly ContentWbsRow[], row: ContentWbsRow): number {
  let depth = 1;
  let parent = row.parentKey;
  const byKey = new Map(rows.map((entry) => [entry.key, entry]));
  while (parent && byKey.has(parent) && depth < 50) {
    depth += 1;
    parent = byKey.get(parent)?.parentKey ?? null;
  }
  return depth;
}

export function statsOf(content: TemplateContent) {
  return {
    wbsCount: content.wbs.length,
    leafCount: content.wbs.filter((row) => isLeaf(content.wbs, row.key)).length,
    cbsCount: content.cbs.length,
    linkCount: content.links.length,
    levels: content.wbs.reduce((value, row) => Math.max(value, depthOf(content.wbs, row)), 0),
  };
}

/** اعتبارسنجی انتشار (۵.۲؛ AC-TP-03): خطا مانع انتشار است، هشدار نه. */
export function validate(content: TemplateContent) {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (content.wbs.length === 0) errors.push({ severity: 'error', rule: 'EMPTY', message: 'قالب هیچ آیتم WBS ندارد.', at: null });
  let weightsOk = true;
  const groups = [
    { key: null as string | null, label: 'سطح اول' },
    ...content.wbs.filter((row) => !isLeaf(content.wbs, row.key)).map((row) => ({ key: row.key, label: `${row.code} ${row.title}` })),
  ];
  for (const group of groups) {
    const children = childrenOf(content.wbs, group.key);
    if (children.length === 0) continue;
    const sum = children.reduce((value, child) => value + child.weightInParent, 0);
    if (Math.abs(sum - 100) > EPSILON) {
      weightsOk = false;
      errors.push({ severity: 'error', rule: 'WEIGHT_SUM', message: `جمع وزن فرزندان ${round4(sum)} است، نه ۱۰۰.`, at: group.label });
    }
  }
  const cbsLeaves = content.cbs.filter((row) => isLeaf(content.cbs, row.key));
  const cbsShareSum = cbsLeaves.reduce((value, row) => value + (row.sharePct ?? 0), 0);
  if (content.cbs.length === 0) {
    warnings.push({ severity: 'warning', rule: 'NO_CBS', message: 'قالب قلم CBS ندارد؛ با ساخت پروژه بودجه نمی‌شکند و باید دستی وارد شود.', at: null });
  } else if (Math.abs(cbsShareSum - 100) > EPSILON) {
    errors.push({ severity: 'error', rule: 'CBS_SHARE_SUM', message: `جمع سهم بودجهٔ برگ‌های CBS ${round4(cbsShareSum)} است، نه ۱۰۰.`, at: null });
  }
  const linkedWbs = new Set(content.links.map((link) => link.wbsKey));
  const linkedCbs = new Set(content.links.map((link) => link.cbsKey));
  for (const row of content.wbs) {
    if (!isLeaf(content.wbs, row.key) || row.isMilestone) continue;
    const at = `${row.code} ${row.title}`;
    if (row.measurementMethod === 'quantity' && !row.unit) {
      errors.push({ severity: 'error', rule: 'QTY_UNIT', message: 'روش «مقداری» واحد می‌خواهد؛ مقدار کل در قالب نیست و در پروژه پر می‌شود.', at });
    }
    if (row.measurementMethod === 'steps') {
      const sum = row.steps.reduce((value, step) => value + step.weight, 0);
      if (row.steps.length === 0 || Math.abs(sum - 100) > EPSILON)
        errors.push({ severity: 'error', rule: 'STEP_SUM', message: 'جمع وزن گام‌ها باید ۱۰۰ باشد.', at });
    }
    if (row.measurementMethod !== 'time_based' && !linkedWbs.has(row.key)) {
      warnings.push({ severity: 'warning', rule: 'WBS_NO_LINK', message: 'این برگ به هیچ قلم CBS وصل نیست؛ BAC نمی‌گیرد.', at });
    }
  }
  for (const row of cbsLeaves) {
    if (!linkedCbs.has(row.key))
      warnings.push({
        severity: 'warning',
        rule: 'CBS_NO_LINK',
        message: 'این قلم به هیچ برگ WBS وصل نیست؛ بودجه‌اش پخش نمی‌شود.',
        at: `${row.code} ${row.title}`,
      });
  }
  return { canPublish: errors.length === 0, errors, warnings, weightsOk, cbsShareSum: round4(cbsShareSum) };
}

const divRound = (numerator: bigint, denominator: bigint) => (numerator * 2n + denominator) / (denominator * 2n);

/** سهم درصدی؛ باقی‌ماندهٔ گرد کردن به آخرین مورد (AC-TP-02). */
export function splitByShare(total: bigint, shares: readonly number[]): bigint[] {
  if (shares.length === 0) return [];
  const amounts = shares.map((share) => divRound(total * BigInt(Math.round(share * 10_000)), 1_000_000n));
  amounts[amounts.length - 1] = total - amounts.slice(0, -1).reduce((sum, value) => sum + value, 0n);
  return amounts;
}

/** ضریب تقسیم اتصال‌های یک قلم؛ باقی‌مانده به آخرین اتصال (۵.۳ گام ۴). */
export function splitByParts(total: bigint, parts: readonly number[]): bigint[] {
  if (parts.length === 0) return [];
  const sum = BigInt(parts.reduce((value, part) => value + part, 0));
  const amounts = parts.map((part) => divRound(total * BigInt(part), sum));
  amounts[amounts.length - 1] = total - amounts.slice(0, -1).reduce((value, amount) => value + amount, 0n);
  return amounts;
}

/** بودجهٔ برگ‌های CBS و مبلغ هر اتصال از بودجهٔ CBS پروژه (۵.۳ گام ۳ و ۴). */
export function allocate(content: TemplateContent, cbsBudget: bigint) {
  const leaves = content.cbs.filter((row) => isLeaf(content.cbs, row.key));
  const leafBudget = new Map<string, bigint>();
  splitByShare(
    cbsBudget,
    leaves.map((row) => row.sharePct ?? 0),
  ).forEach((amount, index) => leafBudget.set((leaves[index] as ContentCbsRow).key, amount));
  const linkAmount = new Map<string, bigint>();
  for (const leaf of leaves) {
    const links = content.links.filter((link) => link.cbsKey === leaf.key);
    splitByParts(
      leafBudget.get(leaf.key) ?? 0n,
      links.map((link) => link.parts),
    ).forEach((amount, index) => {
      const link = links[index] as { wbsKey: string; cbsKey: string };
      linkAmount.set(`${link.wbsKey}|${link.cbsKey}`, amount);
    });
  }
  return { leafBudget, linkAmount };
}

/**
 * مقیاس زمان (۵.۳ گام ۲؛ AC-TP-04): `ضریب = روز کاری پروژه ÷ مدت مرجع`؛ شروع = round(شروع نسبی × ضریب) و پایان =
 * شروع + max(1, round(مدت × ضریب)) − 1، هر دو اندیس روز کاری از صفر؛ نقطهٔ عطف در یک روز؛ هیچ آیتمی از پایان بیرون نمی‌زند.
 */
export function scaleOf(row: Pick<ContentWbsRow, 'startOffsetWd' | 'durationWd' | 'isMilestone'>, referenceWd: number, projectWd: number) {
  const factor = projectWd / Math.max(1, referenceWd);
  const last = Math.max(0, projectWd - 1);
  const start = Math.min(last, Math.max(0, Math.round(row.startOffsetWd * factor)));
  const finish = row.isMilestone ? start : Math.min(last, start + Math.max(1, Math.round(row.durationWd * factor)) - 1);
  return { start, finish, factor };
}
