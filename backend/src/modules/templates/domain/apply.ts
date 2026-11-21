import type { CbsNode, LinkNode, PlanNode } from '../../planning/index.js';
import { allocate, childrenOf, type ContentWbsRow, isLeaf, scaleOf, type TemplateContent } from './content.js';

// ساخت محتوای پروژه از قالب (templates.md ۵.۳؛ AC-TP-01، ۰۲، ۰۴، ۰۹) — تابع خالص. شناسه‌های تازه، کد از ساختار، تاریخ با
// مقیاس روزهای کاری پروژه، قلم‌های CBS مقطوع با سهم بودجه، مبلغ اتصال با ضریب، حوزه‌ها بی ناظر.

export interface AppliedTemplate {
  readonly wbs: PlanNode[];
  readonly cbs: CbsNode[];
  readonly links: LinkNode[];
  readonly areas: { readonly name: string; readonly rootItemIds: string[] }[];
}

const decimal4 = (value: number) => value.toFixed(4);

/** `workDays` روزهای کاری پروژه از شروع تا پایان (تقویم پروژه)، به ترتیب. */
export function applyTemplate(
  content: TemplateContent,
  input: { readonly workDays: readonly string[]; readonly cbsBudget: bigint; readonly newId: () => string },
): AppliedTemplate {
  const projectWd = Math.max(1, input.workDays.length);
  const day = (index: number) => input.workDays[Math.min(index, input.workDays.length - 1)] ?? null;
  const ids = new Map<string, string>();
  for (const row of [...content.wbs, ...content.cbs]) ids.set(`${'costType' in row ? 'c' : 'w'}:${row.key}`, input.newId());
  const wbsId = (key: string) => ids.get(`w:${key}`) as string;
  const cbsId = (key: string) => ids.get(`c:${key}`) as string;

  const wbs: PlanNode[] = [];
  const visit = (row: ContentWbsRow, code: string, index: number): { start: string | null; finish: string | null } => {
    const children = childrenOf(content.wbs, row.key);
    const leaf = children.length === 0;
    let start: string | null = null;
    let finish: string | null = null;
    const position = wbs.length;
    wbs.push(null as unknown as PlanNode);
    if (leaf) {
      const scaled = scaleOf(row, content.referenceDurationWd, projectWd);
      start = day(scaled.start);
      finish = day(scaled.finish);
    } else {
      children.forEach((child, childIndex) => {
        const span = visit(child, `${code}.${childIndex + 1}`, childIndex);
        if (span.start && (!start || span.start < start)) start = span.start;
        if (span.finish && (!finish || span.finish > finish)) finish = span.finish;
      });
    }
    wbs[position] = {
      id: wbsId(row.key),
      parentId: row.parentKey ? wbsId(row.parentKey) : null,
      sortOrder: index,
      code,
      codeMode: 'auto',
      title: row.title,
      isLeaf: leaf,
      isMilestone: leaf && row.isMilestone,
      weightInParent: decimal4(row.weightInParent),
      plannedStart: start,
      plannedFinish: finish,
      unit: leaf ? row.unit : null,
      // مقدار کل و سرپرست در قالب نیستند (۴)؛ مقدار پیش از فعال‌سازی پر می‌شود
      totalQuantity: null,
      measurementMethod: leaf ? (row.measurementMethod ?? 'percent') : null,
      steps: leaf && row.measurementMethod === 'steps' ? row.steps.map((step) => ({ key: step.key, title: step.title, weight: step.weight })) : null,
      isCritical: null,
      totalFloatDays: null,
    };
    return { start, finish };
  };
  childrenOf(content.wbs, null).forEach((root, index) => visit(root, `1.${index + 1}`, index));

  const { leafBudget, linkAmount } = allocate(content, input.cbsBudget);
  const cbs: CbsNode[] = content.cbs.map((row) => {
    const leaf = isLeaf(content.cbs, row.key);
    return {
      id: cbsId(row.key),
      parentId: row.parentKey ? cbsId(row.parentKey) : null,
      sortOrder: content.cbs.filter((other) => other.parentKey === row.parentKey).indexOf(row),
      code: row.code,
      title: row.title,
      isLeaf: leaf,
      costType: row.costType,
      unit: row.unit,
      estimatedQuantity: null,
      // قلم ساخته‌شده از قالب همیشه مقطوع است (۴)
      pricingMode: leaf ? 'lump_sum' : null,
      unitRate: null,
      lumpSumAmount: leaf ? (leafBudget.get(row.key) ?? 0n).toString() : null,
      supplierNote: null,
    };
  });
  const links: LinkNode[] = content.links.map((link) => ({
    wbsItemId: wbsId(link.wbsKey),
    cbsItemId: cbsId(link.cbsKey),
    quantity: null,
    allocatedAmount: (linkAmount.get(`${link.wbsKey}|${link.cbsKey}`) ?? 0n).toString(),
  }));
  const areas = content.areas.map((area) => ({ name: area.name, rootItemIds: area.wbsRootKeys.filter((key) => ids.has(`w:${key}`)).map(wbsId) }));
  return { wbs, cbs, links, areas };
}
