import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from '@/shared/components/ui/Icon';

export interface EmptyStateProps {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  /** دکمه‌ها — همیشه حداقل یک راه ادامه (قاعدهٔ W46). */
  actions?: ReactNode;
  /** متن ریز زیر توضیح، مثل کد پیگیری خطا. */
  footnote?: ReactNode;
  /** رنگ مربع آیکن؛ پیش‌فرض سرمه‌ای primary. */
  iconStyle?: React.CSSProperties;
  /** درون کارت نشان داده شود. */
  inCard?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * حالت خالی / خطا / بدون دسترسی — `.empty` + `.eic` در kit.css.
 * همین یک کامپوننت تمام حالت‌های W46 و W09 و W13 را پوشش می‌دهد.
 */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  footnote,
  iconStyle,
  inCard,
  className,
  style,
}: EmptyStateProps) {
  return (
    <div className={cn(inCard && 'card', 'empty', className)} style={style}>
      <span className="eic" style={iconStyle}>
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {footnote && <span className="t-xs tx5">{footnote}</span>}
      {actions && (
        <div className="row g8 wrap jc" style={{ marginTop: 6 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
