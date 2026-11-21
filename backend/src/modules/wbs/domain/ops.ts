import { scheduleSpan } from '../../computation/index.js';
import { LEAF_HAS_REPORTS, MSP_OWNED, type OpError, type OpsContext, UNIT_LOCKED, type WbsOp } from './ops-contract.js';
import { distribute, isLeaf, locate, renumber, spanOf, toUnits, type TreeNode, walk } from './tree.js';

export * from './ops-contract.js';

// عملیات گروهی W12 روی نسخهٔ کاری (wbs.md ۵.۶، ۹، ۱۱؛ تصمیم‌های 1405/08/15 و 1405/08/22). تابع خالص روی جنگل
// در حافظه؛ هر عملی که رد شود بقیه را نگه نمی‌دارد و خطایش با شمارهٔ عمل برمی‌گردد.

class OpReject extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function applyOps(forest: TreeNode[], ops: readonly WbsOp[], ctx: OpsContext): OpError[] {
  const errors: OpError[] = [];
  const hasReports = (node: TreeNode) => ctx.facts.hasApproved(node.id) || ctx.facts.hasPending(node.id);
  const structure = () => {
    if (ctx.mspLinked) throw new OpReject('MSP_OWNED', MSP_OWNED);
  };
  const must = (id: string) => {
    const found = locate(forest, id);
    if (!found) throw new OpReject('NOT_FOUND', 'این آیتم در نسخهٔ کاری پیدا نشد؛ ممکن است عمل قبلی حذفش کرده باشد.');
    return found;
  };
  /** برگ ← والد: داده‌های خاص برگ پاک می‌شوند (wbs.md ۵.۶؛ کاربر پیش‌تر تأیید کرده). */
  const becomeParent = (node: TreeNode) => {
    if (hasReports(node)) throw new OpReject('LEAF_HAS_REPORTS', LEAF_HAS_REPORTS);
    Object.assign(node, {
      method: null,
      unit: null,
      qty: null,
      steps: null,
      start: null,
      finish: null,
      isMilestone: false,
    });
    delete node.stepsDone;
  };
  const childrenOf = (id: string | null): TreeNode[] => {
    if (!id) return forest;
    const { node } = must(id);
    if (isLeaf(node)) becomeParent(node);
    return node.children;
  };
  const date = (value: string | null | undefined, field: string): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (!ISO_DATE.test(value)) throw new OpReject('DATE_INVALID', `تاریخ ${field} درست نیست.`);
    return value;
  };

  const run = (op: WbsOp): void => {
    switch (op.type) {
      case 'add': {
        structure();
        const siblings = childrenOf(op.parentId);
        const fields = op.fields;
        const milestone = fields.isMilestone ?? false;
        const start = date(fields.plannedStart, 'شروع');
        const node: TreeNode = {
          id: op.tempId,
          code: '',
          codeMode: 'auto',
          title: fields.title.trim() || 'آیتم تازه',
          isMilestone: milestone,
          weight: toUnits(fields.weightInParent ?? 0),
          start,
          finish: milestone ? start : date(fields.plannedFinish, 'پایان'),
          unit: fields.unit?.trim() || null,
          qty: fields.totalQuantity ?? null,
          method: milestone ? 'percent' : (fields.measurementMethod ?? (fields.unit && fields.totalQuantity ? 'quantity' : 'percent')),
          steps: null,
          isCritical: null,
          totalFloatDays: null,
          children: [],
        };
        const after = op.afterId ? siblings.findIndex((item) => item.id === op.afterId) : -1;
        siblings.splice(after >= 0 ? after + 1 : siblings.length, 0, node);
        break;
      }

      case 'update': {
        const { node } = must(op.id);
        const fields = op.fields;
        const leaf = isLeaf(node);
        const leafOnly = (['unit', 'totalQuantity', 'measurementMethod', 'isMilestone', 'plannedStart', 'plannedFinish'] as const).some(
          (key) => fields[key] !== undefined,
        );
        if (!leaf && leafOnly) throw new OpReject('PARENT_FIELD', 'روش، مقدار و تاریخ والد از فرزندانش می‌آید و جدا ویرایش نمی‌شود.');
        if (ctx.mspLinked && (fields.plannedStart !== undefined || fields.plannedFinish !== undefined)) throw new OpReject('MSP_OWNED', MSP_OWNED);
        if (fields.unit !== undefined && (fields.unit ?? null) !== node.unit && ctx.facts.hasApproved(node.id) && node.method === 'quantity') {
          throw new OpReject('UNIT_LOCKED', UNIT_LOCKED);
        }
        if (fields.title !== undefined) {
          if (!fields.title.trim()) throw new OpReject('TITLE_EMPTY', 'عنوان خالی نمی‌شود.');
          node.title = fields.title.trim();
        }
        if (fields.code !== undefined && fields.code.trim() && fields.code.trim() !== node.code) {
          node.code = fields.code.trim();
          node.codeMode = 'custom';
        }
        if (fields.weightInParent !== undefined) {
          if (!(fields.weightInParent >= 0 && fields.weightInParent <= 100)) throw new OpReject('WEIGHT_RANGE', 'وزن باید بین ۰ و ۱۰۰ باشد.');
          node.weight = toUnits(fields.weightInParent);
        }
        if (fields.unit !== undefined) node.unit = fields.unit?.trim() || null;
        if (fields.totalQuantity !== undefined) {
          if (fields.totalQuantity !== null && !(fields.totalQuantity > 0)) throw new OpReject('QTY_RANGE', 'مقدار کل باید بزرگ‌تر از صفر باشد.');
          node.qty = fields.totalQuantity;
        }
        if (fields.plannedStart !== undefined) node.start = date(fields.plannedStart, 'شروع');
        if (fields.plannedFinish !== undefined) node.finish = date(fields.plannedFinish, 'پایان');
        if (fields.measurementMethod !== undefined) {
          node.method = fields.measurementMethod;
          if (node.method !== 'steps') node.steps = null;
          if (node.method === 'time_based') {
            node.unit = null;
            node.qty = null;
          }
        }
        if (fields.isMilestone !== undefined) {
          node.isMilestone = fields.isMilestone;
          // نقطهٔ عطف همیشه درصدی است و مدت صفر دارد (wbs.md ۵.۵)
          if (node.isMilestone) {
            node.method = 'percent';
            node.steps = null;
          }
        }
        if (node.isMilestone && node.start) node.finish = node.start;
        break;
      }

      case 'move': {
        structure();
        const source = must(op.id);
        const target = op.parentId ? must(op.parentId).node : null;
        if (target && (target === source.node || locate(source.node.children, target.id))) {
          throw new OpReject('MOVE_CYCLE', 'آیتم را نمی‌شود زیر خودش یا زیرشاخه‌اش برد.');
        }
        if (target && isLeaf(target)) becomeParent(target);
        source.siblings.splice(source.index, 1);
        const siblings = target ? target.children : forest;
        const after = op.afterId ? siblings.findIndex((item) => item.id === op.afterId) : -1;
        siblings.splice(op.afterId ? after + 1 : 0, 0, source.node);
        break;
      }

      case 'indent': {
        structure();
        const source = must(op.id);
        const previous = source.siblings[source.index - 1];
        if (!previous) throw new OpReject('NO_PREVIOUS', 'بالای این آیتم در همین سطح آیتمی نیست که والدش شود.');
        if (isLeaf(previous)) becomeParent(previous);
        source.siblings.splice(source.index, 1);
        previous.children.push(source.node);
        break;
      }

      case 'outdent': {
        structure();
        const source = must(op.id);
        if (!source.parent) throw new OpReject('ROOT_LEVEL', 'این آیتم در سطح اول است.');
        const grand = locate(forest, source.parent.id);
        const outer = grand ? grand.siblings : forest;
        const parentIndex = outer.indexOf(source.parent);
        source.siblings.splice(source.index, 1);
        outer.splice(parentIndex + 1, 0, source.node);
        break;
      }

      case 'remove': {
        structure();
        const source = must(op.id);
        source.siblings.splice(source.index, 1);
        break;
      }

      case 'split': {
        structure();
        const source = must(op.id);
        const leaf = source.node;
        if (!isLeaf(leaf)) throw new OpReject('NOT_LEAF', 'فقط برگ تقسیم می‌شود.');
        if (op.parts.length === 0) throw new OpReject('NO_PARTS', 'دست‌کم یک بخش تازه لازم است.');
        // والد تازه جای برگ را می‌گیرد؛ برگ قدیمی با همان شناسه و گزارش‌ها فرزند اول می‌شود (wbs.md ۵.۶)
        const parent: TreeNode = {
          id: ctx.splitParentId(leaf.id),
          code: leaf.code,
          codeMode: leaf.codeMode,
          title: op.keepTitle.trim() || leaf.title,
          isMilestone: false,
          weight: leaf.weight,
          start: null,
          finish: null,
          unit: null,
          qty: null,
          method: null,
          steps: null,
          isCritical: null,
          totalFloatDays: null,
          children: [],
        };
        leaf.codeMode = 'auto';
        leaf.title = `${leaf.title} — بخش ۱`;
        if (op.keepQuantity !== null) leaf.qty = op.keepQuantity;
        const parts: TreeNode[] = op.parts.map((part) => ({
          id: part.tempId,
          code: '',
          codeMode: 'auto',
          title: part.title.trim() || 'بخش تازه',
          isMilestone: false,
          weight: 0,
          start: leaf.start,
          finish: leaf.finish,
          unit: leaf.unit,
          qty: part.totalQuantity,
          method: leaf.method,
          steps: leaf.steps ? leaf.steps.map((step) => ({ ...step })) : null,
          isCritical: null,
          totalFloatDays: null,
          children: [],
        }));
        parent.children = [leaf, ...parts];
        // به نسبت مقدار وقتی همه مقداری با یک واحدند، وگرنه مساوی — قاعدهٔ خود تقسیم، نه مولد D04
        // (تصمیم 1405/08/22؛ AC-WBS-04)
        const quantities = parent.children.map((child) => (child.method === 'quantity' && child.unit === leaf.unit ? (child.qty ?? 0) : 0));
        distribute(parent.children, quantities.every((value) => value > 0) ? quantities : parent.children.map(() => 1));
        source.siblings.splice(source.index, 1, parent);
        break;
      }

      case 'autoDistribute': {
        const children = childrenOf(op.parentId);
        const total = children.reduce((sum, child) => sum + child.weight, 0);
        // به نسبت وزن‌های فعلی؛ اگر همه صفرند مساوی؛ باقی‌مانده به آخرین (wbs.md ۵.۳)
        distribute(children, total > 0 ? children.map((child) => child.weight) : children.map(() => 1));
        break;
      }

      case 'generateWeights': {
        const groups: TreeNode[][] = [];
        if (op.scope === 'tree') {
          groups.push(forest);
          walk(forest, (node) => {
            if (node.children.length > 0) groups.push(node.children);
          });
        } else groups.push(childrenOf(op.scope));
        if (op.generator === 'cost' && ![...ctx.leafBac.values()].some((bac) => bac > 0n)) {
          throw new OpReject(
            'NO_COST_BASIS',
            'هنوز هیچ برگی به قلم CBS با بودجه وصل نیست؛ وزن «از هزینه» بدون بودجهٔ برگ‌ها ساخته نمی‌شود. «مساوی» یا «از مدت» را بزنید.',
          );
        }
        for (const children of groups) {
          const basis = children.map((child) => {
            if (op.generator === 'equal') return 1;
            if (op.generator === 'cost') {
              // برگ زمانی وزن صفر می‌گیرد و در مخرج نیست (D04؛ AC-WBS-13)
              if (isLeaf(child) && child.method === 'time_based') return 0;
              return Number(bacBelow(child, ctx.leafBac));
            }
            const span = spanOf(child);
            return span.start && span.finish ? (scheduleSpan(span.start, span.finish, ctx.calendar)?.workDays ?? 0) : 0;
          });
          if (!distribute(children, basis))
            distribute(
              children,
              children.map(() => 1),
            );
        }
        break;
      }

      case 'setSteps': {
        const { node } = must(op.id);
        if (!isLeaf(node)) throw new OpReject('NOT_LEAF', 'گام فقط برای برگ است.');
        const kept = new Set(op.steps.map((step) => step.key));
        for (const [key, done] of Object.entries(node.stepsDone ?? {})) {
          if (ctx.facts.hasApproved(node.id) && done > 0 && !kept.has(key)) {
            throw new OpReject('STEP_LOCKED', 'گامی که پیشرفت تأییدشده دارد حذف نمی‌شود؛ نامش یا وزنش را عوض کنید.');
          }
        }
        node.method = 'steps';
        node.steps = op.steps.map((step) => ({
          key: step.key,
          title: step.title.trim(),
          weight: toUnits(step.weight),
        }));
        if (op.stepsDone) node.stepsDone = { ...node.stepsDone, ...op.stepsDone };
        break;
      }
    }
  };

  ops.forEach((op, index) => {
    try {
      run(op);
    } catch (cause) {
      if (cause instanceof OpReject) errors.push({ index, code: cause.code, message: cause.message });
      else throw cause;
    }
  });

  renumber(forest);
  return errors;
}

function bacBelow(node: TreeNode, leafBac: ReadonlyMap<string, bigint>): bigint {
  if (isLeaf(node)) return leafBac.get(node.id) ?? 0n;
  return node.children.reduce((sum, child) => sum + bacBelow(child, leafBac), 0n);
}
