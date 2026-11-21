import { cn } from '@/shared/utils/cn';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** دایره — برای آواتار. */
  circle?: boolean;
  className?: string;
}

/**
 * اسکلت بارگذاری — `.skel` در kit.css.
 *
 * قاعدهٔ W46: کمتر از ۱۰۰ms هیچ نشانگری، تا ۱ ثانیه نشانگر درون‌خطی،
 * بیشتر از آن اسکلت. پس اسکلت فقط برای بارگذاری‌های کند صفحه است.
 */
export function Skeleton({ width, height = 10, circle, className }: SkeletonProps) {
  return (
    <span
      className={cn('skel', className)}
      style={{
        width,
        height,
        display: 'block',
        borderRadius: circle ? 999 : undefined,
      }}
    />
  );
}

export interface SkeletonKpiRowProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

/** ردیف کارت‌های KPI در حال بارگذاری — مطابق چیدمان W46. */
export function SkeletonKpiRow({ count = 4, columns = 4 }: SkeletonKpiRowProps) {
  return (
    <div className={cn('grid', `c${columns}`)} style={{ gap: 12 }} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="col g8"
          style={{ border: '1px solid var(--gray-100)', borderRadius: 10, padding: 12 }}
        >
          <Skeleton width="60%" height={10} />
          <Skeleton width="40%" height={22} />
          <Skeleton width="80%" height={8} />
        </div>
      ))}
    </div>
  );
}

export interface SkeletonTableProps {
  rows?: number;
  /** نسبت عرض نوار عنوان هر ردیف — بوم مقادیر نامنظم می‌دهد تا طبیعی دیده شود. */
  widths?: number[];
}

/** جدول در حال بارگذاری — ردیف‌هایی با آواتار، عنوان و چند ستون. */
export function SkeletonTable({ rows = 5, widths = [42, 36, 48, 30, 40] }: SkeletonTableProps) {
  return (
    <div className="col" style={{ gap: 0 }} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="row g16"
          style={{ padding: '11px 4px', borderBottom: '1px solid var(--gray-100)' }}
        >
          <Skeleton width={22} height={22} circle />
          <Skeleton width={`${widths[index % widths.length]}%`} height={10} />
          <Skeleton width="12%" height={10} className="ms-auto" />
          <Skeleton width="18%" height={6} />
          <Skeleton width="8%" height={10} />
        </div>
      ))}
    </div>
  );
}

/** متن «در حال بارگذاری…» برای انتظارهای کوتاه (تا ۱ ثانیه). */
export function InlineLoading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <span className="row g6 t-12 tx6" role="status">
      <svg className="pj-spin" width={14} height={14} viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7" stroke="var(--gray-200)" strokeWidth="2.4" fill="none" />
        <path
          d="M9 2a7 7 0 0 1 7 7"
          stroke="var(--gray-600)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}
