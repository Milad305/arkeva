import { useMemo } from 'react';

import { formatJalaliDate, formatJalaliMonthShort, jalaliMonthStarts } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { ChartDataTable, ChartTooltip, type ChartTooltipRow } from './ChartTooltip';
import { useChartCursor } from './useChartCursor';

// منحنی S — SVG دست‌ساز (تصمیم طرح: بدون کتابخانهٔ نمودار).
// محور زمان چپ‌به‌راست است حتی در صفحهٔ راست‌به‌چپ (CLAUDE.md بخش ۵).
// این کامپوننت فقط مختصات رسم را حساب می‌کند؛ هیچ عدد کسب‌وکاری نمی‌سازد (D07).

export interface SCurveSeries {
  key: string;
  label: string;
  color: string;
  /** مقدار هر تاریخ، هم‌طول `dates`؛ `null` یعنی این سری آنجا نقطه ندارد. */
  values: (number | null)[];
  dashed?: boolean;
  width?: number;
  /** دایره روی نقطه‌ها — بوم برای سری «واقعی». */
  dots?: boolean;
}

export interface SCurveChartProps {
  /** تاریخ‌های ISO به ترتیب صعودی. */
  dates: string[];
  series: SCurveSeries[];
  /** خط «امروز» (تاریخ داده). */
  todayDate?: string;
  todayLabel?: string;
  /**
   * سایهٔ انحراف بین دو سری تا «امروز» — بوم ناحیهٔ بین برنامه‌ای و واقعی را
   * قرمز کم‌رنگ می‌کند.
   */
  shadeBetween?: [string, string];
  /** ارتفاع منطقی نمودار؛ عرض همیشه ۱۰۰٪ ظرف است. */
  height?: number;
  ariaLabel: string;
  /** بیشترین شمار برچسب محور زمان. */
  maxTicks?: number;
}

const VIEW_W = 1000;
const PAD = { left: 50, right: 20, top: 26, bottom: 30 };
const Y_TICKS = [0, 25, 50, 75, 100];

/** منحنی نرم بین نقطه‌ها — همان بزیهٔ نقطه‌میانی آرت‌بورد W10. */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M${first![0]},${first![1]}`;
  let previous = first!;
  for (const point of rest) {
    const cx = (previous[0] + point[0]) / 2;
    d += ` C${cx},${previous[1]} ${cx},${point[1]} ${point[0]},${point[1]}`;
    previous = point;
  }
  return d;
}

export function SCurveChart({
  dates,
  series,
  todayDate,
  todayLabel = 'امروز',
  shadeBetween,
  height = 250,
  ariaLabel,
  maxTicks = 9,
}: SCurveChartProps) {
  const geometry = useMemo(() => {
    const times = dates.map((date) => new Date(`${date}T00:00:00Z`).getTime());
    const t0 = times[0] ?? 0;
    const t1 = times[times.length - 1] ?? 1;
    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;

    const x = (time: number) => PAD.left + ((time - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (value: number) => PAD.top + plotH - (Math.min(100, Math.max(0, value)) / 100) * plotH;

    const pointsOf = (values: (number | null)[]) =>
      values.flatMap((value, index) =>
        value === null ? [] : ([[x(times[index]!), y(value)]] as [number, number][]),
      );

    const todayTime = todayDate ? new Date(`${todayDate}T00:00:00Z`).getTime() : null;
    const todayX = todayTime !== null ? x(todayTime) : null;

    // سایهٔ انحراف: مسیر سری اول تا امروز، برگشت روی سری دوم
    let shade: string | null = null;
    if (shadeBetween && todayTime !== null) {
      const [aKey, bKey] = shadeBetween;
      const a = series.find((item) => item.key === aKey);
      const b = series.find((item) => item.key === bKey);
      if (a && b) {
        const upTo = (values: (number | null)[]) =>
          values.flatMap((value, index) =>
            value === null || times[index]! > todayTime
              ? []
              : ([[x(times[index]!), y(value)]] as [number, number][]),
          );
        const top = upTo(a.values);
        const bottom = upTo(b.values).reverse();
        if (top.length > 1 && bottom.length > 1) {
          shade = `${smoothPath(top)} L${bottom.map((p) => `${p[0]},${p[1]}`).join(' L')} Z`;
        }
      }
    }

    // برچسب‌های محور: اول ماه‌های شمسی، حداکثر `maxTicks` تا با گام یکنواخت
    const months = dates.length > 0 ? jalaliMonthStarts(dates[0]!, dates[dates.length - 1]!) : [];
    const step = Math.max(1, Math.ceil(months.length / maxTicks));
    const ticks = months
      .filter((_, index) => index % step === 0)
      .map((date) => ({
        x: x(new Date(`${date}T00:00:00Z`).getTime()),
        label: formatJalaliMonthShort(date),
        date,
      }));

    const xs = times.map((time) => x(time));

    return { x, y, xs, pointsOf, todayX, shade, ticks, plotH };
  }, [dates, series, todayDate, shadeBetween, height, maxTicks]);

  const cursor = useChartCursor(geometry.xs, VIEW_W);
  const at = cursor.index;
  // سری‌هایی که در تاریخ زیر نشانگر نقطه دارند — برای خط عمودی و کارت راهنما
  const cursorRows: ChartTooltipRow[] =
    at === null
      ? []
      : series.flatMap((item) => {
          const value = item.values[at];
          return value == null
            ? []
            : [{ key: item.key, label: item.label, color: item.color, dashed: item.dashed, value: formatPercentAuto(value) }];
        });

  return (
    <div className="chart-wrap">
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block', direction: 'ltr' }}
      {...cursor.svgProps}
    >
      {Y_TICKS.map((tick) => (
        <g key={tick}>
          <path
            d={`M${PAD.left} ${geometry.y(tick)}H${VIEW_W - PAD.right}`}
            stroke="#F4F4F5"
            strokeWidth={1}
          />
          <text className="ax" x={PAD.left - 8} y={geometry.y(tick) + 4} textAnchor="end">
            {toFaDigits(tick)}٪
          </text>
        </g>
      ))}

      {geometry.shade && <path d={geometry.shade} fill="rgba(220,38,38,0.08)" />}

      {series.map((item) => (
        <path
          key={item.key}
          d={smoothPath(geometry.pointsOf(item.values))}
          stroke={item.color}
          strokeWidth={item.width ?? 2}
          fill="none"
          strokeDasharray={item.dashed ? '5 5' : undefined}
          strokeLinecap="round"
        />
      ))}

      {series
        .filter((item) => item.dots)
        .flatMap((item) =>
          geometry.pointsOf(item.values).map(([cx, cy], index) => (
            <circle
              key={`${item.key}-${index}`}
              cx={cx}
              cy={cy}
              r={4.5}
              fill={item.color}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          )),
        )}

      {geometry.todayX !== null && (
        <g>
          <path
            d={`M${geometry.todayX} ${PAD.top}V${PAD.top + geometry.plotH}`}
            stroke="#DC2626"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <rect x={geometry.todayX - 28} y={2} width={56} height={20} rx={4} fill="#DC2626" />
          <text
            x={geometry.todayX}
            y={16}
            textAnchor="middle"
            fontSize={11}
            fill="#FFFFFF"
            fontFamily="Vazirmatn"
            fontWeight={600}
          >
            {todayLabel}
          </text>
        </g>
      )}

      {at !== null && cursorRows.length > 0 && (
        <g pointerEvents="none">
          <path
            d={`M${geometry.xs[at]} ${PAD.top}V${PAD.top + geometry.plotH}`}
            stroke="#A1A1AA"
            strokeWidth={1}
          />
          {series.map((item) =>
            item.values[at] == null ? null : (
              <circle
                key={`cursor-${item.key}`}
                cx={geometry.xs[at]}
                cy={geometry.y(item.values[at]!)}
                r={4}
                fill={item.color}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ),
          )}
        </g>
      )}

      {geometry.ticks.map((tick) => (
        <text
          key={tick.date}
          className="ax"
          x={tick.x}
          y={height - 8}
          textAnchor="middle"
        >
          {tick.label}
        </text>
      ))}
    </svg>

      {at !== null && cursorRows.length > 0 && (
        <ChartTooltip
          x={geometry.xs[at]!}
          y={Math.min(...cursorRows.map((row) => geometry.y(series.find((item) => item.key === row.key)!.values[at] as number)))}
          viewW={VIEW_W}
          viewH={height}
          title={formatJalaliDate(dates[at]!)}
          rows={cursorRows}
        />
      )}

      <ChartDataTable
        caption={ariaLabel}
        columns={['تاریخ', ...series.map((item) => item.label)]}
        rows={dates.map((date, index) => ({
          key: date,
          cells: [
            formatJalaliDate(date),
            ...series.map((item) => (item.values[index] == null ? '—' : formatPercentAuto(item.values[index]!))),
          ],
        }))}
      />
    </div>
  );
}
