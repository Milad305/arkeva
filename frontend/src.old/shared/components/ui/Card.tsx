import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش cards.

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  // ring به‌جای shadow برای فلت بودن
  bordered?: boolean;
}

export function Card({ className, children, bordered = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white',
        bordered && 'border border-gray-200',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-gray-200 bg-gray-50/60', className)}
      {...props}
    >
      {children}
    </div>
  );
}
