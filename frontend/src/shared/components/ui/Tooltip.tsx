import { useId, useState, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';

export interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  /** عرض ثابت برای متن‌های چندخطی؛ پیش‌فرض یک‌خطی است. */
  width?: number;
  children: ReactElement;
  className?: string;
}

const PLACEMENT_STYLE: Record<TooltipPlacement, React.CSSProperties> = {
  top: { bottom: 'calc(100% + 6px)', insetInlineStart: '50%', transform: 'translateX(50%)' },
  bottom: { top: 'calc(100% + 6px)', insetInlineStart: '50%', transform: 'translateX(50%)' },
  start: { insetInlineEnd: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
  end: { insetInlineStart: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
};

/**
 * راهنمای شناور — `.tip` در kit.css.
 *
 * با hover و با فوکوس صفحه‌کلید باز می‌شود (نه فقط hover، که ایراد پیاده‌سازی قبلی بود)
 * و با `aria-describedby` به عنصر وصل است.
 */
export function Tooltip({ content, placement = 'top', width, children, className }: TooltipProps) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocusCapture={() => setIsVisible(true)}
      onBlurCapture={() => setIsVisible(false)}
    >
      <span aria-describedby={isVisible ? id : undefined} style={{ display: 'inline-flex' }}>
        {children}
      </span>

      {isVisible && (
        <span
          id={id}
          role="tooltip"
          className={cn('tip', className)}
          style={{
            position: 'absolute',
            zIndex: 50,
            ...PLACEMENT_STYLE[placement],
            ...(width ? { width, whiteSpace: 'normal', lineHeight: 1.6 } : {}),
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
