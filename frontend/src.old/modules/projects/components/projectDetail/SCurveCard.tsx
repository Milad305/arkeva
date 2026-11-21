import { useMemo, useRef, useState } from 'react';
import { LineChart as LineChartIcon, Download, Maximize2 } from 'lucide-react';

import { toPersianDigits } from '@/shared/utils';
import type { SCurvePointDto } from '../../types';

// بازنویسی وفادار بر اساس designs/Project.html بخش .curve-card.
// منحنی پیشرفت (S-Curve): برنامه‌ای + واقعی + پیش‌بینی، با tooltip تعاملی.

interface Props {
  points: SCurvePointDto[];
}

// ابعاد viewBox مطابق designs (1200×320) و محدوده‌های محور.
const VB_W = 1200;
const VB_H = 320;
const PAD_L = 60; // padding چپ برای برچسب‌های Y
const PAD_R = 20;
const PAD_T = 40;
const PAD_B = 40; // padding پایین برای برچسب‌های X
const CHART_TOP = PAD_T;
const CHART_BOTTOM = VB_H - PAD_B; // 280
const CHART_LEFT = PAD_L;
const CHART_RIGHT = VB_W - PAD_R; // 1180

// نقطهٔ «امروز» در محور X — اگر چند نقطه هستیم، باید اندیس پیدا کنیم.
function findTodayIndex(points: SCurvePointDto[]): number {
  const i = points.findIndex((p) => p.isToday);
  return i >= 0 ? i : Math.floor(points.length / 2);
}

// نگاشت درصد → Y در سیستم viewBox
function yFor(pct: number): number {
  return CHART_BOTTOM - (pct / 100) * (CHART_BOTTOM - CHART_TOP);
}

// نگاشت اندیس نقطه → X توزیع‌شده روی محور
function xFor(idx: number, total: number): number {
  if (total <= 1) return (CHART_LEFT + CHART_RIGHT) / 2;
  return CHART_LEFT + (idx / (total - 1)) * (CHART_RIGHT - CHART_LEFT);
}

export function SCurveCard({ points }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // محاسبهٔ مسیرهای SVG فقط هنگام تغییر داده‌ها.
  const geometry = useMemo(() => buildGeometry(points), [points]);
  const todayIdx = useMemo(() => findTodayIndex(points), [points]);
  const todayX = xFor(todayIdx, points.length);

  // مدیریت hover — coords کلاینت → viewBox coords.
  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // نسبت مکان ماوس نسبت به svg
    const ratio = (e.clientX - rect.left) / rect.width;
    const vbX = ratio * VB_W;
    // پیداکنندهٔ نزدیک‌ترین نقطه
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(xFor(i, points.length) - vbX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHoverIdx(best);
  };

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xFor(hoverIdx, points.length) : 0;
  const hoverY =
    hoverPoint && hoverPoint.actual !== null
      ? yFor(hoverPoint.actual)
      : hoverPoint && hoverPoint.forecast !== null
        ? yFor(hoverPoint.forecast)
        : hoverPoint
          ? yFor(hoverPoint.planned)
          : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
      {/* head */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-[14.5px] font-semibold m-0 flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-primary-500" />
            منحنی پیشرفت (S-Curve)
          </h3>
          <div className="text-xs text-gray-500 mt-0.5">
            مقایسهٔ پیشرفت برنامه‌ای، واقعی و پیش‌بینی تا پایان پروژه
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* legend */}
          <div className="flex gap-3.5 items-center text-xs text-gray-700">
            <span>
              <span className="inline-block w-3.5 h-[3px] rounded-[2px] ml-1.5 align-middle" style={{ background: '#8AA2C2' }} />
              برنامه‌ای
            </span>
            <span>
              <span className="inline-block w-3.5 h-[3px] rounded-[2px] ml-1.5 align-middle" style={{ background: '#1A3354' }} />
              واقعی
            </span>
            <span>
              <span
                className="inline-block w-3.5 h-[2px] ml-1.5 align-middle"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, #A1A1AA 0 3px, transparent 3px 6px)',
                  backgroundColor: 'transparent',
                }}
              />
              پیش‌بینی
            </span>
          </div>
          <div className="w-px h-5 bg-gray-200 mx-1.5" />
          <button className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-xs rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
            <Download className="w-[13px] h-[13px] shrink-0" />
            <span>خروجی</span>
          </button>
          <button className="inline-flex items-center justify-center h-[30px] w-8 text-gray-700 hover:bg-gray-100 rounded-md transition-colors" aria-label="تمام‌صفحه">
            <Maximize2 className="w-[13px] h-[13px] shrink-0" />
          </button>
        </div>
      </div>

      {/* body — chart با tooltip overlay */}
      <div className="relative px-1.5 pb-4 pt-1.5">
        {/* tooltip */}
        {hoverPoint && (
          <div
            className="absolute bg-gray-900 text-white rounded-lg px-3 py-2 text-[11.5px] pointer-events-none shadow-lg z-5 whitespace-nowrap"
            style={{
              opacity: 1,
              transform: 'translate(-50%, -100%)',
              left: `${(hoverX / VB_W) * 100}%`,
              top: `${(hoverY / VB_H) * 100}%`,
              marginTop: '-8px',
            }}
          >
            <strong className="block mb-1 font-semibold">{hoverPoint.monthLabel}</strong>
            <div className="flex items-center gap-1.5 text-white/85">
              <span className="w-2 h-2 rounded-[2px]" style={{ background: '#8AA2C2' }} />
              برنامه‌ای: {toPersianDigits(hoverPoint.planned)}٪
            </div>
            {hoverPoint.actual !== null && (
              <div className="flex items-center gap-1.5 text-white/85">
                <span className="w-2 h-2 rounded-[2px]" style={{ background: '#1A3354' }} />
                واقعی: {toPersianDigits(hoverPoint.actual)}٪
              </div>
            )}
            {hoverPoint.forecast !== null && (
              <div className="flex items-center gap-1.5 text-white/85">
                <span className="w-2 h-2 rounded-[2px]" style={{ background: '#A1A1AA' }} />
                پیش‌بینی: {toPersianDigits(hoverPoint.forecast)}٪
              </div>
            )}
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="w-full h-[320px] block"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="plannedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8AA2C2" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8AA2C2" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A3354" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1A3354" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* خطوط شبکه */}
          <g>
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = yFor(pct);
              return (
                <g key={pct}>
                  <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke="#F4F4F5" strokeWidth="1" />
                  <text x="20" y={y + 4} fontSize="10.5" fill="#71717A" fontFamily="Vazirmatn">
                    {toPersianDigits(pct)}٪
                  </text>
                </g>
              );
            })}
          </g>

          {/* ناحیهٔ برنامه‌ای */}
          {geometry.plannedArea && <path d={geometry.plannedArea} fill="url(#plannedFill)" />}
          {/* خط برنامه‌ای (نقطه‌چین) */}
          {geometry.plannedLine && (
            <path
              d={geometry.plannedLine}
              stroke="#8AA2C2"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          )}

          {/* ناحیهٔ واقعی */}
          {geometry.actualArea && <path d={geometry.actualArea} fill="url(#actualFill)" />}
          {/* خط واقعی */}
          {geometry.actualLine && (
            <path d={geometry.actualLine} stroke="#1A3354" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}

          {/* خط پیش‌بینی (نقطه‌چین خاکستری) */}
          {geometry.forecastLine && (
            <path
              d={geometry.forecastLine}
              stroke="#A1A1AA"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 5"
              strokeLinecap="round"
            />
          )}

          {/* نقاط دادهٔ واقعی (دایره) */}
          {points.map((p, i) => {
            if (p.actual === null) return null;
            return (
              <circle
                key={`a-${i}`}
                cx={xFor(i, points.length)}
                cy={yFor(p.actual)}
                r={hoverIdx === i ? 6 : 4.5}
                fill="#1A3354"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          {/* نقاط پیش‌بینی */}
          {points.map((p, i) => {
            if (p.forecast === null) return null;
            return (
              <circle
                key={`f-${i}`}
                cx={xFor(i, points.length)}
                cy={yFor(p.forecast)}
                r={hoverIdx === i ? 5.5 : 4}
                fill="white"
                stroke="#A1A1AA"
                strokeWidth="2"
              />
            );
          })}

          {/* علامت «امروز» — خط عمودی قرمز + باج */}
          <line
            x1={todayX}
            y1="20"
            x2={todayX}
            y2={CHART_BOTTOM}
            stroke="#DC2626"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <rect x={todayX - 30} y="6" width="60" height="22" rx="4" fill="#DC2626" />
          <text
            x={todayX}
            y="21"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            fontFamily="Vazirmatn"
            fontWeight="600"
          >
            امروز
          </text>

          {/* برچسب‌های محور X */}
          <g textAnchor="middle">
            {points.map((p, i) => (
              <text
                key={`x-${i}`}
                x={xFor(i, points.length)}
                y={CHART_BOTTOM + 22}
                fontSize="10.5"
                fill={p.isToday ? '#DC2626' : '#71717A'}
                fontWeight={p.isToday ? 600 : 400}
                fontFamily="Vazirmatn"
              >
                {p.monthLabel}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

// ────────── محاسبهٔ مسیرهای SVG ──────────

interface CurveGeometry {
  plannedArea: string | null;
  plannedLine: string | null;
  actualArea: string | null;
  actualLine: string | null;
  forecastLine: string | null;
}

function buildGeometry(points: SCurvePointDto[]): CurveGeometry {
  if (points.length === 0) {
    return {
      plannedArea: null,
      plannedLine: null,
      actualArea: null,
      actualLine: null,
      forecastLine: null,
    };
  }

  // مسیر برنامه‌ای — منحنی نرم با Catmull-Rom → Bezier (تقریب ساده).
  const plannedLine = buildSmoothLine(points.map((p, i) => [xFor(i, points.length), yFor(p.planned)] as const));
  const plannedArea = plannedLine
    ? `${plannedLine} L ${CHART_RIGHT},${CHART_BOTTOM} L ${CHART_LEFT},${CHART_BOTTOM} Z`
    : null;

  // مسیر واقعی — فقط نقاط با actual != null
  const actualPoints = points
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.actual !== null);
  let actualLine: string | null = null;
  let actualArea: string | null = null;
  if (actualPoints.length > 0) {
    const first = actualPoints[0]!;
    const last = actualPoints[actualPoints.length - 1]!;
    actualLine = buildSmoothLine(
      actualPoints.map((x) => [xFor(x.i, points.length), yFor(x.p.actual as number)] as const),
    );
    if (actualLine) {
      actualArea = `${actualLine} L ${xFor(last.i, points.length)},${CHART_BOTTOM} L ${xFor(first.i, points.length)},${CHART_BOTTOM} Z`;
    }
  }

  // مسیر پیش‌بینی — از اولین نقطه‌ای که forecast != null شروع می‌شود
  const forecastPoints = points
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.forecast !== null);
  const forecastLine =
    forecastPoints.length > 0
      ? buildSmoothLine(
          forecastPoints.map((x) => [xFor(x.i, points.length), yFor(x.p.forecast as number)] as const),
        )
      : null;

  return { plannedArea, plannedLine, actualArea, actualLine, forecastLine };
}

// ساخت یک مسیر منحنی نرم (Cubic Bezier) از نقاط — تقریب ساده.
// این پیاده‌سازی پایه است؛ برای دقت بیشتر می‌توان از Catmull-Rom استفاده کرد.
function buildSmoothLine(pts: ReadonlyArray<readonly [number, number]>): string | null {
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const [x, y] = pts[0]!;
    return `M ${x},${y}`;
  }
  // مسیر با خط مستقیم + smoothing اولیه. برای S-curve واقعی،
  // بک‌اند مسیر را به‌صورت دادهٔ نقطه می‌دهد و اینجا فقط وصل می‌کنیم.
  // برای نرمی بیشتر، bezier کنترل‌نقطه‌ای ساده استفاده می‌کنیم.
  let d = `M ${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    // نقطهٔ کنترل وسط — برای انحنای ملایم
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}
