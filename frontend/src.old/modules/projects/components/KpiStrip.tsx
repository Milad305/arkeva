import { TrendingUp, TrendingDown } from 'lucide-react';

import { toPersianDigits } from '@/shared/utils';
import type { ProjectKpi } from '../types';

// مطابق designs/Projects.html stat-strip.
// ۴ سلول KPI با border جداکننده (نه gap — از grid gap 1px با پس‌زمینه border استفاده شده).

interface KpiStripProps {
  kpi: ProjectKpi;
}

export function KpiStrip({ kpi }: KpiStripProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden mb-5"
    >
      {/* ۱. مجموع پروژه‌ها */}
      <KpiCell
        label="مجموع پروژه‌ها"
        value={`${toPersianDigits(kpi.totalProjects)}`}
        sub={`${toPersianDigits(kpi.activeCount)} فعال · ${toPersianDigits(kpi.pausedCount)} متوقف · ${toPersianDigits(kpi.draftCount)} پیش‌نویس`}
      />

      {/* ۲. پیشرفت متوسط */}
      <KpiCell
        label="پیشرفت متوسط"
        value={`${toPersianDigits(kpi.avgProgress)}٪`}
        delta={kpi.avgProgressDelta}
        deltaDir={kpi.avgProgressDelta >= 0 ? 'up' : 'down'}
        deltaLabel="نسبت به ماه گذشته"
      />

      {/* ۳. بودجه کل */}
      <KpiCell
        label="بودجه کل"
        value={`${toPersianDigits(kpi.totalBudget.toLocaleString('en-US'))} میلیارد ﷼`}
        sub={`مصرف‌شده: ${toPersianDigits(Math.round((kpi.totalBudget * kpi.totalBudgetUsedPct) / 100).toLocaleString('en-US'))} میلیارد (${toPersianDigits(kpi.totalBudgetUsedPct)}٪)`}
      />

      {/* ۴. پروژه‌های در خطر */}
      <KpiCell
        label="پروژه‌های در خطر"
        value={`${toPersianDigits(kpi.atRiskCount)}`}
        delta={kpi.atRiskDelta}
        deltaDir="down"
        deltaLabel="انحراف بیش از ۱۰٪ از برنامه"
        danger
      />
    </div>
  );
}

interface KpiCellProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  deltaDir?: 'up' | 'down';
  deltaLabel?: string;
  danger?: boolean;
}

function KpiCell({ label, value, sub, delta, deltaDir, deltaLabel, danger }: KpiCellProps) {
  return (
    <div className="bg-white px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500 mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-[22px] font-bold tracking-tight ${
            danger && value !== '۰' ? 'text-error-700' : 'text-gray-900'
          }`}
        >
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
              deltaDir === 'up' ? 'text-success-700' : danger ? 'text-error-700' : 'text-gray-500'
            }`}
          >
            {deltaDir === 'up' ? (
              <TrendingUp className="w-3 h-3 shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 shrink-0" />
            )}
            <span>{toPersianDigits(Math.abs(delta))}</span>
          </span>
        )}
      </div>
      {(sub || deltaLabel) && (
        <div className="text-[11.5px] text-gray-500 mt-0.5">{sub ?? deltaLabel}</div>
      )}
    </div>
  );
}
