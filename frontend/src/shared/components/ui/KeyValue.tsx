import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

export interface KeyValueProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

/** جفت برچسب/مقدار — `.kv` در kit.css. پنل جزئیات و سرِ گزارش‌ها. */
export function KeyValue({ label, value, className }: KeyValueProps) {
  return (
    <div className={cn('kv', className)}>
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

export interface KeyValueGridProps {
  columns?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

/** شبکهٔ جفت‌ها با `minmax(0,1fr)` — در عرض کم ستون‌ها نمی‌شکنند. */
export function KeyValueGrid({ columns = 2, className, style, children }: KeyValueGridProps) {
  return (
    <div className={cn('grid', `c${columns}`, className)} style={style}>
      {children}
    </div>
  );
}
