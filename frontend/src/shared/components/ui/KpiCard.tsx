import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { Tone } from '@/shared/types/tone';
import { IconBox } from './IconBox';
import { Icon, type IconName } from './Icon';

export interface KpiCardProps {
  label: ReactNode;
  /** عدد اصلی — از پیش قالب‌بندی‌شدهٔ فارسی. */
  value: ReactNode;
  icon?: IconName;
  tone?: Tone;
  /** رنگ متن عدد، برای KPIهای هشداردار. */
  valueClassName?: string;
  /** تغییر نسبت به دورهٔ قبل — کامپوننت `Delta`. */
  delta?: ReactNode;
  /** توضیح پایین کارت. */
  hint?: ReactNode;
  /** سمت مقابل عدد: اسپارک‌لاین، دونات، پیوند. */
  visual?: ReactNode;
  /** چیدمان افقی فشرده (W20) به‌جای عمودی (W05). */
  layout?: 'stacked' | 'inline';
  className?: string;
}

/**
 * کارت KPI — `.kpi` در kit.css.
 * دو چیدمان بوم را پوشش می‌دهد: عمودی داشبورد و افقی صندوق گزارش‌ها.
 */
export function KpiCard({
  label,
  value,
  icon,
  tone = 'pri',
  valueClassName,
  delta,
  hint,
  visual,
  layout = 'stacked',
  className,
}: KpiCardProps) {
  if (layout === 'inline') {
    return (
      <div
        className={cn('kpi row g12', className)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: '12px 14px' }}
      >
        {icon && <IconBox icon={icon} tone={tone} size="lg" />}
        <span className="col">
          <span className={cn('stat-v', valueClassName)}>{value}</span>
          <span className="t-sm tx6">{label}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn('kpi', className)}>
      <div className="row between">
        <span className="kpi-l">{label}</span>
        {icon && <IconBox icon={icon} tone={tone} />}
      </div>

      {visual ? (
        <div className="row between ai-e">
          <div className="row g8 ai-e">
            <span className={cn('kpi-v', valueClassName)}>{value}</span>
            {delta}
          </div>
          {visual}
        </div>
      ) : (
        <div className="row g8 ai-e">
          <span className={cn('kpi-v', valueClassName)}>{value}</span>
          {delta}
        </div>
      )}

      {hint && <div className="t-sm tx5">{hint}</div>}
    </div>
  );
}

export interface StatStripProps {
  /** تعداد ستون‌ها — `.c2` تا `.c6` در kit.css. */
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

/**
 * نوار آمار به‌هم‌چسبیده — `.strip` در kit.css.
 * با `minmax(0,1fr)` ستون‌ها هرگز سرریز نمی‌کنند.
 */
export function StatStrip({ columns = 4, className, style, children }: StatStripProps) {
  return (
    <div className={cn('strip', `c${columns}`, className)} style={style}>
      {children}
    </div>
  );
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  iconClassName?: string;
  hint?: ReactNode;
  valueClassName?: string;
  delta?: ReactNode;
  /** واحد کوچک کنار عدد — «میلیارد ریال». */
  unit?: string;
}

/** یک خانهٔ `StatStrip`. */
export function Stat({
  label,
  value,
  icon,
  iconClassName = 'tx-pri',
  hint,
  valueClassName,
  delta,
  unit,
}: StatProps) {
  return (
    <div>
      <span className="row g6 t-sm tx5">
        {icon && (
          <span className={iconClassName} style={{ display: 'inline-flex' }}>
            <Icon name={icon} size={13} />
          </span>
        )}
        {label}
      </span>
      <span className={unit || delta ? 'row g6 ai-e' : undefined}>
        <span className={cn('stat-v', valueClassName)}>{value}</span>
        {unit && (
          <span className="t-12 tx5" style={{ paddingBottom: 3 }}>
            {unit}
          </span>
        )}
        {delta}
      </span>
      {hint && <span className="t-sm tx5">{hint}</span>}
    </div>
  );
}
