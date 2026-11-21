import type { CbsNode } from '../../planning/index.js';
import { cbsLeafBudget } from '../domain/formulas/cbs.js';
import type { CbsItemProgress } from '../domain/progress.entities.js';
import { amountText, costNote, type ExplainMetric, million, pct, ratio } from './explain-format.js';
import { DomainError } from '../../../platform/http/errors.js';

// بخش‌های مشترک و قلم CBS «این عدد از کجا آمد؟» (جدا از explain.ts برای اندازهٔ فایل).

export interface Source {
  kind: 'wbs_item' | 'cbs_item' | 'cost_entry' | 'plan_version';
  id: string;
  code: string | null;
  label: string;
  detail: string;
  sharePercent: number | null;
}

export type Body = { valueText: string; formula: string; sources: Source[]; costIndicesNote: string | null };

export const share = (part: number, total: number): number | null => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);
export const top = (sources: Source[]): Source[] => [...sources].sort((a, b) => (b.sharePercent ?? 0) - (a.sharePercent ?? 0)).slice(0, 5);

const unavailable = (reason: string) => new DomainError('METRIC_NOT_AVAILABLE', 422, { reason });

/** عددهای یک قلم CBS (cbs.md ۸). */
export function cbsItemBody(metric: ExplainMetric, row: CbsItemProgress, label: string, amounts: boolean, budget: bigint): Body {
  const note = costNote(row.costIndicesDate);
  const cpi = row.cpi === null || row.cpi === undefined ? null : Number(row.cpi);
  if (metric === 'cpi') {
    return {
      valueText: cpi === null ? '—' : cpi.toFixed(2),
      formula: amounts ? `CPI = EV ÷ AC = ${million(row.ev)} ÷ ${million(row.ac)} = ${ratio(cpi)}` : `CPI = EV ÷ AC = ${ratio(cpi)}`,
      sources: [],
      costIndicesNote: note,
    };
  }
  if (metric === 'eac') {
    return {
      valueText: amountText(row.eac),
      formula: `پیش‌بینی ${label} = بودجه × AC ÷ EV = ${million(row.eac)}${row.eacLowConfidence ? ' (کم‌اعتبار: EV زیر ۱۰٪ بودجه)' : ''}`,
      sources: [],
      costIndicesNote: note,
    };
  }
  if (metric === 'ac' || metric === 'ev')
    return { valueText: amountText(row[metric]), formula: `${metric.toUpperCase()} ${label} = ${million(row[metric])}`, sources: [], costIndicesNote: note };
  if (metric !== 'cbs_consumption') throw unavailable('این عدد برای قلم CBS تعریف نشده است.');
  const consumed = Number(row.consumedPercent ?? 0);
  return {
    valueText: pct(consumed),
    formula: amounts ? `AC ÷ بودجه = ${million(row.ac)} ÷ ${million(budget)} = ${pct(consumed)}` : `AC ÷ بودجه = ${pct(consumed)}`,
    sources: [],
    costIndicesNote: note,
  };
}

/** بودجهٔ قلم: برگ از نرخ و مقدار، والد جمع زیرقلم‌ها (cbs.md ۶). */
export function budgetOf(nodes: readonly CbsNode[], id: string): bigint {
  const node = nodes.find((entry) => entry.id === id);
  if (!node) return 0n;
  if (node.isLeaf) return cbsLeafBudget(node);
  return nodes.filter((entry) => entry.parentId === id).reduce((sum, child) => sum + budgetOf(nodes, child.id), 0n);
}
