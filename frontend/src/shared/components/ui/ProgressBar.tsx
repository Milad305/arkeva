import { cn } from '@/shared/utils/cn';
import { clampPercent, formatPercent } from '@/shared/utils/num';
import { progressColor } from '@/shared/utils/deviation';

export type ProgressSize = 'thin' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ProgressSize, string> = { thin: 'thin', md: '', lg: 'lg', xl: 'xl' };

export interface ProgressBarProps {
  /** درصد ۰ تا ۱۰۰. */
  value: number;
  size?: ProgressSize;
  /** رنگ پرشدگی؛ پیش‌فرض سرمه‌ای primary-700 بوم. */
  color?: string;
  /** رنگ شیار. */
  trackColor?: string;
  /** خط نشانگر عمودی — در بوم برای «برنامه‌ای امروز» روی نوار واقعی. */
  marker?: number;
  /** برچسب دسترس‌پذیری؛ اگر نیاید نوار تزئینی حساب می‌شود. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** نوار پیشرفت — `.pbar` در kit.css. */
export function ProgressBar({
  value,
  size = 'md',
  color,
  trackColor,
  marker,
  label,
  className,
  style,
}: ProgressBarProps) {
  const pct = clampPercent(value);

  return (
    <span
      className={cn('pbar', SIZE_CLASS[size], className)}
      style={trackColor ? { background: trackColor, ...style } : style}
      {...(label
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuenow': Math.round(pct),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuetext': formatPercent(pct),
          }
        : { 'aria-hidden': true })}
    >
      <i style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
      {marker !== undefined && <b style={{ insetInlineStart: `${clampPercent(marker)}%` }} />}
    </span>
  );
}

export interface DualProgressProps {
  planned: number;
  actual: number;
  size?: ProgressSize;
  /** حداکثر عرض نوارها — بوم در کارت‌های فشرده ۱۸۰px می‌گذارد. */
  maxWidth?: number;
  className?: string;
}

/**
 * دو نوار روی هم: برنامه‌ای (خاکستری) و واقعی (رنگ وضعیت).
 * الگوی تکرارشده در داشبورد، جدول پروژه‌ها و درخت WBS.
 */
export function DualProgress({
  planned,
  actual,
  size = 'thin',
  maxWidth,
  className,
}: DualProgressProps) {
  const barStyle = maxWidth ? { maxWidth } : undefined;

  return (
    <span className={cn('col g2', className)} style={{ minWidth: 0 }}>
      <ProgressBar
        value={planned}
        size={size}
        color="#D4D4D8"
        trackColor="#F4F4F5"
        label={`پیشرفت برنامه‌ای ${formatPercent(planned)}`}
        style={barStyle}
      />
      <ProgressBar
        value={actual}
        size={size}
        color={progressColor(planned, actual)}
        label={`پیشرفت واقعی ${formatPercent(actual)}`}
        style={barStyle}
      />
    </span>
  );
}
