import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { IconButton } from '@/shared/components/ui/IconButton';
import { WorkspaceContext, type WorkspaceContextValue, type WorkspaceLayout } from './workspaceContext';

/** کمینهٔ عرض مفید ناحیهٔ مرکزی — همان `flex-basis` مرکز در آرت‌بورد. */
const CENTER_MIN = 480;

export interface WorkspaceProps {
  /** پنل کنارِ شروع — فیلترها و ابزارها. */
  toolbar?: ReactNode;
  /** پنل کنارِ پایان — جزئیات آیتم انتخاب‌شده. */
  detail?: ReactNode;
  /** عرض پنل ابزار؛ پیش‌فرض همان ۲۷۲px بوم. */
  toolbarWidth?: number;
  /** عرض پنل جزئیات؛ پیش‌فرض همان ۳۷۲px بوم. */
  detailWidth?: number;
  /** کف ارتفاع ناحیهٔ کاری. */
  minHeight?: number;
  /**
   * ارتفاع را تا لبهٔ پایین پنجره پر کن تا جدول درون مرکز اسکرول بخورد، نه کل صفحه
   * (آرت‌بورد W11 ارتفاع ثابت ۷۶۶px دارد؛ اینجا با پنجره هم‌اندازه می‌شود).
   */
  fillViewport?: boolean;
  /**
   * در چیدمان‌های `two` و `one` جزئیات لایه است و فقط وقتی این روشن باشد دیده می‌شود.
   * در چیدمان `three` همیشه دیده می‌شود (حالت خالی‌اش را خود صفحه می‌سازد).
   */
  isDetailOpen?: boolean;
  onDetailClose?: () => void;
  /** برچسب دسترس‌پذیری لایه‌ها. */
  toolbarLabel?: string;
  detailLabel?: string;
  className?: string;
  children: ReactNode;
}

/**
 * کارگاه سه‌پنلی — چیدمان WBS، CBS، اتصالات و تخصیص.
 *
 * **قرارداد واکنش‌گرایی (هستهٔ رفع مشکل مانیتور):**
 *
 * پیاده‌سازی قدیمی `grid-cols-[280px_minmax(0,1fr)_380px]` داشت — دو ستون px مطلق
 * که هرگز جمع نمی‌شدند و حتی در ۱۹۲۰ کم می‌آوردند. نسخهٔ قبلیِ همین فایل با
 * `flex-wrap` پنل جزئیات را به ردیف بعد می‌انداخت؛ با ارتفاع ثابتِ کارگاه این یعنی
 * دو ردیف در یک ارتفاع فشرده می‌شدند.
 *
 * اینجا عرض خود ظرف اندازه گرفته می‌شود:
 *   ≥ ابزار + جزئیات + ۴۸۰   ← سه پنل کنار هم (در ۱۴۴۰: ۱۲۱۶ ≥ ۱۱۲۴)
 *   ≥ ابزار + ۴۸۰            ← جزئیات لایهٔ کناری روی مرکز (۱۲۸۰: ۱۰۵۶)
 *   کمتر                     ← ابزار هم لایه می‌شود (تبلت، موبایل)
 * پس هیچ پنلی از عرض پایه‌اش کوچک‌تر نمی‌شود و صفحه هرگز اسکرول افقی نمی‌گیرد؛
 * جدول پهن درون مرکز، اسکرول افقی خودش را دارد.
 */
export function Workspace({
  toolbar,
  detail,
  toolbarWidth = 272,
  detailWidth = 372,
  minHeight = 600,
  fillViewport = false,
  isDetailOpen = true,
  onDetailClose,
  toolbarLabel = 'ابزارها و فیلترها',
  detailLabel = 'جزئیات',
  className,
  children,
}: WorkspaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  const height = useViewportFill(ref, fillViewport, minHeight);
  const [isToolbarOpen, setToolbarOpen] = useState(false);

  const layout: WorkspaceLayout =
    width === null || width >= toolbarWidth + detailWidth + CENTER_MIN
      ? 'three'
      : width >= toolbarWidth + CENTER_MIN
        ? 'two'
        : 'one';

  const toolbarInline = toolbar && layout !== 'one';
  const toolbarOverlay = toolbar && layout === 'one' && isToolbarOpen;
  const detailInline = detail && layout === 'three';
  const detailOverlay = detail && layout !== 'three' && isDetailOpen;

  // Esc لایهٔ باز را می‌بندد — اول جزئیات، بعد ابزار.
  useEffect(() => {
    if (!detailOverlay && !toolbarOverlay) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (detailOverlay) onDetailClose?.();
      else setToolbarOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailOverlay, toolbarOverlay, onDetailClose]);

  const context: WorkspaceContextValue = {
    layout,
    isToolbarOpen,
    openToolbar: () => setToolbarOpen(true),
    closeToolbar: () => setToolbarOpen(false),
  };

  return (
    <WorkspaceContext.Provider value={context}>
      <div
        ref={ref}
        className={cn('row', className)}
        style={{
          gap: 0,
          alignItems: 'stretch',
          flex: '1 1 auto',
          position: 'relative',
          minHeight,
          height: fillViewport ? height : undefined,
          overflow: 'hidden',
        }}
      >
        {toolbarInline && (
          <aside
            className="pane scroll-thin"
            aria-label={toolbarLabel}
            style={{
              flex: `0 0 ${toolbarWidth}px`,
              borderInlineEnd: '1px solid var(--gray-200)',
              padding: 14,
              gap: 16,
              overflowY: 'auto',
            }}
          >
            {toolbar}
          </aside>
        )}

        <section
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--gray-50)',
          }}
        >
          {children}
        </section>

        {detailInline && (
          <aside
            className="pane scroll-thin"
            aria-label={detailLabel}
            style={{
              flex: `0 0 ${detailWidth}px`,
              borderInlineStart: '1px solid var(--gray-200)',
              overflowY: 'auto',
            }}
          >
            {detail}
          </aside>
        )}

        {toolbarOverlay && (
          <OverlayPane
            side="start"
            width={toolbarWidth}
            label={toolbarLabel}
            onClose={() => setToolbarOpen(false)}
            padded
          >
            {toolbar}
          </OverlayPane>
        )}

        {detailOverlay && (
          <OverlayPane side="end" width={detailWidth} label={detailLabel} onClose={onDetailClose}>
            {detail}
          </OverlayPane>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}

function OverlayPane({
  side,
  width,
  label,
  onClose,
  padded,
  children,
}: {
  side: 'start' | 'end';
  width: number;
  label: string;
  onClose?: () => void;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <aside
      className="pane scroll-thin"
      aria-label={label}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: 0,
        width: `min(${width}px, 100%)`,
        zIndex: 20,
        overflowY: 'auto',
        boxShadow: 'var(--sh-lg)',
        [side === 'start' ? 'borderInlineEnd' : 'borderInlineStart']: '1px solid var(--gray-200)',
      }}
    >
      <div
        className="row between"
        style={{ padding: '8px 10px 8px 14px', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}
      >
        <span className="t-sm fw6 tx7">{label}</span>
        {onClose && <IconButton icon="x" label={`بستن ${label}`} size="sm" onClick={onClose} />}
      </div>
      <div className={padded ? 'col' : 'col grow'} style={padded ? { padding: 14, gap: 16 } : { minHeight: 0 }}>
        {children}
      </div>
    </aside>
  );
}

function useElementWidth(ref: React.RefObject<HTMLElement>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setWidth(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/**
 * ارتفاع از بالای ظرف تا پایین پنجره. نوارهای بالای کارگاه (هشدار، نوار نسخهٔ کاری)
 * پس از بارگذاری ظاهر می‌شوند و ظرف را پایین می‌برند؛ برای همین علاوه بر تغییر اندازهٔ
 * پنجره، تغییر اندازهٔ ظرف والد هم دوباره سنجیده می‌شود.
 */
function useViewportFill(
  ref: React.RefObject<HTMLElement>,
  enabled: boolean,
  minHeight: number,
): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return undefined;

    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const next = Math.max(minHeight, Math.floor(window.innerHeight - top));
      setHeight((previous) => (previous === next ? previous : next));
    };

    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (element.parentElement) observer?.observe(element.parentElement);
    // جابه‌جایی محتوای بالای ظرف بدون تغییر اندازهٔ والد (مثلاً بسته شدن یک هشدار)
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(measure);
    if (element.parentElement) mutations?.observe(element.parentElement, { childList: true });

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [enabled, minHeight, ref]);

  return height;
}

export interface WorkspaceToolbarProps {
  className?: string;
  children: ReactNode;
}

/** نوار ابزار بالای ناحیهٔ مرکزی — سفید، با مرز پایین. */
export function WorkspaceToolbar({ className, children }: WorkspaceToolbarProps) {
  return (
    <div
      className={cn('row wrap g8', className)}
      style={{
        padding: '8px 14px',
        background: '#fff',
        borderBottom: '1px solid var(--gray-200)',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export interface WorkspaceScrollProps {
  children: ReactNode;
  /** برای درخت مجازی که باید موقعیت اسکرول را بخواند. */
  scrollRef?: React.Ref<HTMLDivElement>;
  label?: string;
}

/** ناحیهٔ اسکرول‌دار مرکزی که جدول یا درخت در آن می‌نشیند. */
export function WorkspaceScroll({ children, scrollRef, label }: WorkspaceScrollProps) {
  return (
    <div
      ref={scrollRef}
      className="scroll-thin"
      role={label ? 'region' : undefined}
      aria-label={label}
      style={{ flex: '1 1 auto', overflow: 'auto', minHeight: 0, position: 'relative' }}
    >
      {children}
    </div>
  );
}

/** نوار پایین ناحیهٔ مرکزی — شمارش، راهنمای رنگ‌ها، نکتهٔ تعاملی. */
export function WorkspaceStatusBar({ className, children }: WorkspaceToolbarProps) {
  return (
    <div
      className={cn('row wrap between g8 t-sm tx6', className)}
      style={{
        padding: '7px 14px',
        background: '#fff',
        borderTop: '1px solid var(--gray-200)',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
