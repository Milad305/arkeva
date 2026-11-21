import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { PAGE_SIZE_OPTIONS } from '@/config/constants';
import { Icon } from './Icon';
import { Select } from './Select';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** واحد شمارش در متن «نمایش ۱ تا ۸ از ۱۲ …» */
  unit?: string;
  className?: string;
}

/** حداکثر هفت کلید صفحه با «…» — تا نوار در عرض کم نشکند. */
function pageWindow(current: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < totalPages) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1]! > 1) result.push('gap');
    result.push(value);
  });

  return result;
}

/** صفحه‌بندی — `.card-f` به‌علاوهٔ `.ibtn.sm` از kit.css. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  unit = 'مورد',
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('card-f', className)}>
      <span className="t-13 tx6">
        {'نمایش '}
        <strong className="tx9">{`${toFaDigits(from)} تا ${toFaDigits(to)}`}</strong>
        {' از '}
        <strong className="tx9">{toFaDigits(total)}</strong>
        {` ${unit}`}
      </span>

      <div className="row g12 wrap">
        {onPageSizeChange && (
          <span className="row g6 t-12 tx6">
            تعداد در هر صفحه
            <Select
              size="sm"
              width={72}
              label="تعداد در هر صفحه"
              value={pageSize}
              onChange={onPageSizeChange}
              options={PAGE_SIZE_OPTIONS.map((size) => ({
                value: size,
                label: toFaDigits(size),
                text: toFaDigits(size),
              }))}
            />
          </span>
        )}

        <nav className="row g2" aria-label="صفحه‌بندی">
          <button
            type="button"
            className="ibtn sm"
            disabled={page <= 1}
            aria-label="صفحهٔ قبل"
            onClick={() => onPageChange(page - 1)}
            style={page <= 1 ? { color: 'var(--gray-300)' } : undefined}
          >
            <Icon name="chevron-right" size={14} />
          </button>

          {pageWindow(page, totalPages).map((entry, index) =>
            entry === 'gap' ? (
              <span key={`gap-${index}`} className="tx5 t-12" style={{ padding: '0 2px' }}>
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={cn('ibtn sm', entry === page && 'solid-pri')}
                aria-current={entry === page ? 'page' : undefined}
                aria-label={`صفحهٔ ${toFaDigits(entry)}`}
                onClick={() => onPageChange(entry)}
                style={{ fontSize: 12, fontWeight: entry === page ? 600 : 400 }}
              >
                {toFaDigits(entry)}
              </button>
            ),
          )}

          <button
            type="button"
            className="ibtn sm"
            disabled={page >= totalPages}
            aria-label="صفحهٔ بعد"
            onClick={() => onPageChange(page + 1)}
            style={page >= totalPages ? { color: 'var(--gray-300)' } : undefined}
          >
            <Icon name="chevron-left" size={14} />
          </button>
        </nav>
      </div>
    </div>
  );
}
