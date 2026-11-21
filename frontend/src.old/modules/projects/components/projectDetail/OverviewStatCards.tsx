import {
  Activity,
  TrendingUp,
  Banknote,
  Wallet,
  Clock,
  Calendar,
  Gauge,
  BarChart2,
  AlertTriangle,
  Info,
  Flag,
} from 'lucide-react';

import { toPersianDigits, formatJalaliDate, formatFaNumber } from '@/shared/utils';
import type { ProjectOverviewKpis } from '../../types';

// بازنویسی وفادار بر اساس designs/Project.html بخش .stat-grid.
// ۴ stat card: پیشرفت کلی، بودجه، زمان، شاخص‌های عملکرد.
// هر کارت استایل مخصوص خودش را دارد (نه کامپوننت Card عمومی) — مطابق frontend-react.md بخش ۱۱.

interface Props {
  kpis: ProjectOverviewKpis;
}

export function OverviewStatCards({ kpis }: Props) {
  const { progress, budget, timeline, kpis: perf } = kpis;
  const progressDeviation = progress.actual - progress.planned;

  // رنگ پیشرفت بر اساس انحراف — مطابق progressColor در Project.html
  const progressColor = progressDeviation <= -10 ? '#DC2626' : progressDeviation <= -5 ? '#D97706' : '#16A34A';

  return (
    <div className="grid grid-cols-4 gap-3.5 mb-5">
      {/* ۱. پیشرفت کلی */}
      <ProgressStat
        actual={progress.actual}
        planned={progress.planned}
        deviation={progressDeviation}
        color={progressColor}
      />

      {/* ۲. بودجه */}
      <BudgetStat budget={budget} />

      {/* ۳. زمان */}
      <TimeStat timeline={timeline} />

      {/* ۴. شاخص‌های عملکرد */}
      <KpiStat perf={perf} />
    </div>
  );
}

// ────────── ۱. کارت پیشرفت کلی ──────────
function ProgressStat({
  actual,
  planned,
  deviation,
  color,
}: {
  actual: number;
  planned: number;
  deviation: number;
  color: string;
}) {
  // محیط دایره‌ای — مطابق .circ-wrap. محاسبه dasharray/offset.
  const circumference = 2 * Math.PI * 22; // r=22
  const offset = circumference - (actual / 100) * circumference;

  // پیام زیر عدد: «۵٪ عقب از برنامه (۷۰٪)»
  const deviationLabel =
    deviation === 0
      ? 'هم‌سو با برنامه'
      : deviation > 0
        ? `${toPersianDigits(Math.abs(deviation))}٪ جلو از برنامه`
        : `${toPersianDigits(Math.abs(deviation))}٪ عقب از برنامه`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 inline-flex items-center gap-1.5 font-medium">
          <Activity className="w-[13px] h-[13px] text-primary-500" />
          پیشرفت کلی
        </span>
        <span
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ backgroundColor: '#E5EBF3', color: '#1A3354' }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-[30px] font-bold tracking-[-0.02em] text-gray-900">
              {toPersianDigits(actual)}
            </span>
            <span className="text-[13px] text-gray-500 font-medium mb-1">٪</span>
          </div>
          <div
            className="text-xs mt-1.5 flex items-center gap-1"
            style={{ color: '#B45309' }}
          >
            <AlertTriangle className="w-3 h-3" />
            {deviationLabel} ({toPersianDigits(planned)}٪)
          </div>
        </div>

        {/* محیط دایره‌ای */}
        <div className="relative w-[52px] h-[52px] flex-shrink-0">
          <svg viewBox="0 0 52 52" className="w-full h-full" style={{ transform: 'scaleX(-1)' }}>
            <circle cx="26" cy="26" r="22" stroke="#E4E4E7" strokeWidth="5" fill="none" />
            <circle
              cx="26"
              cy="26"
              r="22"
              stroke={color}
              strokeWidth="5"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-gray-900">
            {toPersianDigits(actual)}٪
          </div>
        </div>
      </div>

      <div className="w-full h-[5px] bg-gray-100 rounded-full overflow-hidden mt-3.5">
        <div className="h-full rounded-full" style={{ width: `${actual}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ────────── ۲. کارت بودجه ──────────
function BudgetStat({ budget }: { budget: ProjectOverviewKpis['budget'] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 inline-flex items-center gap-1.5 font-medium">
          <Banknote className="w-[13px] h-[13px] text-accent-500" />
          بودجه
        </span>
        <span
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ backgroundColor: '#FCEAD9', color: '#B45813' }}
        >
          <Wallet className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="flex items-end gap-2 leading-none">
        <span className="text-[30px] font-bold tracking-[-0.02em] text-gray-900">
          {toPersianDigits(budget.usedBudget)}
        </span>
        <span className="text-[13px] text-gray-500 font-medium mb-1">میلیارد ﷼</span>
      </div>

      <div className="text-xs text-gray-600 mt-1.5">
        از کل <strong className="text-gray-900">{toPersianDigits(budget.totalBudget)} میلیارد ﷼</strong> ·
        مصرف: <strong className="text-gray-900">{formatFaNumber(budget.usedPct, 1)}٪</strong>
      </div>

      <div className="w-full h-[5px] bg-gray-100 rounded-full overflow-hidden mt-2.5">
        <div className="h-full rounded-full" style={{ width: `${budget.usedPct}%`, backgroundColor: '#E07A2C' }} />
      </div>

      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <Info className="w-[11px] h-[11px]" />
        مصرف بودجه با پیشرفت فیزیکی هم‌خوان است
      </div>
    </div>
  );
}

// ────────── ۳. کارت زمان ──────────
function TimeStat({ timeline }: { timeline: ProjectOverviewKpis['timeline'] }) {
  // درصد زمان سپری‌شده
  const elapsedPct = timeline.totalDays > 0 ? (timeline.elapsedDays / timeline.totalDays) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 inline-flex items-center gap-1.5 font-medium">
          <Clock className="w-[13px] h-[13px] text-info-500" />
          زمان
        </span>
        <span
          className="w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
        >
          <Calendar className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-[24px] font-bold tracking-[-0.02em] text-gray-900">
              {toPersianDigits(timeline.elapsedDays)}
            </span>
            <span className="text-[13px] text-gray-500 font-medium mb-1">روز</span>
          </div>
          <div className="text-xs text-gray-600 mt-1.5">سپری‌شده</div>
        </div>
        <div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-[24px] font-bold tracking-[-0.02em] text-gray-900">
              {toPersianDigits(timeline.remainingDays)}
            </span>
            <span className="text-[13px] text-gray-500 font-medium mb-1">روز</span>
          </div>
          <div className="text-xs text-gray-600 mt-1.5">باقی‌مانده</div>
        </div>
      </div>

      {/* progress bar با علامت «امروز» — مطابق designs */}
      <div className="relative w-full h-[5px] bg-gray-100 rounded-full overflow-visible mt-3.5">
        <div className="h-full rounded-full" style={{ width: `${elapsedPct}%`, backgroundColor: '#2563EB' }} />
        {/* علامت عمودی «امروز» */}
        <span
          className="absolute -top-[3px] -bottom-[3px] w-[2px] bg-gray-700"
          style={{ right: `${elapsedPct}%` }}
          title="امروز"
        />
      </div>

      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <Flag className="w-[11px] h-[11px]" />
        کل: {toPersianDigits(timeline.totalDays)} روز · پایان{' '}
        <span className="mono mr-0.5">{formatJalaliDate(timeline.endDate)}</span>
      </div>
    </div>
  );
}

// ────────── ۴. کارت شاخص‌های عملکرد (CPI/SPI) ──────────
function KpiStat({ perf }: { perf: ProjectOverviewKpis['kpis'] }) {
  // تعیین رنگ CPI: 1+ سبز، 0.95-1 زرد، زیر 0.95 قرمز
  const cpiStyle = chipStyle(perf.cpi);
  const spiStyle = chipStyle(perf.spi);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 inline-flex items-center gap-1.5 font-medium">
          <Gauge className="w-[13px] h-[13px] text-gray-500" />
          شاخص‌های عملکرد
        </span>
        <span className="w-7 h-7 rounded-md bg-gray-100 text-gray-700 inline-flex items-center justify-center">
          <BarChart2 className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className="px-2.5 py-2 rounded-md border"
          style={{ background: cpiStyle.bg, borderColor: cpiStyle.border, color: cpiStyle.fg }}
        >
          <div className="text-[11px] font-semibold opacity-80 mb-0.5">CPI · هزینه</div>
          <div className="text-lg font-bold tracking-[-0.02em] mono">{formatFaNumber(perf.cpi, 2)}</div>
        </div>
        <div
          className="px-2.5 py-2 rounded-md border"
          style={{ background: spiStyle.bg, borderColor: spiStyle.border, color: spiStyle.fg }}
        >
          <div className="text-[11px] font-semibold opacity-80 mb-0.5">SPI · زمان</div>
          <div className="text-lg font-bold tracking-[-0.02em] mono">{formatFaNumber(perf.spi, 2)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-600 mt-2.5 leading-[1.5]">{perf.summary}</div>
    </div>
  );
}

// رنگ‌بندی chip CPI/SPI بر اساس مقدار
function chipStyle(value: number): { bg: string; fg: string; border: string } {
  if (value >= 1) return { bg: '#ECFDF3', fg: '#15803D', border: 'rgba(22,163,74,0.25)' };
  if (value >= 0.95) return { bg: '#FFF8EB', fg: '#B45309', border: 'rgba(217,119,6,0.25)' };
  return { bg: '#FEF2F2', fg: '#B91C1C', border: 'rgba(220,38,38,0.25)' };
}
