import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش badges.
// سه نوع: solid (رنگ پر)، soft (رنگ لطیف)، numeric (دایره با عدد).

type BadgeVariant = 'solid' | 'soft' | 'numeric';

interface BaseBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const baseClasses: Record<BadgeVariant, string> = {
  solid: 'inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[11.5px] font-medium text-white leading-none',
  soft: 'inline-flex items-center h-[22px] px-2 rounded-md text-xs font-medium leading-none',
  numeric:
    'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none text-white bg-primary-500',
};

export function Badge({ variant = 'soft', className, children, ...props }: BaseBadgeProps) {
  return (
    <span className={cn(baseClasses[variant], className)} {...props}>
      {children}
    </span>
  );
}

// helper برای badge با نقطه (online/offline/syncing)
interface DotBadgeProps extends Omit<BaseBadgeProps, 'children'> {
  dotColor: string;
  label: string;
}

export function DotBadge({ dotColor, label, className, ...props }: DotBadgeProps) {
  return (
    <Badge variant="soft" className={cn(className)} {...props}>
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full ml-1.5', dotColor)} />
      {label}
    </Badge>
  );
}
