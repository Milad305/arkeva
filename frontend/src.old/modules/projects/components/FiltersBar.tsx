import { Search, X, Calendar, List, LayoutGrid } from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import type { ProjectFilters, ProjectType } from '../types';
import { PROJECT_TYPE_LABELS } from '../services/projectHelpers';
import { MOCK_MANAGERS, MOCK_EMPLOYERS } from '../mocks/projects';

// مطابق designs/Projects.html filter-bar.
// تمام استایل‌ها دقیقاً از HTML استخراج شده (height 34px, radius md, و غیره).

export type ViewMode = 'table' | 'card';

interface FiltersBarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const STATUS_OPTIONS: Array<{ value: ProjectFilters['status']; label: string }> = [
  { value: 'all', label: 'وضعیت: همه' },
  { value: 'active', label: 'فعال' },
  { value: 'critical', label: 'در خطر' },
  { value: 'paused', label: 'متوقف' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'completed', label: 'تمام‌شده' },
];

export function FiltersBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: FiltersBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.employer !== 'all' ||
    filters.managerId !== 'all' ||
    filters.type.length > 0;

  const clearAll = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      employer: 'all',
      managerId: 'all',
      type: [],
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 flex-wrap mb-4">
      {/* جستجو */}
      <div className="relative flex-1 min-w-[200px] max-w-[280px]">
        <Search className="absolute right-[11px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="جستجوی پروژه…"
          className="w-full h-[34px] pr-[34px] pl-3 rounded-md border border-gray-300 bg-white text-[13px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
        />
      </div>

      {/* فیلتر وضعیت */}
      <FilterSelect
        value={filters.status}
        onChange={(v) => onFiltersChange({ ...filters, status: v as ProjectFilters['status'] })}
        options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />

      {/* فیلتر کارفرما */}
      <FilterSelect
        value={filters.employer}
        onChange={(v) => onFiltersChange({ ...filters, employer: v })}
        options={[
          { value: 'all', label: 'کارفرما: همه' },
          ...MOCK_EMPLOYERS.map((e) => ({ value: e, label: e })),
        ]}
      />

      {/* فیلتر مدیر پروژه */}
      <FilterSelect
        value={String(filters.managerId)}
        onChange={(v) =>
          onFiltersChange({
            ...filters,
            managerId: v === 'all' ? 'all' : Number(v),
          })
        }
        options={[
          { value: 'all', label: 'مدیر پروژه: همه' },
          ...MOCK_MANAGERS.map((m) => ({ value: String(m.id), label: m.fullName })),
        ]}
      />

      {/* دکمه بازه تاریخ */}
      <button className="h-[34px] px-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white text-[13px] text-gray-700 hover:border-gray-400 transition-colors">
        <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
        <span className="mono text-xs">۱۴۰۴/۰۱/۰۱</span>
        <span className="text-gray-400">—</span>
        <span className="mono text-xs">۱۴۰۴/۱۲/۲۹</span>
      </button>

      {/* chip نوع (اگر فعال) */}
      {filters.type.length > 0 && (
        <span className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-700 h-7 pr-2.5 pl-1 rounded-sm text-xs font-medium">
          <span>نوع: {filters.type.map((t) => PROJECT_TYPE_LABELS[t]).join('، ')}</span>
          <button
            onClick={() => onFiltersChange({ ...filters, type: [] })}
            className="p-1 rounded-sm text-primary-500 hover:bg-primary-500/10"
            aria-label="حذف فیلتر نوع"
          >
            <X className="w-3 h-3 shrink-0" />
          </button>
        </span>
      )}

      {/* پاک کردن فیلترها */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="h-[30px] px-2.5 inline-flex items-center gap-1.5 rounded-md text-[12.5px] text-primary-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-3 h-3 shrink-0" />
          <span>پاک کردن فیلترها</span>
        </button>
      )}

      <div className="flex-1" />

      {/* view toggle */}
      <div className="inline-flex p-[3px] bg-gray-100 rounded-md border border-gray-200">
        <ViewButton
          active={viewMode === 'table'}
          onClick={() => onViewModeChange('table')}
          icon={<List className="w-3 h-3" />}
          label="جدول"
        />
        <ViewButton
          active={viewMode === 'card'}
          onClick={() => onViewModeChange('card')}
          icon={<LayoutGrid className="w-3 h-3" />}
          label="کارت"
        />
      </div>
    </div>
  );
}

// ────────── Sub-components ──────────

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[34px] pl-8 pr-3 rounded-md border border-gray-300 bg-white text-[13px] text-gray-900 outline-none transition-colors hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 cursor-pointer appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none"
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
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-[26px] px-2.5 rounded-[5px] text-xs font-medium inline-flex items-center gap-1.5 transition-all',
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// re-export برای استفاده در حالت توسعه
export { toPersianDigits };
export type { ProjectType };
