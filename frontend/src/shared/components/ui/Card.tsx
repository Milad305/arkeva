import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';

export interface CardProps {
  /**
   * `.card` در بوم `overflow:hidden` دارد تا گوشه‌ها تمیز بمانند.
   * برای کارتی که منوی بازشو درونش هست باید باز شود (مثل نوار فیلتر W07).
   */
  overflowVisible?: boolean;
  as?: 'div' | 'section' | 'article';
  /** لنگر پیوند بخش (`#security`). */
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

/** ref را عبور می‌دهد تا کارت نمودار بتواند SVG خودش را برای خروجی پیدا کند (W45). */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { overflowVisible, as: Tag = 'section', id, className, style, children },
  ref,
) {
  return (
    <Tag
      ref={ref as React.Ref<HTMLElement & HTMLDivElement>}
      id={id}
      className={cn('card', className)}
      style={overflowVisible ? { overflow: 'visible', ...style } : style}
    >
      {children}
    </Tag>
  );
});

export interface CardHeaderProps {
  title?: ReactNode;
  icon?: IconName;
  /** رنگ آیکن سرکارت — در بوم اغلب `tx5` یا یک tone معنادار است. */
  iconClassName?: string;
  subtitle?: ReactNode;
  /** سمت مقابل سرکارت: پیوند «مشاهدهٔ همه»، دکمه، راهنمای نمودار. */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({
  title,
  icon,
  iconClassName = 'tx5',
  subtitle,
  action,
  className,
  children,
}: CardHeaderProps) {
  if (children) {
    return <div className={cn('card-h', className)}>{children}</div>;
  }

  return (
    <div className={cn('card-h', className)}>
      <div>
        <h3>
          {icon && (
            <span className={iconClassName} style={{ display: 'inline-flex' }}>
              <Icon name={icon} size={16} />
            </span>
          )}
          {title}
        </h3>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export interface CardSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function CardBody({ className, style, children }: CardSectionProps) {
  return (
    <div className={cn('card-b', className)} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ className, style, children }: CardSectionProps) {
  return (
    <div className={cn('card-f', className)} style={style}>
      {children}
    </div>
  );
}

/** جعبهٔ خاکستری درون‌کارتی — `.box` در kit.css. */
export function Box({ className, style, children }: CardSectionProps) {
  return (
    <div className={cn('box', className)} style={style}>
      {children}
    </div>
  );
}
