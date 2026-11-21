import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { Icon } from './Icon';

export interface PageHeadProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** خط کوچک بالای عنوان با خط تزئینی نارنجی (`.eyebrow`). */
  eyebrow?: ReactNode;
  /** دکمه‌های سمت مقابل. */
  actions?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * سرِ صفحه — `.page-head` در kit.css.
 * `flex-wrap` دارد، پس در عرض کم دکمه‌ها زیر عنوان می‌افتند، نه بیرون از کادر.
 */
export function PageHead({ title, subtitle, eyebrow, actions, className, style }: PageHeadProps) {
  return (
    <div className={cn('page-head', className)} style={style}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="h-display">{title}</h1>
        {subtitle && (
          <p className="sub" style={{ fontSize: 13 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="row g8 wrap">{actions}</div>}
    </div>
  );
}

export interface Crumb {
  label: string;
  /** اگر نیاید، آخرین حلقهٔ مسیر است. */
  to?: string;
  /** حلقهٔ اول با آیکن خانه. */
  home?: boolean;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  /** `bc` سرِ محتوا · `crumbs` درون نوار بالا. */
  variant?: 'content' | 'topbar';
  className?: string;
}

/** مسیر — `.bc` یا `.crumbs` در kit.css. جداکننده در RTL `chevron-left` است. */
export function Breadcrumbs({ items, variant = 'content', className }: BreadcrumbsProps) {
  return (
    <nav className={cn(variant === 'topbar' ? 'crumbs' : 'bc', className)} aria-label="مسیر">
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${crumb.label}-${index}`} className="row g4" style={{ minWidth: 0 }}>
            {crumb.to && !isLast ? (
              <Link to={crumb.to} className="row g4">
                {crumb.home && <Icon name="home" size={12} />}
                {crumb.label}
              </Link>
            ) : (
              <span className={variant === 'topbar' ? 'leaf trunc' : 'tx8 fw5'}>{crumb.label}</span>
            )}
            {!isLast && (
              <span className={variant === 'topbar' ? 'sep' : 'tx5'} style={{ display: 'inline-flex' }}>
                <Icon name="chevron-left" size={12} />
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
