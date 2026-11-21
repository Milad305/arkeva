import { NO_REPORTS, type ReportFacts } from './ops.js';
import { FULL, faNumber, faPercent, isLeaf, MAX_DEPTH, toPercent, type TreeNode, walk } from './tree.js';

// اعتبارسنجی نسخهٔ کاری (plan-versions.md ۵.۱؛ wbs.md ۵): خطاها مانع اعمال‌اند، هشدارها فقط نمایش. V-06 و V-05
// به گزارش‌های کارگاه (F09) و V-08 به CBS (F05) بسته‌اند و با همان برش‌ها کامل می‌شوند.

export type ValidationCode =
  | 'weight_sum'
  | 'leaf_without_method'
  | 'steps_invalid'
  | 'leaf_without_dates'
  | 'steps_conversion'
  | 'blocked_change'
  | 'duplicate_code'
  | 'tree_integrity'
  | 'leaf_without_cbs'
  | 'leaf_without_supervisor'
  | 'dates_out_of_range'
  | 'quantity_below_approved'
  | 'pending_removed'
  | 'cbs_over_allocated'
  | 'cbs_invalid_pricing'
  | 'cbs_duplicate_code'
  | 'cbs_unallocated';

export interface ValidationIssue {
  readonly code: ValidationCode;
  readonly severity: 'error' | 'warning';
  readonly rule: string;
  readonly message: string;
  readonly wbsItemId: string | null;
  /** خطاهای CBS (V-08، W-06). */
  readonly cbsItemId?: string | null;
  readonly parentId?: string | null;
  readonly parentTitle?: string | null;
  readonly currentSum?: number;
  readonly suggestions?: Record<string, number>;
}

export interface ValidationContext {
  readonly projectStart: string | null;
  readonly projectFinish: string | null;
  /** روش برگ در برنامهٔ جاری (V-05). */
  readonly currentMethods: ReadonlyMap<string, string | null>;
  /** برگ‌های حذف‌شده نسبت به جاری (W-05). */
  readonly removedIds: readonly string[];
  /** برگ‌های دارای اتصال CBS (F05؛ W-01). */
  readonly linkedLeaves: ReadonlySet<string>;
  /** برگ‌های دارای سرپرست (F07؛ W-02). */
  readonly supervisedLeaves: ReadonlySet<string>;
  readonly facts?: ReportFacts;
}

export function validateForest(forest: readonly TreeNode[], ctx: ValidationContext): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const facts = ctx.facts ?? NO_REPORTS;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // V-01: جمع وزن هر گروه و سطح اول (D04)؛ گروهی با فرزندان همه صفر فقط زیر والد وزن صفر مجاز است (wbs.md ۱۳.۹)
  const checkGroup = (children: readonly TreeNode[], parent: TreeNode | null) => {
    if (children.length === 0) return;
    const sum = children.reduce((total, child) => total + child.weight, 0);
    if (sum === FULL || (sum === 0 && parent !== null && parent.weight === 0)) return;
    const title = parent ? parent.title : 'سطح اول';
    errors.push({
      code: 'weight_sum',
      rule: 'V-01',
      severity: 'error',
      message: `مجموع وزن فرزندان «${title}» ${faPercent(sum)}٪ است؛ باید دقیقاً ۱۰۰ باشد.`,
      wbsItemId: parent?.id ?? null,
      parentId: parent?.id ?? null,
      parentTitle: parent ? parent.title : null,
      currentSum: toPercent(sum),
      // «این مقدار را X کنید» (wbs.md ۸ W12): وزنی که هر فرزند به‌تنهایی باید بگیرد
      suggestions: Object.fromEntries(
        children.map((child) => [child.id, toPercent(child.weight + FULL - sum)] as const).filter(([, value]) => value >= 0 && value <= 100),
      ),
    });
  };
  checkGroup(forest, null);

  const codes = new Map<string, number>();
  let tooDeep = false;
  walk(forest, (node, _parent, _index, depth) => {
    codes.set(node.code, (codes.get(node.code) ?? 0) + 1);
    if (depth > MAX_DEPTH) tooDeep = true;
    if (!isLeaf(node)) {
      checkGroup(node.children, node);
      return;
    }
    const label = `«${node.code} ${node.title}»`;
    const issue = (severity: 'error' | 'warning', code: ValidationCode, rule: string, message: string) =>
      (severity === 'error' ? errors : warnings).push({ code, rule, severity, message, wbsItemId: node.id });

    // V-02 (D03؛ wbs.md ۵.۵)
    if (!node.isMilestone) {
      if (!node.method) issue('error', 'leaf_without_method', 'V-02', `برگ ${label} روش اندازه‌گیری ندارد.`);
      else if (node.method === 'quantity' && (!node.unit || !(node.qty !== null && node.qty > 0))) {
        issue('error', 'leaf_without_method', 'V-02', `برگ مقداری ${label} واحد یا مقدار کل ندارد.`);
      }
    }
    // V-03 (wbs.md ۴.۲)
    if (node.method === 'steps') {
      const steps = node.steps ?? [];
      const total = steps.reduce((sum, step) => sum + step.weight, 0);
      const titles = new Set(steps.map((step) => step.title.trim()));
      if (steps.length < 2 || steps.length > 10) issue('error', 'steps_invalid', 'V-03', `برگ ${label} باید ۲ تا ۱۰ گام داشته باشد.`);
      else if (steps.some((step) => !(step.weight > 0))) issue('error', 'steps_invalid', 'V-03', `وزن همهٔ گام‌های ${label} باید بزرگ‌تر از صفر باشد.`);
      else if (total !== FULL) issue('error', 'steps_invalid', 'V-03', `جمع وزن گام‌های ${label} ${faPercent(total)}٪ است؛ باید ۱۰۰ باشد.`);
      else if (titles.size !== steps.length || titles.has('')) issue('error', 'steps_invalid', 'V-03', `عنوان گام‌های ${label} باید پر و یکتا باشد.`);
      // V-05: تبدیل برگ دارای پیشرفت به گام‌ها بی درصد گام‌ها (wbs.md ۵.۶)
      const before = ctx.currentMethods.get(node.id);
      if (facts.hasApproved(node.id) && before !== undefined && before !== 'steps') {
        const done = node.stepsDone ?? {};
        if (steps.some((step) => done[step.key] === undefined)) {
          issue('error', 'steps_conversion', 'V-05', `برگ ${label} پیشرفت تأییدشده دارد؛ درصد فعلی هر گام را وارد کنید.`);
        }
      }
    }
    // V-04 و W-03 (wbs.md ۵.۴)
    if (!node.start || !node.finish) issue('error', 'leaf_without_dates', 'V-04', `برگ ${label} تاریخ شروع یا پایان ندارد.`);
    else if (node.finish < node.start) issue('error', 'leaf_without_dates', 'V-04', `پایان ${label} پیش از شروعش است.`);
    else if ((ctx.projectStart && node.start < ctx.projectStart) || (ctx.projectFinish && node.finish > ctx.projectFinish)) {
      issue('warning', 'dates_out_of_range', 'W-03', `تاریخ ${label} بیرون از بازهٔ پروژه است؛ با اعمال، تاریخ پروژه از ریشه به‌روز می‌شود.`);
    }
    if (!node.isMilestone && node.method !== 'time_based') {
      // W-01 و W-02
      if (!ctx.linkedLeaves.has(node.id)) issue('warning', 'leaf_without_cbs', 'W-01', `برگ ${label} به هیچ قلم CBS وصل نیست؛ BAC و EV آن صفر می‌ماند.`);
      if (!ctx.supervisedLeaves.has(node.id))
        issue('warning', 'leaf_without_supervisor', 'W-02', `برگ ${label} سرپرست ندارد و پس از اعمال در اپ به کسی نمی‌رسد.`);
    }
    // W-04
    const approved = facts.approvedQuantity(node.id);
    if (approved !== null && node.method === 'quantity' && node.qty !== null && node.qty < approved) {
      issue('warning', 'quantity_below_approved', 'W-04', `مقدار کل ${label} از مقدار تأییدشده (${faNumber(approved)}) کمتر است؛ درصد روی ۱۰۰ می‌ماند.`);
    }
  });

  if (tooDeep) {
    errors.push({
      code: 'tree_integrity',
      rule: 'V-01',
      severity: 'error',
      message: `عمق درخت بیش از ${faNumber(MAX_DEPTH)} سطح است؛ چند سطح را یکی کنید.`,
      wbsItemId: null,
    });
  }
  // V-07
  for (const [code, count] of codes) {
    if (count > 1) errors.push({ code: 'duplicate_code', rule: 'V-07', severity: 'error', message: `کد ${code} تکراری است.`, wbsItemId: null });
  }
  // W-05
  const pendingRemoved = ctx.removedIds.filter((id) => facts.hasPending(id)).length;
  if (pendingRemoved > 0) {
    warnings.push({
      code: 'pending_removed',
      rule: 'W-05',
      severity: 'warning',
      message: `${faNumber(pendingRemoved)} برگ حذف‌شده گزارش در انتظار دارد؛ پس از اعمال «نیاز به تعیین تکلیف» می‌شوند.`,
      wbsItemId: null,
    });
  }
  return { errors, warnings };
}
