import { describe, expect, it } from 'vitest';
import type { ReportContent } from '../application/report-data.js';
import { reportFontCss } from '../infrastructure/pdf-renderer.js';
import { curveSvg, renderHtml } from './render-html.js';
import { renderXls } from './render-xls.js';

// فایل گزارش (management-reports.md ۷.۲؛ AC-MR-04، AC-MR-07).

const content = (watermark: 'none' | 'open_period'): ReportContent => ({
  templateId: 'rt-weekly',
  templateName: 'وضعیت هفتگی پروژه',
  audience: 'internal',
  scope: 'project',
  includesAmounts: true,
  amountsHiddenByPermission: false,
  header: {
    orgName: 'سازمان',
    projectName: 'پروژه',
    projectCode: 'PRJ-1405-001',
    clientName: 'کارفرما',
    managerName: 'مدیر',
    rangeLabel: 'هفته',
    generatedAtLabel: 'امروز',
  },
  sourceKind: watermark === 'none' ? 'period_snapshot' : 'live',
  watermark,
  openPeriodNote: watermark === 'none' ? null : 'دورهٔ باز؛ اعداد ممکن است تغییر کنند.',
  pageCount: 2,
  sections: [
    { key: 'summary', title: 'خلاصهٔ مدیریتی', empty: null, kpis: [{ label: 'پیشرفت واقعی', value: '۴۹٫۲٪', sub: 'برنامه ۵۵٪', tone: 'wrn' }], text: 'متن' },
    { key: 'cost', title: 'هزینه', empty: null, bac: '1000000000', ac: '520000000', ev: '490000000', eac: '1061224490', cpi: 0.9423, tcpi: 1.1, byType: [] },
    {
      key: 'progress',
      title: 'پیشرفت',
      empty: null,
      curve: [
        { planned: 0, actual: 0 },
        { planned: 55, actual: 49.2 },
        { planned: 100, actual: null },
      ],
      deviations: [],
    },
  ],
});

describe('گزارش: فایل', () => {
  it('AC-MR-04 — HTML راست‌به‌چپ، Vazirmatn درون‌سند، ارقام فارسی و منحنی S برداری', () => {
    const fontCss = reportFontCss();
    expect(fontCss).toContain("font-family: 'Vazirmatn'");
    expect(fontCss).toContain('data:font/woff2;base64,');
    const html = renderHtml(content('none'), { fontCss, photos: new Map() });
    expect(html).toContain('<html lang="fa" dir="rtl">');
    expect(html).toContain('۱٬۰۰۰٬۰۰۰٬۰۰۰');
    expect(html).toContain('۰٫۹۴');
    expect(html).toMatch(/<svg[^>]*class="curve"/);
    expect(html).not.toContain('class="watermark"');
    // بی منبع بیرونی جز فضای نام SVG
    expect(html.replaceAll('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:\/\//);
  });

  it('AC-MR-07 — بازهٔ باز واترمارک «پیش‌نویس» و برچسب پایین صفحه', () => {
    const html = renderHtml(content('open_period'), { fontCss: '', photos: new Map() });
    expect(html).toContain('<div class="watermark">پیش‌نویس</div>');
    expect(html).toContain('دورهٔ باز؛ اعداد ممکن است تغییر کنند.');
    expect(curveSvg([{ planned: 1, actual: null }])).toBe('');
  });

  it('Excel: هر بخش یک برگهٔ راست‌به‌چپ؛ مبلغ ریال خام', () => {
    const xls = renderXls(content('none'));
    expect(xls.match(/<Worksheet /g)).toHaveLength(4);
    expect(xls).toContain('<Data ss:Type="Number">1000000000</Data>');
    expect(xls).toContain('<DisplayRightToLeft/>');
  });
});
