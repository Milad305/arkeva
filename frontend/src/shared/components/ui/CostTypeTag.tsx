import { cn } from '@/shared/utils/cn';
import { COST_TYPE_CLASS, COST_TYPE_LABELS, type CostType } from '@/shared/types/tone';

export interface CostTypeTagProps {
  type: CostType;
  /** فقط مربع رنگی، بدون متن — برای ستون‌های باریک جدول. */
  compact?: boolean;
  className?: string;
}

/**
 * برچسب نوع هزینهٔ CBS — `.ct` در kit.css.
 * هر شش نوع رنگ اختصاصی دارند و در CBS، اتصالات و نمودار هزینه یکسان‌اند.
 */
export function CostTypeTag({ type, compact, className }: CostTypeTagProps) {
  return (
    <span
      className={cn('ct', COST_TYPE_CLASS[type], className)}
      title={compact ? COST_TYPE_LABELS[type] : undefined}
    >
      <i />
      {!compact && COST_TYPE_LABELS[type]}
    </span>
  );
}
