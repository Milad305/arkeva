import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش empty/loading (skeleton shimmer).

interface SkeletonProps {
  className?: string;
  // variant برای فرم‌های رایج
  variant?: 'text' | 'rect' | 'circle' | 'card';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded',
        variant === 'text' && 'h-3 rounded',
        variant === 'rect' && 'rounded-md',
        variant === 'circle' && 'rounded-full',
        className,
      )}
    />
  );
}

// skeleton آماده برای لیست/جدول
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
