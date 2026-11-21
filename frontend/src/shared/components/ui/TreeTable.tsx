import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/shared/utils/cn';
import type { EntityId } from '@/shared/types/api';
import { Icon } from './Icon';
import type { Column, ColumnAlign } from './DataTable';

/** کمینهٔ قرارداد یک گره درخت — WBS و CBS هر دو همین را دارند. */
export interface TreeNodeLike {
  id: EntityId;
  children?: this[];
}

export interface FlatNode<T> {
  node: T;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId: EntityId | null;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = { start: '', center: 'c', end: 'l' };

/** تورفتگی هر سطح — همان گام ۲۰px کلاس‌های `.ti.l1…l3` kit.css. */
const INDENT_STEP = 20;

/** تبدیل درخت به فهرست ردیف‌های دیده‌شده، با عمق هر ردیف. */
export function flattenVisible<T extends TreeNodeLike>(
  nodes: readonly T[],
  expandedIds: ReadonlySet<EntityId>,
  depth = 0,
  parentId: EntityId | null = null,
): Array<FlatNode<T>> {
  const result: Array<FlatNode<T>> = [];

  for (const node of nodes) {
    const children = (node.children ?? []) as T[];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    result.push({ node, depth, hasChildren, isExpanded, parentId });

    if (hasChildren && isExpanded) {
      result.push(...flattenVisible(children, expandedIds, depth + 1, node.id));
    }
  }

  return result;
}

export interface TreeTitleColumn<T> {
  header: ReactNode;
  minWidth?: number;
  /** متن عنوان گره. */
  title: (node: T) => ReactNode;
  /** نشان‌های کنار عنوان — مثل هشدار «Σ ۹۵٪» وزن نامتعادل. */
  badges?: (node: T) => ReactNode;
}

export interface TreeVirtualization {
  /** ظرف اسکرول (`WorkspaceScroll`) که موقعیتش خوانده می‌شود. */
  scrollRef: React.RefObject<HTMLElement>;
  /** ارتفاع ثابت هر ردیف به px؛ مجازی‌سازی فقط با ارتفاع ثابت درست است. */
  rowHeight: number;
  /** از این تعداد ردیف به بالا مجازی شود؛ پیش‌فرض ۱۵۰. */
  threshold?: number;
  /** ردیف‌های اضافهٔ بالا و پایین پنجره. */
  overscan?: number;
}

export interface TreeTableProps<T extends TreeNodeLike> {
  nodes: readonly T[];
  /** ستون اول — تورفتگی، فلش باز/بسته و آیکن پوشه/برگ را خودِ جدول می‌سازد. */
  titleColumn: TreeTitleColumn<T>;
  /** بقیهٔ ستون‌ها، مثل DataTable. */
  columns: Array<Column<T>>;

  /**
   * کف عرض جدول — **اجباری**، به همان دلیل DataTable.
   * درخت درون ظرفی با `overflow:auto` می‌نشیند و اسکرول افقی خودش را می‌گیرد.
   */
  minWidth: number;

  expandedIds: ReadonlySet<EntityId>;
  onToggleExpand: (id: EntityId) => void;

  selectedId?: EntityId | null;
  onSelect?: (node: T) => void;
  /** منوی راست‌کلیک ردیف (W45). */
  onRowContextMenu?: (node: T, event: MouseEvent<HTMLTableRowElement>) => void;

  /** کلاس وضعیت ردیف — `.s-done` / `.s-prog` / `.s-warn` / `.s-late` / `.s-none`. */
  rowStatusClass?: (node: T) => string | undefined;
  /** پس‌زمینهٔ ملایم قرمز برای ردیف‌های تأخیر بحرانی (`.late`). */
  isLate?: (node: T) => boolean;
  /**
   * ردیف زمینه — در نتیجهٔ فیلتر، والدی که خودش شرط را ندارد ولی باید دیده شود
   * تا جای فرزند پیداشده در درخت معلوم باشد. کم‌رنگ نمایش داده می‌شود.
   */
  isDimmed?: (node: T) => boolean;
  /** گره برگ است؟ اگر نیاید از نداشتن فرزند تشخیص داده می‌شود. */
  isLeaf?: (node: T) => boolean;

  /** سرستون هنگام اسکرول بالای ظرف می‌ماند. */
  stickyHeader?: boolean;
  /** مجازی‌سازی برای درخت‌های بزرگ (`features/wbs.md` ۱۲: تا ۵٬۰۰۰ آیتم). */
  virtualization?: TreeVirtualization;
  /**
   * پیمایش با صفحه‌کلید: ↑ ↓ ردیف قبل و بعد، ← باز کردن یا رفتن به اولین فرزند،
   * → بستن یا رفتن به والد (جهت راست‌به‌چپ)، Home و End.
   */
  keyboardNavigation?: boolean;

  /** ویژگی‌های اضافهٔ هر ردیف — مثلاً کشیدن و رها کردن در W12. */
  getRowProps?: (node: T) => React.HTMLAttributes<HTMLTableRowElement> & { 'data-drop'?: string };

  caption?: string;
  className?: string;
}

/**
 * جدول درختی WBS / CBS — `.tree` در kit.css.
 *
 * تورفتگی با `.ti.l1/.l2/.l3` (و برای عمق بیشتر، همان گام به‌صورت inline تا ۱۰ سطح
 * `features/wbs.md` ۵.۱)، نوار وضعیت با `td.st` و کلاس‌های `.s-*`، و فلش باز/بسته
 * همه همان‌هایی هستند که آرت‌بورد W11 دارد.
 */
export function TreeTable<T extends TreeNodeLike>({
  nodes,
  titleColumn,
  columns,
  minWidth,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  onRowContextMenu,
  rowStatusClass,
  isLate,
  isDimmed,
  isLeaf,
  stickyHeader,
  virtualization,
  keyboardNavigation,
  getRowProps,
  caption,
  className,
}: TreeTableProps<T>) {
  const rows = useMemo(() => flattenVisible(nodes, expandedIds), [nodes, expandedIds]);
  const tableRef = useRef<HTMLTableElement>(null);

  const isVirtual = Boolean(virtualization) && rows.length >= (virtualization?.threshold ?? 150);
  const range = useVirtualRange(isVirtual ? virtualization : undefined, rows.length);
  const rowHeight = virtualization?.rowHeight;

  // ردیف انتخاب‌شده (از URL یا صفحه‌کلید) را در دید نگه دار.
  const selectedIndex = selectedId == null ? -1 : rows.findIndex((row) => row.node.id === selectedId);
  useEffect(() => {
    if (selectedIndex < 0) return;
    if (isVirtual && virtualization) {
      const container = virtualization.scrollRef.current;
      const height = virtualization.rowHeight;
      const headerOffset = tableRef.current?.tHead?.getBoundingClientRect().height ?? 0;
      if (!container) return;
      const top = selectedIndex * height + headerOffset;
      if (top - headerOffset < container.scrollTop) container.scrollTop = top - headerOffset;
      else if (top + height > container.scrollTop + container.clientHeight)
        container.scrollTop = top + height - container.clientHeight;
      return;
    }
    const element = tableRef.current?.querySelector<HTMLElement>(`tr[data-row-index="${selectedIndex}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isVirtual, virtualization]);

  // فوکوس با انتخاب صفحه‌کلیدی جابه‌جا شود — فقط اگر فوکوس از قبل درون جدول است.
  useEffect(() => {
    if (!keyboardNavigation || selectedIndex < 0) return;
    const table = tableRef.current;
    if (!table || !table.contains(document.activeElement)) return;
    const element = table.querySelector<HTMLElement>(`tr[data-row-index="${selectedIndex}"]`);
    if (element && document.activeElement !== element) element.focus({ preventScroll: true });
  });

  function handleKeyDown(event: globalThis.KeyboardEvent) {
    if (!keyboardNavigation || !onSelect || rows.length === 0) return;
    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) {
      if (!(event.target instanceof HTMLTableRowElement)) return;
    }
    const current = selectedIndex;
    const row = current >= 0 ? rows[current] : undefined;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : Math.min(rows.length - 1, current + 1);
        break;
      case 'ArrowUp':
        next = current < 0 ? 0 : Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = rows.length - 1;
        break;
      case 'ArrowLeft':
        // در راست‌به‌چپ «جلو» یعنی چپ: باز کن، یا اگر باز است برو به اولین فرزند
        if (row?.hasChildren && !row.isExpanded) onToggleExpand(row.node.id);
        else if (row?.hasChildren) next = current + 1;
        break;
      case 'ArrowRight':
        if (row?.hasChildren && row.isExpanded) onToggleExpand(row.node.id);
        else if (row?.parentId != null) next = rows.findIndex((item) => item.node.id === row.parentId);
        break;
      default:
        return;
    }

    event.preventDefault();
    if (next !== null && next >= 0 && rows[next]) onSelect(rows[next].node);
  }

  // شنوندهٔ صفحه‌کلید روی خود جدول؛ آخرین نسخهٔ تابع از ref خوانده می‌شود
  const keyHandlerRef = useRef(handleKeyDown);
  keyHandlerRef.current = handleKeyDown;
  useEffect(() => {
    const table = tableRef.current;
    if (!keyboardNavigation || !table) return undefined;
    const listener = (event: globalThis.KeyboardEvent) => keyHandlerRef.current(event);
    table.addEventListener('keydown', listener);
    return () => table.removeEventListener('keydown', listener);
  }, [keyboardNavigation]);

  const visible = isVirtual ? rows.slice(range.start, range.end) : rows;
  const topPad = isVirtual && rowHeight ? range.start * rowHeight : 0;
  const bottomPad = isVirtual && rowHeight ? (rows.length - range.end) * rowHeight : 0;
  const colSpan = columns.length + 1;
  const thStyle = stickyHeader ? ({ position: 'sticky', top: 0, zIndex: 2 } as const) : undefined;

  return (
    <table
      ref={tableRef}
      className={cn('tree', className)}
      style={{ minWidth }}
      role={keyboardNavigation ? 'treegrid' : undefined}
      aria-rowcount={keyboardNavigation ? rows.length : undefined}
    >
      {caption && <caption className="sr-input">{caption}</caption>}
      <thead>
        <tr>
          <th style={{ minWidth: titleColumn.minWidth ?? 290, ...thStyle }}>{titleColumn.header}</th>
          {columns.map((column) => (
            <th
              key={column.key}
              className={cn(column.align && ALIGN_CLASS[column.align])}
              style={{
                width: column.width,
                minWidth: column.minWidth,
                color: column.emphasized ? 'var(--gray-700)' : undefined,
                ...thStyle,
              }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {topPad > 0 && (
          <tr aria-hidden="true" style={{ height: topPad }}>
            <td colSpan={colSpan} style={{ padding: 0, border: 0 }} />
          </tr>
        )}

        {visible.map(({ node, depth, hasChildren, isExpanded }, offset) => {
          const index = (isVirtual ? range.start : 0) + offset;
          const isSelected = selectedId !== undefined && selectedId === node.id;
          const leaf = isLeaf ? isLeaf(node) : !hasChildren;
          const dimmed = isDimmed?.(node) ?? false;

          return (
            <tr
              {...getRowProps?.(node)}
              key={node.id}
              data-row-index={index}
              className={cn(rowStatusClass?.(node), isSelected ? 'sel' : isLate?.(node) && 'late')}
              onClick={onSelect ? () => onSelect(node) : undefined}
              onContextMenu={onRowContextMenu ? (event) => onRowContextMenu(node, event) : undefined}
              tabIndex={keyboardNavigation ? (isSelected || (selectedIndex < 0 && index === 0) ? 0 : -1) : undefined}
              aria-selected={onSelect ? isSelected : undefined}
              aria-level={keyboardNavigation ? depth + 1 : undefined}
              aria-expanded={keyboardNavigation && hasChildren ? isExpanded : undefined}
              style={{
                cursor: onSelect ? 'pointer' : undefined,
                height: rowHeight,
                opacity: dimmed ? 0.55 : undefined,
              }}
            >
              <td className="st">
                <div
                  className={cn('ti', depth > 0 && depth <= 3 && `l${depth}`)}
                  style={depth > 3 ? { paddingInlineStart: depth * INDENT_STEP } : undefined}
                >
                  <span className="tw">
                    {hasChildren && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={isExpanded ? 'جمع کردن' : 'گسترش'}
                        aria-expanded={isExpanded}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleExpand(node.id);
                        }}
                        style={{ display: 'inline-flex', color: 'inherit' }}
                      >
                        <Icon name={isExpanded ? 'chevron-down' : 'chevron-left'} size={13} />
                      </button>
                    )}
                  </span>

                  {leaf ? (
                    <>
                      <span className="ic-l">
                        <Icon name="file-text" size={15} />
                      </span>
                      <span className={cn('trunc', isSelected ? 'tx9 fw5' : 'tx8')} style={{ fontSize: 13 }}>
                        {titleColumn.title(node)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="ic-f">
                        <Icon name={isExpanded ? 'folder-open' : 'folder'} size={15} />
                      </span>
                      <span className="par trunc">{titleColumn.title(node)}</span>
                    </>
                  )}

                  {titleColumn.badges?.(node)}
                </div>
              </td>

              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(column.align && ALIGN_CLASS[column.align])}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.render(node, index)}
                </td>
              ))}
            </tr>
          );
        })}

        {bottomPad > 0 && (
          <tr aria-hidden="true" style={{ height: bottomPad }}>
            <td colSpan={colSpan} style={{ padding: 0, border: 0 }} />
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** پنجرهٔ ردیف‌های دیده‌شده از روی موقعیت اسکرول ظرف. */
function useVirtualRange(
  virtualization: TreeVirtualization | undefined,
  count: number,
): { start: number; end: number } {
  const [viewport, setViewport] = useState({ top: 0, height: 800 });

  useLayoutEffect(() => {
    const container = virtualization?.scrollRef.current;
    if (!container) return undefined;

    let frame = 0;
    const read = () => {
      frame = 0;
      setViewport((previous) =>
        previous.top === container.scrollTop && previous.height === container.clientHeight
          ? previous
          : { top: container.scrollTop, height: container.clientHeight },
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    container.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    observer?.observe(container);
    return () => {
      container.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [virtualization]);

  if (!virtualization) return { start: 0, end: count };
  const overscan = virtualization.overscan ?? 12;
  const start = Math.max(0, Math.floor(viewport.top / virtualization.rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((viewport.top + viewport.height) / virtualization.rowHeight) + overscan);
  return { start, end };
}
