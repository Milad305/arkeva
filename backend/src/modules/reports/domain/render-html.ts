import type { ReportContent } from '../application/report-data.js';
import { fa, jalali, pct, ratio, rial } from './format.js';

// سند HTML گزارش برای PDF (management-reports.md ۷.۲؛ AC-MR-04): راست‌به‌چپ، Vazirmatn درون‌سند، ارقام فارسی، A4 با سرصفحه و
// پاصفحه، منحنی S برداری (SVG؛ نمودار زمانی چپ‌به‌راست)، واترمارک «پیش‌نویس» برای دورهٔ باز (AC-MR-07).

type Section = Record<string, unknown> & { key: string; title: string; empty: string | null };
type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'bigint' ? String(value) : '');
const esc = (value: unknown) => text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
const table = (head: readonly string[], rows: readonly (readonly unknown[])[]) =>
  `<table><thead><tr>${head.map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

/** منحنی S: برنامه و واقعی، محور زمان چپ‌به‌راست (CLAUDE.md ۵). */
export function curveSvg(points: readonly { planned: number | null; actual: number | null }[]): string {
  if (points.length < 2) return '';
  const width = 640;
  const height = 220;
  const x = (index: number) => 30 + (index / (points.length - 1)) * (width - 40);
  const y = (value: number) => height - 20 - (value / 100) * (height - 40);
  const path = (pick: (point: { planned: number | null; actual: number | null }) => number | null) =>
    points
      .map((point, index) => ({ value: pick(point), index }))
      .filter((entry): entry is { value: number; index: number } => entry.value !== null)
      .map((entry, order) => `${order === 0 ? 'M' : 'L'}${x(entry.index).toFixed(1)},${y(entry.value).toFixed(1)}`)
      .join(' ');
  const grid = [0, 25, 50, 75, 100]
    .map((value) => `<line x1="30" x2="${width - 10}" y1="${y(value)}" y2="${y(value)}" class="grid"/><text x="4" y="${y(value) + 4}">${fa(value)}٪</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" direction="ltr" class="curve">${grid}<path d="${path((point) => point.planned)}" class="planned"/><path d="${path((point) => point.actual)}" class="actual"/></svg>`;
}

function sectionBody(section: Section, photos: ReadonlyMap<string, string>): string {
  if (section.empty) return `<p class="empty">${esc(section.empty)}</p>`;
  switch (section.key) {
    case 'summary':
      return `<div class="kpis">${list(section['kpis'])
        .map(
          (kpi) => `<div class="kpi ${esc(kpi['tone'])}"><span>${esc(kpi['label'])}</span><b>${esc(kpi['value'])}</b><small>${esc(kpi['sub'])}</small></div>`,
        )
        .join('')}</div><p>${esc(section['text'])}</p>`;
    case 'progress':
      return `${curveSvg(list(section['curve']) as { planned: number | null; actual: number | null }[])}<p class="legend"><span class="planned">برنامه</span> <span class="actual">واقعی</span></p>${table(
        ['کد', 'عنوان', 'انحراف'],
        list(section['deviations']).map((row) => [row['code'], row['title'], pct(Number(row['deviation']))]),
      )}`;
    case 'cost':
      return `${table(
        ['BAC', 'AC', 'EV', 'EAC', 'CPI', 'TCPI'],
        [
          [
            rial(String(section['bac'])),
            rial(String(section['ac'])),
            rial(String(section['ev'])),
            rial(String(section['eac'])),
            ratio(section['cpi'] as number | null),
            ratio(section['tcpi'] as number | null),
          ],
        ],
      )}${table(
        ['نوع هزینه', 'سهم بودجه'],
        list(section['byType']).map((row) => [row['label'], pct(Number(row['percent']))]),
      )}`;
    case 'cost_ledger':
      return `${table(
        ['کد', 'عنوان', 'بودجه', 'هزینهٔ بازه', 'مصرف'],
        list(section['rows']).map((row) => [
          row['code'],
          row['title'],
          rial(String(row['budget'])),
          rial(String(row['ac'])),
          pct(Number(row['consumedPercent'])),
        ]),
      )}<p>جمع هزینهٔ بازه: ${esc(rial(String(section['total'])))} ریال</p>`;
    case 'risks':
      return `<p>${fa(Number(section['openCount']))} ریسک باز، ${fa(Number(section['criticalCount']))} بحرانی</p>${table(
        ['کد', 'عنوان', 'امتیاز'],
        list(section['items']).map((row) => [row['code'], row['title'], row['score'] === null ? '—' : fa(Number(row['score']))]),
      )}`;
    case 'resources':
      return `<p>${fa(Number(section['reportCount']))} گزارش؛ پوشش ${pct(Number(section['coveragePercent']))}؛ میانگین زمان تأیید ${fa(Number(section['avgApprovalHours']))} ساعت</p>${table(
        ['سرپرست', 'روزهای گزارش', 'پوشش'],
        list(section['supervisors']).map((row) => [row['name'], fa(Number(row['reports'])), pct(Number(row['coveragePercent']))]),
      )}`;
    case 'field':
      return `<p>${esc(section['text'])}</p>`;
    case 'photos':
      return `<div class="photos">${list(section['items'])
        .map((row) => {
          const src = photos.get(text(row['storageKey']));
          return `<figure>${src ? `<img src="${src}"/>` : '<div class="placeholder"></div>'}<figcaption>${esc(row['code'])} ${esc(row['title'])} · ${jalali(String(row['takenAt']))}</figcaption></figure>`;
        })
        .join('')}</div>`;
    case 'milestones':
      return table(
        ['نقطهٔ عطف', 'تاریخ برنامه', 'تأخیر (روز کاری)'],
        list(section['items']).map((row) => [
          row['title'],
          jalali(String(row['plannedDate'])),
          row['delayWorkingDays'] === null ? '—' : fa(Number(row['delayWorkingDays'])),
        ]),
      );
    case 'integration':
      return table(
        ['مورد', 'وضعیت'],
        list(section['rows']).map((row) => [row['label'], row['value']]),
      );
    case 'portfolio':
      return table(
        ['کد', 'پروژه', 'برنامه', 'واقعی', 'انحراف', 'CPI', 'SPI'],
        list(section['rows']).map((row) => [
          row['code'],
          row['name'],
          pct(Number(row['plannedPercent'])),
          pct(Number(row['actualPercent'])),
          pct(Number(row['deviation'])),
          ratio(row['cpi'] as number | null),
          ratio(row['spi'] as number | null),
        ]),
      );
    default:
      return '';
  }
}

export function renderHtml(content: ReportContent, assets: { readonly fontCss: string; readonly photos: ReadonlyMap<string, string> }): string {
  const header = content.header;
  const sections = (content.sections as Section[])
    .map((section) => `<section><h2>${esc(section.title)}</h2>${sectionBody(section, assets.photos)}</section>`)
    .join('');
  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>${esc(content.templateName)}</title>
<style>
${assets.fontCss}
@page { size: A4; margin: 22mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Vazirmatn', sans-serif; font-size: 10.5pt; color: #1f2937; direction: rtl; }
header.cover { border-bottom: 2px solid #1d4ed8; padding-bottom: 6px; margin-bottom: 12px; }
header.cover h1 { font-size: 16pt; margin: 0 0 4px; }
header.cover p { margin: 0; color: #4b5563; }
section { break-inside: avoid; margin-bottom: 14px; }
h2 { font-size: 12.5pt; color: #1d4ed8; margin: 0 0 6px; }
table { width: 100%; border-collapse: collapse; margin: 6px 0; }
th, td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: right; }
th { background: #eff6ff; }
.kpis { display: flex; gap: 8px; }
.kpi { flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; }
.kpi span, .kpi small { display: block; color: #6b7280; font-size: 9pt; }
.kpi b { font-size: 14pt; }
.kpi.err b { color: #b91c1c; } .kpi.wrn b { color: #b45309; } .kpi.ok b { color: #15803d; }
.empty { color: #6b7280; }
svg.curve { width: 100%; height: auto; } svg.curve .grid { stroke: #e5e7eb; } svg.curve text { font-size: 9px; fill: #6b7280; }
svg.curve path { fill: none; stroke-width: 2; } svg.curve .planned { stroke: #9ca3af; stroke-dasharray: 4 3; } svg.curve .actual { stroke: #1d4ed8; }
.legend .planned { color: #6b7280; } .legend .actual { color: #1d4ed8; }
.photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.photos img, .photos .placeholder { width: 100%; height: 120px; object-fit: cover; background: #f3f4f6; border-radius: 4px; }
figure { margin: 0; } figcaption { font-size: 8.5pt; color: #4b5563; }
.watermark { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 72pt; color: rgba(185, 28, 28, 0.08); transform: rotate(-30deg); }
.note { color: #b45309; font-size: 9pt; }
</style></head>
<body>
${content.watermark === 'open_period' ? '<div class="watermark">پیش‌نویس</div>' : ''}
<header class="cover"><h1>${esc(content.templateName)}</h1><p>${esc(header.orgName)} · ${esc(header.projectName)} ${esc(header.projectCode)}</p><p>${esc(header.rangeLabel)}${header.clientName ? ` · کارفرما: ${esc(header.clientName)}` : ''}${header.managerName ? ` · مدیر پروژه: ${esc(header.managerName)}` : ''}</p></header>
${sections}
${content.openPeriodNote ? `<p class="note">${esc(content.openPeriodNote)}</p>` : ''}
</body></html>`;
}

/** پاصفحه و سرصفحهٔ Chromium (۷.۲ بند ۳). */
export function pageTemplates(content: ReportContent, fontCss: string) {
  const style = `<style>${fontCss} .f { font-family: 'Vazirmatn', sans-serif; font-size: 8pt; color: #6b7280; width: 100%; padding: 0 14mm; direction: rtl; display: flex; justify-content: space-between; }</style>`;
  return {
    header: `${style}<div class="f"><span>${esc(content.header.orgName)} · ${esc(content.header.projectName)}</span><span>${esc(content.header.rangeLabel)}</span></div>`,
    footer: `${style}<div class="f"><span>تولید خودکار در پروژه‌یار · ${esc(content.header.generatedAtLabel)}</span><span>صفحهٔ <span class="pageNumber"></span> از <span class="totalPages"></span></span></div>`,
  };
}
