import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/config/constants';

// مطابق designs/Projects.html pagination.

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // ساخت لیست صفحات (ساده: ۱، ۲، ...)
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border-t border-gray-200 text-[12.5px] text-gray-600 flex-wrap gap-3">
      <span>
        نمایش <strong className="text-gray-900">{toPersianDigits(start)}-{toPersianDigits(end)}</strong> از{' '}
        <strong className="text-gray-900">{toPersianDigits(total)}</strong> پروژه
      </span>
      <div className="flex items-center gap-3">
        {/* page size select */}
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span>تعداد در هر صفحه:</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 pl-7 pr-2.5 rounded-md border border-gray-300 bg-white text-xs text-gray-700 outline-none cursor-pointer appearance-none hover:border-gray-400"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {toPersianDigits(s)}
                </option>
              ))}
            </select>
            <svg
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* page buttons */}
        <div className="flex items-center gap-0.5">
          <PageButton
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            ariaLabel="ابتدا"
          >
            <ChevronsRight className="w-3 h-3" />
          </PageButton>
          <PageButton
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            ariaLabel="قبلی"
          >
            <ChevronRight className="w-3 h-3" />
          </PageButton>
          {pages.map((p) => (
            <PageButton
              key={p}
              active={p === page}
              onClick={() => onPageChange(p)}
            >
              {toPersianDigits(p)}
            </PageButton>
          ))}
          <PageButton
            disabled={page === totalPages || totalPages === 0}
            onClick={() => onPageChange(page + 1)}
            ariaLabel="بعدی"
          >
            <ChevronLeft className="w-3 h-3" />
          </PageButton>
          <PageButton
            disabled={page === totalPages || totalPages === 0}
            onClick={() => onPageChange(totalPages)}
            ariaLabel="انتها"
          >
            <ChevronsLeft className="w-3 h-3" />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

void DEFAULT_PAGE_SIZE;

function PageButton({
  children,
  active,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'min-h-7 min-w-7 px-2 rounded-md border inline-flex items-center justify-center text-[12.5px] transition-colors',
        active
          ? 'bg-primary-700 text-white border-primary-700'
          : 'text-gray-700 border-transparent hover:bg-white hover:border-gray-200',
        disabled && 'text-gray-300 cursor-not-allowed hover:bg-transparent hover:border-transparent',
      )}
    >
      {children}
    </button>
  );
}
