import type { CbsNode, LinkNode, PlanNode } from '../../planning/index.js';
import { type ImportCheck, skippedCodes } from './checks.js';
import { mappedTargets, type MappingRow } from './mapping.js';
import type { MspFile, MspTask } from './mspdi.js';

// فایل MSP ← محتوای مبنای کاری (msp-integration.md ۷.۱ گام ۲ و ۳) — تابع خالص. کدها همان کد WBS فایل (custom)، تاریخ از
// Start/Finish، وزن با مولد جلسه به چهار رقم و جمع دقیقاً ۱۰۰ در هر گروه (D04؛ AC-MS-02)، نقطهٔ عطف و فعالیت بی‌مدت وزن ۰،
// اقلام CBS مقطوع از هزینه زیر گروه هر فاز (۷.۱: «بودجه (اختیاری)»)، سرپرست از نخستین منبع نگاشت‌شده.

export type WeightGenerator = 'duration' | 'cost' | 'equal';
const SCALE = 10_000;
const FULL = 100 * SCALE;

export interface ResourceChoice {
  readonly name: string;
  readonly userId: string | null;
}

export interface BuildSettings {
  readonly checks: readonly ImportCheck[];
  readonly mapping: readonly MappingRow[];
  readonly buildCbs: boolean;
  readonly weightGenerator: WeightGenerator;
  readonly resources: readonly ResourceChoice[];
}

export interface BuiltPlan {
  readonly wbs: PlanNode[];
  readonly cbs: CbsNode[];
  readonly links: LinkNode[];
  /** برگ ← سرپرست نگاشت‌شده. */
  readonly supervisors: Map<string, string>;
  /** شناسهٔ آیتم ← UID فایل (ExternalIdMap). */
  readonly uids: { readonly wbsItemId: string; readonly uid: number }[];
  /** کد فایل ← برگ ساخته‌شده (برای پیشرفت اولیه). */
  readonly leaves: Map<string, PlanNode>;
  readonly groupCount: number;
  readonly withoutSupervisor: number;
  readonly totalBudget: bigint;
}

/** سهم‌ها به واحد ۰٫۰۰۰۱ درصد؛ گرد نیمه به بالا، باقی‌مانده به آخرین سهم مثبت. */
export function shareUnits(basis: readonly number[]): number[] {
  const total = basis.reduce((sum, value) => sum + value, 0);
  if (basis.length === 0 || total <= 0) return basis.map(() => 0);
  const units = basis.map((value) => Math.floor((value / total) * FULL + 0.5));
  const last = basis.reduce((found, value, index) => (value > 0 ? index : found), -1);
  units[last] = FULL - units.reduce((sum, value, index) => (index === last ? sum : sum + value), 0);
  return units;
}

const parentCode = (code: string) => (code.includes('.') ? code.split('.').slice(0, -1).join('.') : null);

export function buildPlan(file: MspFile, settings: BuildSettings, newId: () => string): BuiltPlan {
  const skipped = skippedCodes(file, settings.checks);
  const tasks = file.tasks.filter((task) => task.active && task.start && task.finish && !skipped.has(task.wbs));
  const codes = new Set(tasks.map((task) => task.wbs));
  const children = new Map<string | null, MspTask[]>();
  for (const task of tasks) {
    const parent = parentCode(task.wbs);
    const key = parent && codes.has(parent) ? parent : null;
    children.set(key, [...(children.get(key) ?? []), task]);
  }
  const kidsOf = (code: string | null) => children.get(code) ?? [];
  const targets = mappedTargets(settings.mapping);
  const useCost = settings.buildCbs && targets.has('cost');
  const useQuantity = targets.has('quantity') && targets.has('unit');
  const useSupervisor = targets.has('supervisor');
  const supervisorOf = new Map(settings.resources.filter((row) => row.userId).map((row) => [row.name, row.userId as string]));

  const isMilestone = (task: MspTask) => kidsOf(task.wbs).length === 0 && (task.isMilestone || task.durationDays === 0);
  const costBelow = (task: MspTask): number => {
    const kids = kidsOf(task.wbs);
    return kids.length === 0 ? (isMilestone(task) ? 0 : task.cost) : kids.reduce((sum, kid) => sum + costBelow(kid), 0);
  };
  const hasWork = (task: MspTask): boolean => {
    const kids = kidsOf(task.wbs);
    return kids.length === 0 ? !isMilestone(task) : kids.some(hasWork);
  };
  const weightsOf = (siblings: readonly MspTask[]): number[] => {
    const basis = siblings.map((task) => {
      if (!hasWork(task)) return 0;
      if (settings.weightGenerator === 'equal') return 1;
      if (settings.weightGenerator === 'duration') return Math.max(1, task.durationDays);
      return costBelow(task);
    });
    // «از هزینه» بی هزینه در این گروه ← مساوی میان فعالیت‌های دارای کار
    const fallback = basis.every((value) => value <= 0) ? siblings.map((task) => (hasWork(task) ? 1 : 0)) : basis;
    return shareUnits(fallback);
  };

  const wbs: PlanNode[] = [];
  const cbs: CbsNode[] = [];
  const links: LinkNode[] = [];
  const supervisors = new Map<string, string>();
  const uids: { wbsItemId: string; uid: number }[] = [];
  const leaves = new Map<string, PlanNode>();
  const phaseGroups = new Map<string, CbsNode>();
  let groupCount = 0;
  let withoutSupervisor = 0;
  let totalBudget = 0n;

  const phaseGroup = (task: MspTask): CbsNode => {
    const phaseCode = task.wbs.split('.')[0] as string;
    const existing = phaseGroups.get(phaseCode);
    if (existing) return existing;
    const phase = tasks.find((entry) => entry.wbs === phaseCode);
    const group: CbsNode = {
      id: newId(),
      parentId: null,
      sortOrder: phaseGroups.size,
      code: `C${phaseCode}`,
      title: phase && phase !== task ? phase.name : `هزینه‌های ${task.name}`,
      isLeaf: false,
      costType: 'other',
      unit: null,
      estimatedQuantity: null,
      pricingMode: null,
      unitRate: null,
      lumpSumAmount: null,
      supplierNote: null,
    };
    phaseGroups.set(phaseCode, group);
    cbs.push(group);
    return group;
  };

  const visit = (task: MspTask, parentId: string | null, sortOrder: number, units: number) => {
    const id = newId();
    const kids = kidsOf(task.wbs);
    const leaf = kids.length === 0;
    const milestone = leaf && isMilestone(task);
    const quantity = leaf && !milestone && useQuantity && task.quantity !== null && task.unit ? task.quantity : null;
    const node: PlanNode = {
      id,
      parentId,
      sortOrder,
      code: task.wbs,
      codeMode: 'custom',
      title: task.name,
      isLeaf: leaf,
      isMilestone: milestone,
      weightInParent: (units / SCALE).toFixed(4),
      plannedStart: task.start,
      plannedFinish: milestone ? task.start : task.finish,
      unit: leaf && useQuantity && task.unit ? task.unit : null,
      totalQuantity: quantity !== null ? String(quantity) : null,
      measurementMethod: leaf ? (quantity !== null ? 'quantity' : 'percent') : null,
      steps: null,
      isCritical: task.critical,
      totalFloatDays: task.totalSlackDays !== null ? String(task.totalSlackDays) : null,
    };
    wbs.push(node);
    uids.push({ wbsItemId: id, uid: task.uid });
    if (!leaf) {
      groupCount += 1;
      const weights = weightsOf(kids);
      kids.forEach((kid, index) => visit(kid, id, index, weights[index] as number));
      return;
    }
    leaves.set(task.wbs, node);
    if (milestone) return;
    if (useSupervisor) {
      const name = task.resourceNames.find((entry) => supervisorOf.has(entry));
      if (name) supervisors.set(id, supervisorOf.get(name) as string);
      else withoutSupervisor += 1;
    } else withoutSupervisor += 1;
    if (useCost && task.cost > 0) {
      const group = phaseGroup(task);
      const amount = BigInt(task.cost);
      const item: CbsNode = {
        id: newId(),
        parentId: group.id,
        sortOrder: cbs.filter((entry) => entry.parentId === group.id).length,
        // برگ سطح اول خودش گروه هم دارد؛ کد قلمش از گروه جدا بماند
        code: task.wbs === group.code.slice(1) ? `${group.code}.1` : `C${task.wbs}`,
        title: task.name,
        isLeaf: true,
        costType: 'other',
        unit: null,
        estimatedQuantity: null,
        pricingMode: 'lump_sum',
        unitRate: null,
        lumpSumAmount: amount.toString(),
        supplierNote: null,
      };
      cbs.push(item);
      links.push({ wbsItemId: id, cbsItemId: item.id, quantity: null, allocatedAmount: amount.toString() });
      totalBudget += amount;
    }
  };

  const roots = kidsOf(null);
  const rootWeights = weightsOf(roots);
  roots.forEach((root, index) => visit(root, null, index, rootWeights[index] as number));
  return { wbs, cbs, links, supervisors, uids, leaves, groupCount, withoutSupervisor, totalBudget };
}
