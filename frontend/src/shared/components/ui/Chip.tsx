import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';

export interface ChipProps {
  children: ReactNode;
  icon?: IconName;
  selected?: boolean;
  /** اگر بیاید دکمهٔ حذف نشان داده می‌شود (فیلتر فعال، برچسب انتخاب‌شده). */
  onRemove?: () => void;
  onClick?: () => void;
  /** خط‌چین — در W28 برای «نیم‌روز» پنجشنبه. */
  dashed?: boolean;
  title?: string;
  className?: string;
}

/** تراشه — `.chip` در kit.css. فیلترهای سریع و روزهای کاری. */
export function Chip({
  children,
  icon,
  selected,
  onRemove,
  onClick,
  dashed,
  title,
  className,
}: ChipProps) {
  const classes = cn('chip', selected && 'on', className);
  const style = dashed ? { borderStyle: 'dashed' as const } : undefined;

  const inner = (
    <>
      {icon && <Icon name={icon} size={12} />}
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="حذف"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="ibtn sm"
          style={{ width: 18, height: 18, color: 'inherit' }}
        >
          <Icon name="x" size={11} />
        </button>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        title={title}
        className={classes}
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={classes} style={style} title={title}>
      {inner}
    </span>
  );
}
