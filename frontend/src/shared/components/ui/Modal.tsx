import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/cn';
import { useFocusTrap, useScrollLock } from '@/shared/hooks/useFocusTrap';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * عرض هر اندازه — همان `.modal.sm/.md/.lg` بوم. کلاس `lg` روی خود مودال گذاشته نمی‌شود
 * چون با کلاس راهنمای نمودار `.lg` در kit.css (`inline-flex`، `align-items:center`،
 * `nowrap`) برخورد می‌کرد و سربرگ و پانویس مودال بزرگ را جمع می‌کرد.
 */
const MODAL_MAX_WIDTH: Record<ModalSize, number> = { sm: 420, md: 600, lg: 820 };

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** عنوان مودال — برای `aria-labelledby` هم استفاده می‌شود. */
  title?: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  /** پانویس؛ معمولاً دکمه‌های لغو و تأیید. */
  footer?: ReactNode;
  /** بستن با کلیک روی پشت‌زمینه. برای فرم‌های نیمه‌پرشده خاموش کن. */
  dismissOnBackdrop?: boolean;
  /** دکمهٔ ضربدر سرِ مودال. */
  showClose?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * مودال — `.backdrop` + `.modal` + `.mh`/`.mb`/`.mf` از kit.css.
 *
 * فوکوس را trap و بازمی‌گرداند، اسکرول بدنه را با شمارنده قفل می‌کند
 * (پس چند مودال روی هم قفل همدیگر را باز نمی‌کنند) و `aria-labelledby` دارد.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  dismissOnBackdrop = true,
  showClose = true,
  className,
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(isOpen, panelRef);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    // بستن با کلیک روی پشت‌زمینه یک راحتیِ موشی است، نه تنها راه بستن:
    // Escape و دکمهٔ ضربدر هر دو هستند، پس نیازی به معادل صفحه‌کلید ندارد.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="pj backdrop"
      dir="rtl"
      lang="fa"
      style={{ position: 'fixed', inset: 0, zIndex: 100, height: 'auto', minHeight: 0 }}
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn('modal', className)}
        style={{ maxHeight: '90vh', maxWidth: MODAL_MAX_WIDTH[size] }}
      >
        {(title ?? showClose) && (
          <div className="mh">
            <div className="col g4" style={{ minWidth: 0 }}>
              {title && <h3 id={titleId}>{title}</h3>}
              {description && (
                <p className="sub" id={descriptionId}>
                  {description}
                </p>
              )}
            </div>
            {showClose && <IconButton icon="x" label="بستن" size="sm" onClick={onClose} />}
          </div>
        )}

        <div className="mb" style={{ overflowY: 'auto' }}>
          {children}
        </div>

        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
