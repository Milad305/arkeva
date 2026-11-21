import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش empty/loading.

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-10 text-center', className)}>
      {icon && (
        <div className="mx-auto w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
