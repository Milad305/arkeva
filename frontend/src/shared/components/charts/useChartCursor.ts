import { useCallback, useState } from 'react';

/**
 * نشانگر مشترک نمودارهای زمانی: نزدیک‌ترین تاریخ به موس یا به کلید فلش.
 *
 * نمودارها SVG دست‌سازند (بدون کتابخانهٔ نمودار)، پس این قلاب همان کاری را می‌کند که
 * کتابخانه می‌کرد: از مختصات صفحه به نمایهٔ تاریخ می‌رسد. هیچ عددی نمی‌سازد (D07) —
 * فقط می‌گوید کاربر روی کدام نقطه است.
 */
export interface ChartCursor {
  /** نمایهٔ تاریخ زیر نشانگر، یا `null` وقتی نشانگر بیرون است. */
  index: number | null;
  clear: () => void;
  /** روی `<svg>` پخش می‌شود. */
  svgProps: {
    tabIndex: 0;
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerLeave: () => void;
    onBlur: () => void;
    onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => void;
  };
}

/**
 * @param xs مختصات افقی هر تاریخ در دستگاه `viewBox` (هم‌طول `dates`).
 * @param viewW عرض `viewBox` تا مختصات صفحه به همان دستگاه برگردد.
 */
export function useChartCursor(xs: number[], viewW: number): ChartCursor {
  const [index, setIndex] = useState<number | null>(null);

  const nearest = useCallback(
    (viewX: number): number | null => {
      if (xs.length === 0) return null;
      let best = 0;
      let bestGap = Infinity;
      for (let position = 0; position < xs.length; position += 1) {
        const gap = Math.abs(xs[position]! - viewX);
        if (gap < bestGap) {
          bestGap = gap;
          best = position;
        }
      }
      return best;
    },
    [xs],
  );

  const clear = useCallback(() => setIndex(null), []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      if (box.width === 0) return;
      setIndex(nearest(((event.clientX - box.left) / box.width) * viewW));
    },
    [nearest, viewW],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      if (xs.length === 0) return;
      const last = xs.length - 1;
      // محور زمان چپ‌به‌راست است (CLAUDE.md ۵)، پس فلش راست یعنی جلوتر در زمان
      const step =
        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

      if (step !== 0) {
        event.preventDefault();
        setIndex((current) => Math.min(last, Math.max(0, (current ?? (step > 0 ? -1 : last + 1)) + step)));
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setIndex(last);
      } else if (event.key === 'Escape') {
        setIndex(null);
      }
    },
    [xs.length],
  );

  return {
    index,
    clear,
    svgProps: { tabIndex: 0, onPointerMove, onPointerLeave: clear, onBlur: clear, onKeyDown },
  };
}
