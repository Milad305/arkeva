import { SETTINGS_DEFAULTS, type TemplateContent } from '../../src/modules/templates/domain/content.js';

// قالب مثال مرجع (templates.md ۵.۳؛ 00-overview.md ۶) برای تست واحد و یکپارچگی F16.

/** قالب مثال مرجع (۵.۳، «مثال مرجع»). */
export function referenceTemplate(): TemplateContent {
  const leaf = (
    key: string,
    parentKey: string,
    code: string,
    title: string,
    weight: number,
    off: number,
    dur: number,
    method: 'quantity' | 'steps' | 'percent',
    unit: string | null = null,
  ) => ({
    key,
    parentKey,
    code,
    title,
    sortOrder: Number(code.split('.').at(-1)),
    isMilestone: false,
    weightInParent: weight,
    measurementMethod: method,
    steps:
      method === 'steps'
        ? [
            { key: 'formwork', title: 'قالب', weight: 20 },
            { key: 'rebar', title: 'آرماتور', weight: 20 },
            { key: 'concrete', title: 'بتن', weight: 60 },
          ]
        : [],
    unit,
    startOffsetWd: off,
    durationWd: dur,
    areaKey: null,
  });
  return {
    schemaVersion: 1,
    referenceDurationWd: 156,
    wbs: [
      {
        key: 'g1',
        parentKey: null,
        code: '1.1',
        title: 'فونداسیون',
        sortOrder: 1,
        isMilestone: false,
        weightInParent: 40,
        measurementMethod: null,
        steps: [],
        unit: null,
        startOffsetWd: 0,
        durationWd: 65,
        areaKey: 'a1',
      },
      leaf('l111', 'g1', '1.1.1', 'خاکبرداری', 30, 0, 26, 'quantity', 'مترمکعب'),
      leaf('l112', 'g1', '1.1.2', 'بتن‌ریزی فونداسیون', 70, 26, 39, 'quantity', 'مترمکعب'),
      {
        key: 'g2',
        parentKey: null,
        code: '1.2',
        title: 'اسکلت',
        sortOrder: 2,
        isMilestone: false,
        weightInParent: 60,
        measurementMethod: null,
        steps: [],
        unit: null,
        startOffsetWd: 52,
        durationWd: 104,
        areaKey: 'a1',
      },
      leaf('l121', 'g2', '1.2.1', 'ستون‌ها', 50, 52, 52, 'steps'),
      leaf('l122', 'g2', '1.2.2', 'سقف', 50, 104, 52, 'percent'),
    ],
    cbs: [
      { key: 'C1', parentKey: null, code: 'C1', title: 'خاکبرداری (پیمانکار جزء)', costType: 'subcontract', unit: null, pricingMode: 'lump_sum', sharePct: 10 },
      { key: 'C2', parentKey: null, code: 'C2', title: 'بتن آماده', costType: 'materials', unit: 'مترمکعب', pricingMode: 'lump_sum', sharePct: 40 },
      { key: 'C3', parentKey: null, code: 'C3', title: 'آرماتور', costType: 'materials', unit: 'تن', pricingMode: 'lump_sum', sharePct: 30 },
      { key: 'C4', parentKey: null, code: 'C4', title: 'نیروی انسانی اسکلت', costType: 'labor', unit: null, pricingMode: 'lump_sum', sharePct: 20 },
    ],
    links: [
      { wbsKey: 'l111', cbsKey: 'C1', parts: 1 },
      { wbsKey: 'l112', cbsKey: 'C2', parts: 4 },
      { wbsKey: 'l121', cbsKey: 'C2', parts: 1 },
      { wbsKey: 'l122', cbsKey: 'C2', parts: 3 },
      { wbsKey: 'l112', cbsKey: 'C3', parts: 1 },
      { wbsKey: 'l121', cbsKey: 'C3', parts: 1 },
      { wbsKey: 'l122', cbsKey: 'C3', parts: 1 },
      { wbsKey: 'l121', cbsKey: 'C4', parts: 3 },
      { wbsKey: 'l122', cbsKey: 'C4', parts: 1 },
    ],
    areas: [{ key: 'a1', name: 'همه', wbsRootKeys: ['g1', 'g2'] }],
    settings: { ...SETTINGS_DEFAULTS },
  };
}
