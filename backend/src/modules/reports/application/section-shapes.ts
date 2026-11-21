import { cbsLeafBudget } from '../../computation/index.js';
import { delayWorkDays } from '../../computation/reads.js';
import type { CbsNode } from '../../planning/index.js';
import type { SectionKey } from '../domain/catalog.js';
import type { ProjectFacts } from './report-sections.js';

// شکل بخش‌های بی پرس‌وجو (management-reports.md ۴): جای خالی، هزینه از عددهای داده‌شده و نقاط عطف.

const COST_TYPES: Record<string, string> = {
  materials: 'مصالح',
  labor: 'نیروی انسانی',
  equipment: 'ماشین‌آلات',
  subcontract: 'پیمانکار جزء',
  overhead: 'بالاسری و تجهیز کارگاه',
  transport: 'حمل',
  other: 'سایر',
};

export function blankSection(key: SectionKey): Record<string, unknown> {
  if (key === 'cost') return { bac: '0', ac: '0', ev: '0', eac: '0', cpi: null, tcpi: null, byType: [] };
  if (key === 'cost_ledger') return { rows: [], total: '0' };
  if (key === 'summary') return { kpis: [], text: '' };
  if (key === 'progress') return { curve: [], todayIndex: 0, plannedPercent: 0, actualPercent: 0, deviations: [] };
  return { items: [] };
}

export function costSection(cbs: readonly CbsNode[], values: { bac: string; ac: string; ev: string; eac: string; cpi: number | null; tcpi: number | null }) {
  const leaves = cbs.filter((node) => node.isLeaf);
  const total = leaves.reduce((sum, node) => sum + cbsLeafBudget(node), 0n);
  const byType = new Map<string, bigint>();
  for (const node of leaves) byType.set(node.costType, (byType.get(node.costType) ?? 0n) + cbsLeafBudget(node));
  return {
    bac: values.bac,
    ac: values.ac,
    ev: values.ev,
    eac: values.eac,
    cpi: values.cpi,
    tcpi: values.tcpi,
    byType: [...byType]
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .map(([type, amount]) => ({ type, label: COST_TYPES[type] ?? type, percent: total > 0n ? Math.round(Number((amount * 10_000n) / total)) / 100 : 0 })),
  };
}

export function milestonesSection(facts: ProjectFacts) {
  const items = facts.content.wbs
    .filter((node) => node.isLeaf && node.isMilestone && node.plannedFinish)
    .sort((a, b) => (a.plannedFinish as string).localeCompare(b.plannedFinish as string))
    .slice(0, 8)
    .map((node) => {
      const view = facts.items.get(node.id);
      const forecast = view?.status === 'completed' ? null : (view?.forecastFinish ?? null);
      return {
        title: node.title,
        plannedDate: node.plannedFinish as string,
        status: view?.status ?? 'not_started',
        delayWorkingDays: forecast ? delayWorkDays(node.plannedFinish as string, forecast, facts.rules.calendar) : null,
      };
    });
  return { items, empty: items.length === 0 ? 'این پروژه نقطهٔ عطفی ندارد.' : null };
}
