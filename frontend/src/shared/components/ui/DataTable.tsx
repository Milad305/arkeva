import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { Selection } from '@/shared/hooks/useSelection';
import { Icon } from './Icon';
import { Checkbox } from './SelectionControls';

export type ColumnAlign = 'start' | 'center' | 'end';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** عرض ثابت ستون‌های باریک (چک‌باکس، منوی سه‌نقطه). */
  width?: number;
  /** کف عرض ستون‌های محتوادار — مطابق مقادیر آرت‌بورد. */
  minWidth?: number;
  align?: ColumnAlign;
  sortable?: boolean;
  /** سرستون ستون مرتب‌شده در بوم پررنگ‌تر است. */
  emphasized?: boolean;
}

export interface SortState {
  by: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: Array<Column<T>>;
  /** شناسهٔ UUID ردیف (C01). */
  getRowId: (row: T) => string;

  /**
   * کف عرض جدول — **اجباری**.
   *
   * این تنها چیزی است که جدول‌های پرستون را در مانیتورهای معمولی نگه می‌دارد:
   * جدول درون `.tbl-wrap` با `overflow-x:auto` می‌نشیند و در عرض کم اسکرول
   * افقیِ خودش را می‌گیرد، به‌جای اینکه چیدمان صفحه را بشکند.
   * مقدار را از `min-width` همان آرت‌بورد بردار.
   */
  minWidth: number;

  selection?: Selection<string>;
  /** نوار اقدام دسته‌جمعی که با انتخاب ردیف ظاهر می‌شود (`.solid-pri` در بوم). */
  bulkActions?: (selection: Selection<string>) => ReactNode;

  sort?: SortState;
  onSortChange?: (key: string) => void;

  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** ردیف انتخاب‌شده — کلاس `.sel` در kit.css. */
  isRowSelected?: (row: T) => boolean;

  /** پانویس جدول؛ معمولاً `Pagination`. */
  footer?: ReactNode;
  /** وقتی `rows` خالی است. */
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = { start: '', center: 'c', end: 'l' };

/**
 * جدول داده — `.tbl-wrap` + `.tbl` از kit.css.
 *
 * هیچ صفحه‌ای نباید `<table class="tbl">` خودش را بنویسد؛ انتخاب چندتایی،
 * مرتب‌سازی، نوار دسته‌جمعی و اسکرول افقی همه اینجا یک‌بار حل شده‌اند.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  minWidth,
  selection,
  bulkActions,
  sort,
  onSortChange,
  onRowClick,
  rowClassName,
  isRowSelected,
  footer,
  empty,
  caption,
  className,
}: DataTableProps<T>) {
  const showBulkBar = selection && selection.count > 0 && bulkActions;

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={className}>
      {showBulkBar && (
        <div className="row g10 solid-pri wrap" style={{ padding: '8px 14px' }}>
          {bulkActions(selection)}
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl" style={{ minWidth }}>
          {caption && <caption className="sr-input">{caption}</caption>}
          <thead>
            <tr>
              {selection && (
                <th style={{ width: 36 }}>
                  <Checkbox
                    checked={selection.state === 'all'}
                    indeterminate={selection.state === 'some'}
                    onChange={selection.toggleAll}
                    aria-label="انتخاب همهٔ ردیف‌ها"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(column.align && ALIGN_CLASS[column.align])}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    color: column.emphasized ? 'var(--gray-900)' : undefined,
                  }}
                  aria-sort={
                    sort?.by === column.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="row g4"
                      onClick={() => onSortChange(column.key)}
                      style={{ font: 'inherit', color: 'inherit' }}
                    >
                      {column.header}
                      <Icon
                        name={
                          sort?.by !== column.key
                            ? 'arrow-up-down'
                            : sort.dir === 'asc'
                              ? 'arrow-up'
                              : 'arrow-down'
                        }
                        size={11}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const id = getRowId(row);

              return (
                <tr
                  key={id}
                  className={cn(isRowSelected?.(row) && 'sel', rowClassName?.(row))}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {selection && (
                    <td onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selection.isSelected(id)}
                        onChange={() => selection.toggle(id)}
                        aria-label="انتخاب ردیف"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(column.align && ALIGN_CLASS[column.align])}
                      style={{ minWidth: column.minWidth }}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
