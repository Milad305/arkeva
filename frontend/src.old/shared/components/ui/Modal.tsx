import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش overlay/modal و designs/Modals.html.
// سه اندازه استاندارد: sm (420px), md (600px), lg (820px).

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  // اگر true، با کلیک روی backdrop بسته نشود (برای فرم‌های کثیف)
  disableBackdropClose?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[600px]',
  lg: 'max-w-[820px]',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  disableBackdropClose,
}: ModalProps) {
  // بستن با ESC
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    // قفل اسکرول body
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget) onClose();
      }}
    >
      {/* backdrop blur */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-fade-in" />

      {/* modal content */}
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-xl border border-gray-200 w-full overflow-hidden animate-slide-up flex flex-col max-h-[90vh]',
          sizeClasses[size],
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || icon) && (
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {icon && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h3 className="font-semibold text-gray-900 truncate">{title}</h3>}
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/60 flex items-center justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
