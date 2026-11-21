import { allocate, childrenOf, type ContentCbsRow, type ContentWbsRow, scaleOf, type TemplateContent } from './content.js';

// پیش‌نمایش ساخت پروژه از قالب (`GET /templates/:id/preview`؛ `[پیش‌فرض فنی]` templates.md ۱۲) — همان محاسبهٔ ۵.۳ بی ساختن
// پروژه، با درخت TemplatePreviewDto فرانت. اندیس روز کاری در پاسخ از یک است.

export interface PreviewWbsNode {
  id: string;
  code: string;
  title: string;
  weightInParent: number;
  isMilestone: boolean;
  measurementMethod: ContentWbsRow['measurementMethod'];
  unit: string | null;
  stepCount: number;
  startOffsetWd: number;
  durationWd: number;
  areaName: string | null;
  linkedCbs: { code: string; title: string; costType: string; parts: number }[];
  childWeightSum: number | null;
  previewStartWd: number;
  previewFinishWd: number;
  previewBac: string;
  children?: PreviewWbsNode[];
}

export interface PreviewCbsNode {
  id: string;
  code: string;
  title: string;
  costType: string;
  unit: string | null;
  pricingMode: 'lump_sum' | 'unit_rate';
  sharePct: number | null;
  linkCount: number;
  previewBudget: string;
  children?: PreviewCbsNode[];
}

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

export function previewOf(content: TemplateContent, input: { readonly cbsBudget: bigint; readonly workdays: number }) {
  const workdays = Math.max(1, Math.round(input.workdays));
  const { leafBudget, linkAmount } = allocate(content, input.cbsBudget);
  const bacByWbs = new Map<string, bigint>();
  for (const [key, amount] of linkAmount) {
    const wbsKey = key.split('|')[0] as string;
    bacByWbs.set(wbsKey, (bacByWbs.get(wbsKey) ?? 0n) + amount);
  }
  const cbsByKey = new Map(content.cbs.map((row) => [row.key, row]));
  const areaName = (key: string | null) => (key ? (content.areas.find((area) => area.key === key)?.name ?? null) : null);

  const wbsNode = (row: ContentWbsRow): PreviewWbsNode => {
    const children = childrenOf(content.wbs, row.key).map(wbsNode);
    const scaled = scaleOf(row, content.referenceDurationWd, workdays);
    return {
      id: row.key,
      code: row.code,
      title: row.title,
      weightInParent: row.weightInParent,
      isMilestone: row.isMilestone,
      measurementMethod: row.measurementMethod,
      unit: row.unit,
      stepCount: row.steps.length,
      startOffsetWd: row.startOffsetWd,
      durationWd: row.durationWd,
      areaName: areaName(row.areaKey),
      linkedCbs: content.links
        .filter((link) => link.wbsKey === row.key)
        .map((link) => {
          const item = cbsByKey.get(link.cbsKey);
          return { code: item?.code ?? link.cbsKey, title: item?.title ?? link.cbsKey, costType: item?.costType ?? 'other', parts: link.parts };
        }),
      childWeightSum: children.length > 0 ? round4(children.reduce((value, child) => value + child.weightInParent, 0)) : null,
      previewStartWd: children.length > 0 ? Math.min(...children.map((child) => child.previewStartWd)) : scaled.start + 1,
      previewFinishWd: children.length > 0 ? Math.max(...children.map((child) => child.previewFinishWd)) : scaled.finish + 1,
      previewBac: (children.length > 0 ? children.reduce((value, child) => value + BigInt(child.previewBac), 0n) : (bacByWbs.get(row.key) ?? 0n)).toString(),
      ...(children.length > 0 ? { children } : {}),
    };
  };

  const cbsNode = (row: ContentCbsRow): PreviewCbsNode => {
    const children = childrenOf(content.cbs, row.key).map(cbsNode);
    return {
      id: row.key,
      code: row.code,
      title: row.title,
      costType: row.costType,
      unit: row.unit,
      pricingMode: row.pricingMode,
      sharePct: row.sharePct,
      linkCount: content.links.filter((link) => link.cbsKey === row.key).length,
      previewBudget: (children.length > 0
        ? children.reduce((value, child) => value + BigInt(child.previewBudget), 0n)
        : (leafBudget.get(row.key) ?? 0n)
      ).toString(),
      ...(children.length > 0 ? { children } : {}),
    };
  };

  const cbs = childrenOf(content.cbs, null).map(cbsNode);
  return {
    wbs: childrenOf(content.wbs, null).map(wbsNode),
    cbs,
    cbsTotal: cbs.reduce((value, node) => value + BigInt(node.previewBudget), 0n).toString(),
    wbsTotal: [...bacByWbs.values()].reduce((value, amount) => value + amount, 0n).toString(),
    projectWorkdays: workdays,
    scaleFactor: round4(workdays / Math.max(1, content.referenceDurationWd)),
  };
}
