import { useMemo, useState } from 'react';

import type { WbsProgressStatus } from '@/config/constants';
import { formatJalaliDate, formatJalaliMonthShort, jalaliMonthStarts } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { HoverTipRow } from '@/shared/components/charts/ChartTooltip';
import { useHoverTip } from '@/shared/components/charts/useHoverTip';
import type { GanttRowDto, HeatmapRowDto, TreemapLeafDto } from '../../types/analytics';

// اجزای رسم W21–W24 — فقط هندسه از داده‌های سرور (AC-CH-09).

export const STATUS_COLOR: Record<WbsProgressStatus, { bg: string; fg: string; bar: string }> = {
  completed: { bg: '#D1FADF', fg: '#15803D', bar: '#16A34A' },
  on_track: { bg: '#E5EBF3', fg: '#1A3354', bar: '#2563EB' },
  ahead: { bg: '#D1FADF', fg: '#15803D', bar: '#16A34A' },
  warning: { bg: '#FEF0C7', fg: '#B45309', bar: '#D97706' },
  critical: { bg: '#FEE2E2', fg: '#B91C1C', bar: '#DC2626' },
  not_started: { bg: '#F4F4F5', fg: '#52525B', bar: '#A1A1AA' },
};

// ── دونات ──

export function Donut({ slices, centerTop, centerValue, centerBottom, label }: { slices: Array<{ color: string; value: number; label: string }>; centerTop: string; centerValue: string; centerBottom: string; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const circumference = 2 * Math.PI * 70;
  const tip = useHoverTip();
  let offset = 0;
  return (
    <>
    <svg width={190} height={190} viewBox="0 0 190 190" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <g transform="rotate(-90 95 95)" fill="none" strokeWidth={26}>
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const element = (
            <circle
              key={slice.label}
              cx={95}
              cy={95}
              r={70}
              stroke={slice.color}
              strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`}
              strokeDashoffset={-offset}
              {...tip.on(<HoverTipRow color={slice.color} label={slice.label} value={formatPercentAuto((slice.value / total) * 100)} />)}
            />
          );
          offset += length;
          return element;
        })}
      </g>
      <text x={95} y={86} textAnchor="middle" fontSize={11} fill="#71717A" fontFamily="Vazirmatn">
        {centerTop}
      </text>
      <text x={95} y={108} textAnchor="middle" fontSize={20} fontWeight={700} fill="#18181B" fontFamily="Vazirmatn">
        {centerValue}
      </text>
      <text x={95} y={124} textAnchor="middle" fontSize={10.5} fill="#71717A" fontFamily="Vazirmatn">
        {centerBottom}
      </text>
    </svg>
    {tip.node}
    </>
  );
}

// ── گانت فشرده (راست‌به‌چپ؛ charts.md ۶.۳) ──

export function CompactGantt({ start, finish, rows, today }: { start: string; finish: string; rows: GanttRowDto[]; today: string }) {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  const t1 = Date.parse(`${finish}T00:00:00Z`);
  const pos = (date: string) => Math.min(100, Math.max(0, ((Date.parse(`${date}T00:00:00Z`) - t0) / Math.max(1, t1 - t0)) * 100));
  const months = jalaliMonthStarts(start, finish);
  const step = Math.max(1, Math.ceil(months.length / 8));
  const ticks = months.filter((_, index) => index % step === 0);
  const tip = useHoverTip();
  return (
    <div className="col" role="table" aria-label="گانت فشردهٔ دو سطح اول WBS">
      <div className="gantt-row" style={{ borderBottom: '1px solid #E4E4E7', background: '#FAFAFA' }} role="row">
        <span className="sect-t" style={{ padding: '8px 12px' }} role="columnheader">
          فعالیت
        </span>
        <div style={{ position: 'relative', height: 30 }} role="columnheader" aria-label="زمان">
          {ticks.map((date) => (
            <span key={date} className="t-xs tx5" style={{ position: 'absolute', top: 8, right: `${pos(date)}%`, transform: 'translateX(50%)', whiteSpace: 'nowrap' }}>
              {formatJalaliMonthShort(date)}
            </span>
          ))}
        </div>
      </div>
      {rows.map((row) => {
        const color = STATUS_COLOR[row.status].bar;
        const label = `${row.code} ${row.title}: برنامه ${formatJalaliDate(row.plannedStart)} تا ${formatJalaliDate(row.plannedFinish)}؛ واقعی ${formatPercentAuto(row.actualPercent)}`;
        return (
          <div
            key={row.id}
            className="gantt-row"
            style={{ borderBottom: '1px solid #FAFAFA', alignItems: 'center' }}
            role="row"
            {...tip.on(
              <>
                <span className="chart-tip-title">{`${row.code} ${row.title}`}</span>
                <HoverTipRow color="#D4D4D8" label="برنامه" value={`${formatJalaliDate(row.plannedStart)} تا ${formatJalaliDate(row.plannedFinish)}`} />
                <HoverTipRow color={color} label="واقعی" value={formatPercentAuto(row.actualPercent)} />
              </>,
            )}
          >
            <span className={`row g6 t-12 ${row.depth ? 'tx7' : 'fw6 tx9'}`} style={{ padding: '8px 12px', paddingInlineStart: 12 + row.depth * 16, minWidth: 0 }} role="cell">
              <span className="mono t-xs tx5">{row.code}</span>
              <span className="trunc">{row.title}</span>
            </span>
            <div style={{ position: 'relative', height: 32 }} role="cell" aria-label={label}>
              <span style={{ position: 'absolute', top: 7, height: 8, borderRadius: 999, background: '#D4D4D8', right: `${pos(row.plannedStart)}%`, width: `${Math.max(0.6, pos(row.plannedFinish) - pos(row.plannedStart))}%` }} />
              {row.actualStart && row.actualEnd && (
                <span style={{ position: 'absolute', top: 17, height: 7, borderRadius: 999, background: color, right: `${pos(row.actualStart)}%`, width: `${Math.max(0.6, pos(row.actualEnd) - pos(row.actualStart))}%` }} />
              )}
              {row.milestones.map((milestone) => (
                <span
                  key={`${milestone.date}-${milestone.title}`}
                  {...tip.on(
                    <>
                      <span className="chart-tip-title">{milestone.title}</span>
                      <HoverTipRow color={milestone.late ? '#DC2626' : '#E07A2C'} label="نقطهٔ عطف" value={formatJalaliDate(milestone.date)} />
                    </>,
                  )}
                  style={{ position: 'absolute', top: 6, width: 11, height: 11, transform: 'translateX(50%) rotate(45deg)', border: '2px solid #FFFFFF', background: milestone.late ? '#DC2626' : '#E07A2C', right: `${pos(milestone.date)}%` }}
                />
              ))}
              <span style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, background: '#DC2626', right: `${pos(today)}%` }} />
            </div>
          </div>
        );
      })}
      {tip.node}
    </div>
  );
}

// ── heatmap گزارش روزانه (راست‌به‌چپ؛ charts.md ۶.۵) ──

const HEAT = ['#F4F4F5', '#C7D3E3', '#8AA2C2', '#4F6A90', '#1A3354'];
const HATCH = 'repeating-linear-gradient(45deg, #E4E4E7 0 2px, #FFFFFF 2px 4px)';

export function ReportHeatmap({ days, rows }: { days: Array<{ date: string; holiday: boolean }>; rows: HeatmapRowDto[] }) {
  const tip = useHoverTip();
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="heat" style={{ borderCollapse: 'separate', borderSpacing: 3, minWidth: 260 + days.length * 22 }}>
        <thead>
          <tr>
            <th className="t-xs tx5" style={{ textAlign: 'start', paddingInlineEnd: 8, fontWeight: 600 }}>
              سرپرست
            </th>
            {days.map((day) => (
              <th key={day.date} className="t-xs" style={{ color: day.holiday ? '#A1A1AA' : '#71717A', fontWeight: 400, width: 18 }}>
                {toFaDigits(Number(formatJalaliDate(day.date).slice(-2)))}
              </th>
            ))}
            <th className="t-xs tx5" style={{ paddingInlineStart: 10 }}>گزارش</th>
            <th className="t-xs tx5">پوشش</th>
            <th className="t-xs tx5">عکس/گزارش</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user.id} style={{ opacity: row.hasOpenWork ? 1 : 0.55 }}>
              <th className="t-12 tx8" style={{ textAlign: 'start', fontWeight: 500, whiteSpace: 'nowrap', paddingInlineEnd: 8 }}>
                {row.user.fullName}
              </th>
              {row.cells.map((cell) => {
                const text = `${row.user.fullName} · ${formatJalaliDate(cell.date)} · ${cell.holiday ? 'تعطیل' : cell.queued ? 'در صف همگام‌سازی' : `${toFaDigits(cell.count)} گزارش`}`;
                return (
                  <td
                    key={cell.date}
                    aria-label={text}
                    {...tip.on(
                      <>
                        <span className="chart-tip-title">{row.user.fullName}</span>
                        <HoverTipRow label={formatJalaliDate(cell.date)} value={cell.holiday ? 'تعطیل' : cell.queued ? 'در صف همگام‌سازی' : `${toFaDigits(cell.count)} گزارش`} />
                      </>,
                    )}
                    style={{ width: 18, height: 18, borderRadius: 4, background: cell.holiday ? HATCH : cell.queued ? '#FFF8EB' : HEAT[Math.min(4, cell.count)], boxShadow: cell.queued ? 'inset 0 0 0 1.5px #D97706' : cell.holiday ? 'inset 0 0 0 1px #E4E4E7' : undefined }} />
                );
              })}
              <td className="t-12 fw6 tx9" style={{ paddingInlineStart: 10, textAlign: 'center' }}>
                {toFaDigits(row.total)}
              </td>
              <td className="t-12" style={{ textAlign: 'center', color: row.coveragePercent == null ? '#71717A' : row.coveragePercent >= 90 ? '#1A3354' : row.coveragePercent >= 75 ? '#B45309' : '#B91C1C' }}>
                {row.coveragePercent == null ? '—' : formatPercentAuto(row.coveragePercent)}
              </td>
              <td className="t-12" style={{ textAlign: 'center', color: row.photosPerReport < 1 ? '#B91C1C' : row.photosPerReport < 2 ? '#B45309' : '#1A3354' }}>
                {row.hasOpenWork ? toFaDigits(String(row.photosPerReport)).replace('.', '٫') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row wrap g12 t-xs tx5" style={{ paddingTop: 8 }}>
        <span className="row g4">
          کمتر
          {HEAT.map((color) => (
            <span key={color} style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
          ))}
          بیشتر
        </span>
        <span className="row g4">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: HATCH, boxShadow: 'inset 0 0 0 1px #E4E4E7' }} />
          تعطیل
        </span>
        <span className="row g4">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#FFF8EB', boxShadow: 'inset 0 0 0 1.5px #D97706' }} />
          در صف همگام‌سازی
        </span>
      </div>
      {tip.node}
    </div>
  );
}

// ── treemap (squarified) — اندازه = وزن، رنگ = انحراف ──

interface Rect {
  leaf: TreemapLeafDto;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: TreemapLeafDto[], x: number, y: number, w: number, h: number): Rect[] {
  const total = items.reduce((sum, item) => sum + Math.max(item.weight, 0.05), 0) || 1;
  const scale = (w * h) / total;
  const nodes = [...items].sort((a, b) => b.weight - a.weight).map((leaf) => ({ leaf, area: Math.max(leaf.weight, 0.05) * scale }));
  const out: Rect[] = [];
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;
  let row: typeof nodes = [];
  const worst = (entries: typeof nodes, side: number) => {
    const sum = entries.reduce((total2, entry) => total2 + entry.area, 0);
    const max = Math.max(...entries.map((entry) => entry.area));
    const min = Math.min(...entries.map((entry) => entry.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };
  const layout = (entries: typeof nodes) => {
    const sum = entries.reduce((total2, entry) => total2 + entry.area, 0);
    if (rw >= rh) {
      const colW = sum / rh;
      let cy = ry;
      entries.forEach((entry) => {
        const height = entry.area / colW;
        out.push({ leaf: entry.leaf, x: rx, y: cy, w: colW, h: height });
        cy += height;
      });
      rx += colW;
      rw -= colW;
    } else {
      const rowH = sum / rw;
      let cx = rx;
      entries.forEach((entry) => {
        const width = entry.area / rowH;
        out.push({ leaf: entry.leaf, x: cx, y: ry, w: width, h: rowH });
        cx += width;
      });
      ry += rowH;
      rh -= rowH;
    }
  };
  for (const node of nodes) {
    const side = Math.min(rw, rh);
    if (row.length === 0 || worst([...row, node], side) <= worst(row, side)) row.push(node);
    else {
      layout(row);
      row = [node];
    }
  }
  if (row.length) layout(row);
  return out;
}

export function deviationLook(leaf: Pick<TreemapLeafDto, 'status' | 'deviation' | 'outOfBaseline'>): { bg: string; fg: string } {
  if (leaf.outOfBaseline) return { bg: '#E4E4E7', fg: '#3F3F46' };
  if (leaf.status === 'critical' && leaf.deviation <= -25) return { bg: '#DC2626', fg: '#FFFFFF' };
  return STATUS_COLOR[leaf.status];
}

export function DeviationTreemap({ leaves, selectedId, onSelect }: { leaves: TreemapLeafDto[]; selectedId: string | null; onSelect: (leaf: TreemapLeafDto) => void }) {
  const W = 840;
  const H = 400;
  const rects = useMemo(() => squarify(leaves, 0, 0, W, H), [leaves]);
  const [hover, setHover] = useState<string | null>(null);
  const tip = useHoverTip();
  return (
    <>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="نقشهٔ حرارتی انحراف آیتم‌های WBS" style={{ display: 'block', direction: 'ltr' }}>
      {rects.map((rect) => {
        const look = deviationLook(rect.leaf);
        const selected = rect.leaf.id === selectedId;
        const label = `${rect.leaf.code} ${rect.leaf.title}: وزن ${formatPercentAuto(rect.leaf.weight)}، واقعی ${formatPercentAuto(rect.leaf.actualPercent)} از برنامهٔ ${formatPercentAuto(rect.leaf.plannedPercent)}${rect.leaf.outOfBaseline ? '، خارج از مبنا' : ''}`;
        const big = rect.w > 70 && rect.h > 38;
        return (
          <g
            key={rect.leaf.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onSelect(rect.leaf)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(rect.leaf);
              }
            }}
            onMouseEnter={() => setHover(rect.leaf.id)}
            onMouseLeave={() => setHover(null)}
            {...tip.on(
              <>
                <span className="chart-tip-title">{`${rect.leaf.code} ${rect.leaf.title}`}</span>
                <HoverTipRow label="وزن" value={formatPercentAuto(rect.leaf.weight)} />
                <HoverTipRow color={look.bg} label="واقعی" value={formatPercentAuto(rect.leaf.actualPercent)} />
                <HoverTipRow color="#D4D4D8" label="برنامه‌ای" value={formatPercentAuto(rect.leaf.plannedPercent)} />
                {rect.leaf.outOfBaseline && <span className="chart-tip-note">خارج از مبنا</span>}
              </>,
            )}
            style={{ cursor: 'pointer' }}
          >
            <rect x={rect.x + 1.5} y={rect.y + 1.5} width={Math.max(0, rect.w - 3)} height={Math.max(0, rect.h - 3)} rx={6} fill={look.bg} stroke={selected ? '#1A3354' : hover === rect.leaf.id ? '#52525B' : 'none'} strokeWidth={selected ? 3 : 1.5} />
            {big && (
              <>
                <text x={rect.x + rect.w - 8} y={rect.y + 18} textAnchor="end" fontSize={11} fill={look.fg} fontFamily="JetBrains Mono" direction="ltr">
                  {rect.leaf.code}
                </text>
                <text x={rect.x + rect.w - 8} y={rect.y + 34} textAnchor="end" fontSize={12} fontWeight={600} fill={look.fg} fontFamily="Vazirmatn" direction="rtl">
                  {rect.leaf.title.length > Math.floor(rect.w / 8) ? `${rect.leaf.title.slice(0, Math.max(3, Math.floor(rect.w / 8) - 1))}…` : rect.leaf.title}
                </text>
                {rect.h > 54 && (
                  <text x={rect.x + rect.w - 8} y={rect.y + 50} textAnchor="end" fontSize={11} fill={look.fg} fontFamily="Vazirmatn" direction="rtl">
                    {rect.leaf.outOfBaseline ? 'خارج از مبنا' : rect.leaf.status === 'completed' ? 'تمام‌شده' : rect.leaf.status === 'not_started' ? 'شروع‌نشده' : `${rect.leaf.deviation > 0 ? '+' : rect.leaf.deviation < 0 ? '−' : ''}${formatPercentAuto(Math.abs(rect.leaf.deviation))}`}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
    {tip.node}
    </>
  );
}
