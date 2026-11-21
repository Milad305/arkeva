import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * راهنمای شناور برای نمودارهای HTMLای (گانت، heatmap) و SVGهای ناحیه‌ای (treemap)
 * که نقطهٔ ثابتی ندارند و راهنما باید دنبال نشانگر بیاید.
 *
 * همان ظاهر `ChartTooltip` را دارد تا همهٔ نمودارها یک‌جور حرف بزنند؛ جایگزین
 * `title` بومی مرورگر است که تأخیر دارد، لاتین می‌نشیند و در چاپ هم دیده نمی‌شود.
 */
export interface HoverTip {
  /** روی عنصر پخش می‌شود: `{...tip.on(<span>…</span>)}` */
  on: (content: ReactNode) => {
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerLeave: () => void;
  };
  /** انتهای کامپوننت رندر می‌شود. */
  node: ReactNode;
}

const GAP = 14;
const WIDTH = 240;

export function useHoverTip(): HoverTip {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const hide = useCallback(() => setTip(null), []);

  const on = useCallback(
    (content: ReactNode) => ({
      onPointerMove: (event: React.PointerEvent) =>
        setTip({ x: event.clientX, y: event.clientY, content }),
      onPointerLeave: hide,
    }),
    [hide],
  );

  const node =
    tip === null
      ? null
      : createPortal(
          <div
            role="tooltip"
            className="chart-tip"
            style={{
              position: 'fixed',
              insetInlineStart: 'auto',
              left: tip.x + GAP + WIDTH > window.innerWidth ? tip.x - GAP - WIDTH : tip.x + GAP,
              top: Math.min(window.innerHeight - 90, tip.y + GAP),
              width: WIDTH,
              maxWidth: WIDTH,
            }}
          >
            {tip.content}
          </div>,
          document.body,
        );

  return { on, node };
}
