import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش overlay/tooltip.
// tooltip ساده، بالای عنصر، پس‌زمینه تیره.

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            side === 'top'
              ? 'top-full border-t-gray-900'
              : 'bottom-full border-b-gray-900',
          )}
        />
      </span>
    </span>
  );
}
