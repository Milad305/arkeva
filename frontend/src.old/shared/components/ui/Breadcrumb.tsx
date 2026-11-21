import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش breadcrumb.
// در RTL فلش به سمت چپ است (chevron-left) نشان‌دهنده پیشرفت مسیر.

export interface BreadcrumbItem {
  label: string;
  to?: string; // اگر نباشد، آیتم فعلی (غیرقابل کلیک) است
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1.5 flex-wrap text-sm text-gray-600', className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <Fragment key={idx}>
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-primary-700 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && 'text-gray-900 font-medium')}>{item.label}</span>
            )}
            {!isLast && <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
