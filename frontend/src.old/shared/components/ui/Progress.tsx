import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش progress.

interface LinearProgressProps {
  value: number; // ۰ تا ۱۰۰
  className?: string;
  color?: string; // کلاس bg-* — اگر نباشد از primary استفاده می‌شود
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const heightClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function LinearProgress({
  value,
  className,
  color = 'bg-primary-700',
  size = 'md',
  showLabel,
  label,
}: LinearProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-600">{label}</span>
          {showLabel && (
            <span className="font-semibold">{clamped.toLocaleString('fa-IR')}٪</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', heightClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// نوار دوگانه (برنامه‌ای vs واقعی) — مطابق designs/Design System.html دو خطی
interface DualProgressProps {
  actual: number;
  planned: number;
  className?: string;
}

export function DualProgress({ actual, planned, className }: DualProgressProps) {
  const actualClamped = Math.max(0, Math.min(100, actual));
  const plannedClamped = Math.max(0, Math.min(100, planned));
  return (
    <div className={cn('relative w-full bg-gray-100 rounded-full h-3 overflow-hidden', className)}>
      {/* برنامه‌ای (پس‌زمینه) */}
      <div
        className="absolute inset-y-0 right-0 bg-gray-300 h-3 rounded-full"
        style={{ width: `${plannedClamped}%` }}
      />
      {/* واقعی (روی برنامه‌ای) */}
      <div
        className="absolute inset-y-0 right-0 bg-primary-700 h-3 rounded-full"
        style={{ width: `${actualClamped}%` }}
      />
    </div>
  );
}

// پیشرفت دایره‌ای — مطابق designs/Design System.html circular progress
interface CircularProgressProps {
  value: number;
  size?: number; // قطر به پیکسل
  strokeWidth?: number;
  color?: string; // hex
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = '#1A3354',
  label,
  showValue = true,
  className,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-scale-x-100" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E4E4E7"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {clamped.toLocaleString('fa-IR')}٪
          </div>
        )}
      </div>
      {label && <span className="text-xs text-gray-700">{label}</span>}
    </div>
  );
}
