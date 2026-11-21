import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش feedback/inline alerts.

type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  severity: AlertSeverity;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClose?: () => void;
}

const severityConfig: Record<
  AlertSeverity,
  { bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  success: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    border: 'border-success-500/30',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    border: 'border-warning-500/30',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-error-50',
    text: 'text-error-700',
    border: 'border-error-500/30',
    icon: XCircle,
  },
  info: {
    bg: 'bg-info-50',
    text: 'text-info-700',
    border: 'border-info-500/30',
    icon: Info,
  },
};

export function Alert({ severity, title, children, className, onClose }: AlertProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        'flex gap-2.5 px-3.5 py-3 rounded-lg border',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {children && <div className={cn('text-xs mt-0.5', config.text, 'opacity-90')}>{children}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn('flex-shrink-0 hover:opacity-70', config.text)}
          aria-label="بستن"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
