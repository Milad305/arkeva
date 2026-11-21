import { useMemo } from 'react';

import { formatJalaliDate, formatJalaliMonthShort, jalaliMonthStarts } from '@/shared/utils/date';
import { ChartDataTable, ChartTooltip, type ChartTooltipRow } from './ChartTooltip';
import { useChartCursor } from './useChartCursor';

// سری زمانی عمومی (مبلغ، شمار) — همان رسم SVG منحنی S ولی با محور y دلخواه و ستون.
// محور زمان چپ‌به‌راست (CLAUDE.md ۵). فقط مختصات رسم؛ هیچ عدد کسب‌وکاری نمی‌سازد (D07).

export interface TimeSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  kind?: 'line' | 'bar';
  dashed?: boolean;
  width?: number;
  dots?: boolean;
}

export interface TimeSeriesChartProps {
  dates: string[];
  series: TimeSeries[];
  /** برچسب محور y از مقدار خام. */
  formatY: (value: number) => string;
  todayDate?: string;
  height?: number;
  ariaLabel: string;
  maxTicks?: number;
  /** برچسب انتهای خط (مثل «PV ۵۹۵») برای هر سری خطی. */
  endLabels?: Record<string, string>;
}

const VIEW_W = 1000;
const PAD = { left: 64, right: 90, top: 20, bottom: 30 };

function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index]!;
    const [x1, y1] = points[index + 1]!;
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** گام «گرد» محور y: ۱، ۲، ۵ × ۱۰ⁿ. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

export function TimeSeriesChart({ dates, series, formatY, todayDate, height = 260, ariaLabel, maxTicks = 9, endLabels }: TimeSeriesChartProps) {
  const geometry = useMemo(() => {
    const times = dates.map((date) => new Date(`${date}T00:00:00Z`).getTime());
    const t0 = times[0] ?? 0;
    const t1 = times[times.length - 1] ?? 1;
    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(0, ...series.flatMap((item) => item.values.filter((value): value is number => value != null))));
    const x = (time: number) => PAD.left + ((time - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (value: number) => PAD.top + plotH - (Math.max(0, value) / max) * plotH;
    const barW = Math.max(6, Math.min(36, (plotW / Math.max(1, dates.length)) * 0.55));
    const pointsOf = (values: (number | null)[]) => values.flatMap((value, index) => (value == null ? [] : ([[x(times[index]!), y(value)]] as [number, number][])));
    const months = dates.length > 0 ? jalaliMonthStarts(dates[0]!, dates[dates.length - 1]!) : [];
    const step = Math.max(1, Math.ceil(months.length / maxTicks));
    const ticks = months.filter((_, index) => index % step === 0).map((date) => ({ x: x(new Date(`${date}T00:00:00Z`).getTime()), label: formatJalaliMonthShort(date), date }));
    const todayX = todayDate ? x(new Date(`${todayDate}T00:00:00Z`).getTime()) : null;
    const xs = times.map((time) => x(time));

    return { x, y, times, xs, max, barW, pointsOf, ticks, todayX, plotH };
  }, [dates, series, height, maxTicks, todayDate]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * geometry.max);

  const cursor = useChartCursor(geometry.xs, VIEW_W);
  const tableSeries = series.filter((item, index) => series.findIndex((other) => other.label === item.label) === index);
  const at = cursor.index;
  // یک مقدار می‌تواند هم ستون باشد هم خط (نرخ مصرف: «واقعی»)؛ در راهنما یک بار بیاید
  const cursorRows: ChartTooltipRow[] =
    at === null
      ? []
      : series.reduce<ChartTooltipRow[]>((rows, item) => {
          const value = item.values[at];
          if (value == null || rows.some((row) => row.label === item.label)) return rows;
          rows.push({ key: item.key, label: item.label, color: item.color, dashed: item.dashed, value: formatY(value) });
          return rows;
        }, []);

  return (
    <div className="chart-wrap">
    <svg viewBox={`0 0 ${VIEW_W} ${height}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: 'block', direction: 'ltr' }} {...cursor.svgProps}>
      {yTicks.map((tick) => (
        <g key={tick}>
          <path d={`M${PAD.left} ${geometry.y(tick)}H${VIEW_W - PAD.right}`} stroke="#F4F4F5" strokeWidth={1} />
          <text className="ax" x={PAD.left - 8} y={geometry.y(tick) + 4} textAnchor="end">
            {formatY(tick)}
          </text>
        </g>
      ))}

      {series
        .filter((item) => item.kind === 'bar')
        .map((item) =>
          item.values.map((value, index) =>
            value == null ? null : (
              <rect
                key={`${item.key}-${index}`}
                x={geometry.x(geometry.times[index]!) - geometry.barW / 2}
                y={geometry.y(value)}
                width={geometry.barW}
                height={Math.max(0, geometry.y(0) - geometry.y(value))}
                rx={3}
                fill={item.color}
                opacity={at === null || at === index ? 1 : 0.55}
              />
            ),
          ),
        )}

      {series
        .filter((item) => item.kind !== 'bar')
        .map((item) => (
          <path key={item.key} d={smoothPath(geometry.pointsOf(item.values))} stroke={item.color} strokeWidth={item.width ?? 2.5} fill="none" strokeDasharray={item.dashed ? '5 5' : undefined} strokeLinecap="round" />
        ))}

      {series
        .filter((item) => item.dots && item.kind !== 'bar')
        .flatMap((item) =>
          geometry.pointsOf(item.values).map(([cx, cy], index) => <circle key={`${item.key}-d${index}`} cx={cx} cy={cy} r={4} fill={item.color} stroke="#FFFFFF" strokeWidth={2} />),
        )}

      {endLabels &&
        series
          .filter((item) => endLabels[item.key] && item.kind !== 'bar')
          .map((item) => {
            const points = geometry.pointsOf(item.values);
            const last = points[points.length - 1];
            return last ? (
              <text key={`${item.key}-end`} x={last[0] + 8} y={last[1] + 4} fontSize={12} fontWeight={700} fill={item.color} fontFamily="Vazirmatn">
                {endLabels[item.key]}
              </text>
            ) : null;
          })}

      {geometry.todayX !== null && geometry.todayX >= PAD.left && geometry.todayX <= VIEW_W - PAD.right && (
        <path d={`M${geometry.todayX} ${PAD.top}V${PAD.top + geometry.plotH}`} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 4" />
      )}

      {at !== null && cursorRows.length > 0 && (
        <g pointerEvents="none">
          <path d={`M${geometry.xs[at]} ${PAD.top}V${PAD.top + geometry.plotH}`} stroke="#A1A1AA" strokeWidth={1} />
          {series
            .filter((item) => item.kind !== 'bar' && item.values[at] != null)
            .map((item) => (
              <circle key={`cursor-${item.key}`} cx={geometry.xs[at]} cy={geometry.y(item.values[at]!)} r={4} fill={item.color} stroke="#FFFFFF" strokeWidth={2} />
            ))}
        </g>
      )}

      {geometry.ticks.map((tick) => (
        <text key={tick.date} className="ax" x={tick.x} y={height - 8} textAnchor="middle">
          {tick.label}
        </text>
      ))}
    </svg>

      {at !== null && cursorRows.length > 0 && (
        <ChartTooltip
          x={geometry.xs[at]!}
          y={Math.min(...series.flatMap((item) => (item.values[at] == null ? [] : [geometry.y(item.values[at]!)])))}
          viewW={VIEW_W}
          viewH={height}
          title={formatJalaliDate(dates[at]!)}
          rows={cursorRows}
        />
      )}

      <ChartDataTable
        caption={ariaLabel}
        columns={['تاریخ', ...tableSeries.map((item) => item.label)]}
        rows={dates.map((date, index) => ({
          key: date,
          cells: [formatJalaliDate(date), ...tableSeries.map((item) => (item.values[index] == null ? '—' : formatY(item.values[index]!)))],
        }))}
      />
    </div>
  );
}
