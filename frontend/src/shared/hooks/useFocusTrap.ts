import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * نگه‌داشتن فوکوس درون یک لایهٔ مودال و برگرداندن آن به عنصر قبلی هنگام بستن.
 *
 * بدون این، Tab کاربر را به صفحهٔ پشت مودال می‌برد — ایرادی که پیاده‌سازی قبلی داشت.
 * ref را خود فراخوان می‌سازد و هم به عنصر می‌دهد هم به اینجا.
 */
export function useFocusTrap(isActive: boolean, ref: RefObject<HTMLElement | null>): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = ref.current;
    if (!container) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // اولین عنصر قابل فوکوس، وگرنه خود ظرف
    const first = container.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? container).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0]!;
      const lastElement = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === firstElement || !container.contains(active))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && active === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus({ preventScroll: true });
    };
  }, [isActive, ref]);
}

/**
 * قفل اسکرول بدنهٔ صفحه، با شمارنده.
 * چند لایهٔ باز همزمان (مودال روی مودال) قفل همدیگر را باز نمی‌کنند —
 * ایراد دیگری که پیاده‌سازی قبلی داشت.
 */
let scrollLockCount = 0;
let previousOverflow = '';

export function useScrollLock(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    if (scrollLockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount += 1;

    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isActive]);
}
