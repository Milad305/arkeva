import { cbsLeafBudget, linkSubBudget, scheduleSpan, type WorkCalendar } from '../../computation/index.js';
import { type CbsNode, type LinkNode, MILESTONE_GROUP_TITLE, type PlanNode } from '../../planning/index.js';
import { CONTENT_SCHEMA_VERSION, type ContentCbsRow, type ContentWbsRow, type TemplateContent, type TemplateSettings } from './content.js';

// «ذخیره به‌عنوان قالب» (templates.md ۵.۱ راه اول؛ AC-TP-07) — تابع خالص روی برنامهٔ جاری پروژه:
//   • تاریخ ← روز کاری نسبی از شروع زودترین آیتم با تقویم پروژه؛ مدت مرجع = بازهٔ کل آیتم‌ها.
//   • بودجهٔ قلم ← سهم درصدی (چهار رقم؛ باقی‌مانده به آخرین برگ تا جمع دقیقاً ۱۰۰ شود).
//   • مبلغ اتصال ← ضریب: تقسیم بر کوچک‌ترین مبلغ مثبت همان قلم و گرد کردن (حداقل ۱).
//   • سرپرست، مقدار کل، نرخ و تاریخ مطلق در خروجی نیست؛ گروه «نقاط عطف کلیدی» ویزارد هم نه (با ساخت دوباره افزوده می‌شود).

const MAX_PARTS = 10_000;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

export function captureContent(input: {
  readonly wbs: readonly PlanNode[];
  readonly cbs: readonly CbsNode[];
  readonly links: readonly LinkNode[];
  readonly calendar: WorkCalendar;
  readonly areas: readonly { readonly name: string; readonly rootItemIds: readonly string[] }[];
  readonly settings: TemplateSettings;
}): TemplateContent {
  const milestoneGroups = new Set(
    input.wbs
      .filter(
        (node) =>
          node.parentId === null &&
          node.title === MILESTONE_GROUP_TITLE &&
          input.wbs.filter((child) => child.parentId === node.id).every((child) => child.isMilestone),
      )
      .map((node) => node.id),
  );
  const wbsNodes = input.wbs.filter((node) => !milestoneGroups.has(node.id) && !(node.parentId && milestoneGroups.has(node.parentId)));
  const kept = new Set(wbsNodes.map((node) => node.id));
  const wbsKey = new Map(wbsNodes.map((node, index) => [node.id, `w${index + 1}`]));
  const cbsKey = new Map(input.cbs.map((node, index) => [node.id, `c${index + 1}`]));

  const starts = wbsNodes.flatMap((node) => (node.plannedStart ? [node.plannedStart] : []));
  const finishes = wbsNodes.flatMap((node) => (node.plannedFinish ? [node.plannedFinish] : []));
  const origin = starts.length > 0 ? starts.reduce((a, b) => (a < b ? a : b)) : null;
  const end = finishes.length > 0 ? finishes.reduce((a, b) => (a > b ? a : b)) : null;
  const workdaysBetween = (from: string, to: string) => scheduleSpan(from, to, input.calendar)?.workDays ?? 0;
  const referenceDurationWd = origin && end ? Math.max(1, workdaysBetween(origin, end)) : 1;
  /** روزهای کاری پیش از `date` از مبدأ. */
  const offsetOf = (date: string | null) => (origin && date && date > origin ? workdaysBetween(origin, date) - (workdaysBetween(date, date) > 0 ? 1 : 0) : 0);

  const areaByRoot = new Map<string, string>();
  const areas = input.areas
    .map((area, index) => ({
      key: `a${index + 1}`,
      name: area.name,
      wbsRootKeys: area.rootItemIds.filter((id) => kept.has(id)).map((id) => wbsKey.get(id) as string),
    }))
    .filter((area) => area.wbsRootKeys.length > 0);
  for (const area of areas) for (const key of area.wbsRootKeys) areaByRoot.set(key, area.key);

  const wbs: ContentWbsRow[] = wbsNodes.map((node) => {
    const key = wbsKey.get(node.id) as string;
    const leaf = node.isLeaf;
    return {
      key,
      parentKey: node.parentId ? (wbsKey.get(node.parentId) ?? null) : null,
      code: node.code,
      title: node.title,
      sortOrder: node.sortOrder,
      isMilestone: node.isMilestone,
      weightInParent: Number(node.weightInParent),
      measurementMethod: leaf && !node.isMilestone ? (node.measurementMethod ?? 'percent') : null,
      steps:
        leaf && node.measurementMethod === 'steps' ? (node.steps ?? []).map((step) => ({ key: step.key, title: step.title, weight: Number(step.weight) })) : [],
      unit: leaf ? node.unit : null,
      startOffsetWd: offsetOf(node.plannedStart),
      durationWd: node.isMilestone ? 0 : node.plannedStart && node.plannedFinish ? Math.max(1, workdaysBetween(node.plannedStart, node.plannedFinish)) : 1,
      areaKey: areaByRoot.get(key) ?? null,
    };
  });

  // سهم بودجهٔ برگ‌ها: جمع صفر ← سهم برابر
  const leaves = input.cbs.filter((node) => node.isLeaf);
  const budgets = leaves.map((node) => cbsLeafBudget(node));
  const total = budgets.reduce((sum, value) => sum + value, 0n);
  const shares = leaves.map((_, index) =>
    total > 0n ? round4(Number(((budgets[index] as bigint) * 1_000_000n) / total) / 10_000) : round4(100 / leaves.length),
  );
  if (shares.length > 0) shares[shares.length - 1] = round4(100 - shares.slice(0, -1).reduce((sum, value) => sum + value, 0));
  const shareOf = new Map(leaves.map((node, index) => [node.id, shares[index] as number]));

  const cbs: ContentCbsRow[] = input.cbs.map((node) => ({
    key: cbsKey.get(node.id) as string,
    parentKey: node.parentId ? (cbsKey.get(node.parentId) ?? null) : null,
    code: node.code,
    title: node.title,
    costType: node.costType,
    unit: node.unit,
    pricingMode: 'lump_sum',
    sharePct: node.isLeaf ? (shareOf.get(node.id) ?? 0) : null,
  }));

  const cbsById = new Map(input.cbs.map((node) => [node.id, node]));
  const links = leaves.flatMap((item) => {
    const own = input.links.filter((link) => link.cbsItemId === item.id && kept.has(link.wbsItemId));
    const amounts = own.map((link) => linkSubBudget(cbsById.get(item.id) as CbsNode, link));
    const positive = amounts.filter((amount) => amount > 0n);
    const smallest = positive.length > 0 ? positive.reduce((a, b) => (a < b ? a : b)) : 0n;
    return own.map((link, index) => ({
      wbsKey: wbsKey.get(link.wbsItemId) as string,
      cbsKey: cbsKey.get(item.id) as string,
      parts: smallest > 0n ? Math.min(MAX_PARTS, Math.max(1, Math.round(Number(((amounts[index] as bigint) * 100n) / smallest) / 100))) : 1,
    }));
  });

  return { schemaVersion: CONTENT_SCHEMA_VERSION, referenceDurationWd, wbs, cbs, links, areas, settings: input.settings };
}
