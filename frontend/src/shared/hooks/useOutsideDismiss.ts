import { useEffect, type RefObject } from 'react';

/**
 * بستن یک لایهٔ شناور با کلیک بیرون یا کلید Escape.
 *
 * ref را خود فراخوان می‌سازد (`useRef<HTMLDivElement>(null)`) و همان را هم به
 * عنصر می‌دهد و هم به این هوک — تا تایپ ref با آنچه React انتظار دارد یکی بماند.
 * اگر دکمهٔ بازکننده بیرون از آن ظرف است، آن را در `ignore` بده تا کلیک روی
 * خودش لایه را دوبار toggle نکند.
 */
export function useOutsideDismiss(
  isOpen: boolean,
  onDismiss: () => void,
  ref: RefObject<HTMLElement | null>,
  ignore?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (ignore?.current?.contains(target)) return;
      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDismiss, ref, ignore]);
}
