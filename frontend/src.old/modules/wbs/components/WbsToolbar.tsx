import {
  Search,
  Upload,
  FileDown,
  FileCode,
  FileSpreadsheet,
  Edit3,
  Layers,
  FileText,
  Folder,
  Percent,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import { Guard } from '@/shared/components/rbac/Guard';
import { Switch } from '@/shared/components/ui';
import { MOCK_WBS_OWNERS } from '../mocks/wbsTree';
import type { WbsFilters, WbsStatus, WbsTreeSummary } from '../types';
import { DEFAULT_WBS_FILTERS } from '../types';

// ستون راست: جستجو + فیلترها + toggle ویرایش + مدیریت + خلاصه.
// بازنویسی وفادار بر اساس designs/WBS.html tb-panel.

interface Props {
  filters: WbsFilters;
  onFiltersChange: (f: Partial<WbsFilters>) => void;
  onResetFilters: () => void;
  editMode: boolean;
  onEditModeChange: (on: boolean) => void;
  summary: WbsTreeSummary | undefined;
  onImportClick: () => void;
  onDownloadTemplate: () => void;
  onExportMsp: () => void;
  onExportExcel: () => void;
}

export function WbsToolbar({
  filters,
  onFiltersChange,
  onResetFilters,
  editMode,
  onEditModeChange,
  summary,
  onImportClick,
  onDownloadTemplate,
  onExportMsp,
  onExportExcel,
}: Props) {
  const activeFilterCount = countActiveFilters(filters);

  return (
    <aside className="bg-white border-l border-gray-200 overflow-y-auto p-3.5 flex flex-col gap-3.5 min-h-[calc(100vh-260px)]">
      {/* ─── جستجو ─── */}
      <div className="flex flex-col gap-2">
        <div className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-[0.06em]">جستجو</div>
        <div className="relative">
          <Search className="w-[13px] h-[13px] text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            placeholder="جستجو در درخت WBS…"
            className="h-8 w-full px-2.5 pr-8 border border-gray-200 bg-white rounded-md text-[12.5px] text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(44,74,115,0.10)]"
          />
        </div>
      </div>

      {/* ─── فیلترها ─── */}
      <div className="flex flex-col gap-2">
        <div className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-[0.06em] flex items-center justify-between">
          <span>فیلترها</span>
          {activeFilterCount > 0 && (
            <span className="bg-gray-100 text-gray-600 px-1.5 py-px rounded-sm text-[10px]">
              {toPersianDigits(activeFilterCount)} فعال
            </span>
          )}
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-[11.5px] text-gray-600 font-medium">وضعیت</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value as WbsStatus | 'all' })}
            className="h-8 w-full px-2.5 pl-7 border border-gray-200 bg-white rounded-md text-[12.5px] text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-primary-500 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%2210%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2371717A%22%20stroke-width=%222.4%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><path%20d=%22m6%209%206%206%206-6%22/></svg>')] bg-[position:left_10px_center]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="progress">در حال انجام</option>
            <option value="warn">تأخیردار</option>
            <option value="late">تأخیر بحرانی</option>
            <option value="done">تمام‌شده</option>
            <option value="pending">شروع‌نشده</option>
          </select>
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-[11.5px] text-gray-600 font-medium">سرپرست</label>
          <select
            value={filters.ownerId === 'all' ? 'all' : String(filters.ownerId)}
            onChange={(e) => onFiltersChange({ ownerId: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
            className="h-8 w-full px-2.5 pl-7 border border-gray-200 bg-white rounded-md text-[12.5px] text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-primary-500 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%2210%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2371717A%22%20stroke-width=%222.4%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><path%20d=%22m6%209%206%206%206-6%22/></svg>')] bg-[position:left_10px_center]"
          >
            <option value="all">همه سرپرست‌ها</option>
            {MOCK_WBS_OWNERS.map((o) => (
              <option key={o.id} value={o.id}>{o.fullName}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-[11.5px] text-gray-600 font-medium">نوع</label>
          <select
            value={filters.nodeType}
            onChange={(e) => onFiltersChange({ nodeType: e.target.value as WbsFilters['nodeType'] })}
            className="h-8 w-full px-2.5 pl-7 border border-gray-200 bg-white rounded-md text-[12.5px] text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-primary-500 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%2210%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2371717A%22%20stroke-width=%222.4%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><path%20d=%22m6%209%206%206%206-6%22/></svg>')] bg-[position:left_10px_center]"
          >
            <option value="all">همه آیتم‌ها</option>
            <option value="leaves">فقط برگ‌ها</option>
            <option value="parents">فقط والدها</option>
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11.5px] text-primary-700 hover:underline self-start mt-1 border-0 bg-transparent cursor-pointer p-0"
          >
            پاک کردن فیلترها
          </button>
        )}
      </div>

      {/* ─── toggle حالت ویرایش ─── */}
      <Guard permissions={['wbs.edit', 'wbs.create', 'wbs.delete', 'wbs.reorder']} fallback={null}>
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2.5 rounded-md transition-colors',
            editMode ? 'bg-primary-700 text-white' : 'bg-gray-50 text-gray-700 border border-gray-200',
          )}
        >
          <div className="flex items-center gap-2 text-[12.5px] font-medium">
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>
              حالت ویرایش
              <span className={cn('block text-[10.5px] font-normal', editMode ? 'opacity-80' : 'text-gray-500')}>
                کشیدن، ویرایش وزن، حذف
              </span>
            </span>
          </div>
          <Switch checked={editMode} onChange={onEditModeChange} />
        </div>
      </Guard>

      {/* ─── مدیریت ─── */}
      <div className="flex flex-col gap-2">
        <div className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-[0.06em]">مدیریت</div>

        <Guard permissions={['wbs.import']} fallback={null}>
          <button
            type="button"
            onClick={onImportClick}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white text-gray-800 border border-gray-300 text-[12.5px] font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors justify-start w-full border-solid"
          >
            <Upload className="w-[13px] h-[13px] shrink-0" />
            <span>ورود از MSP (XML / Excel)</span>
          </button>
        </Guard>

        <Guard permissions={['wbs.import']} fallback={null}>
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-transparent text-gray-700 text-[12.5px] font-medium hover:bg-gray-100 transition-colors justify-start w-full border-0"
          >
            <FileDown className="w-[13px] h-[13px] shrink-0" />
            <span>دانلود قالب Excel</span>
          </button>
        </Guard>

        <Guard permissions={['wbs.export']} fallback={null}>
          <button
            type="button"
            onClick={onExportMsp}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-transparent text-gray-700 text-[12.5px] font-medium hover:bg-gray-100 transition-colors justify-start w-full border-0"
          >
            <FileCode className="w-[13px] h-[13px] shrink-0" />
            <span>خروجی به MSP (XML)</span>
          </button>
        </Guard>

        <Guard permissions={['wbs.export']} fallback={null}>
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-transparent text-gray-700 text-[12.5px] font-medium hover:bg-gray-100 transition-colors justify-start w-full border-0"
          >
            <FileSpreadsheet className="w-[13px] h-[13px] shrink-0" />
            <span>خروجی به Excel</span>
          </button>
        </Guard>
      </div>

      {/* ─── خلاصه ساختار ─── */}
      {summary && (
        <div className="flex flex-col gap-2">
          <div className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-[0.06em]">خلاصه ساختار</div>
          <div className="px-3 py-3 border border-gray-200 rounded-md bg-gray-50 flex flex-col gap-2">
            <SummaryRow icon={<Layers className="w-[13px] h-[13px]" />} label="کل آیتم‌ها">
              <strong className="text-sm font-bold text-gray-900">{toPersianDigits(summary.totalNodes)}</strong>
            </SummaryRow>
            <SummaryRow icon={<FileText className="w-[13px] h-[13px]" />} label="آیتم‌های برگ">
              <strong className="text-sm font-bold text-gray-900">{toPersianDigits(summary.leafCount)}</strong>
            </SummaryRow>
            <SummaryRow icon={<Folder className="w-[13px] h-[13px]" />} label="آیتم‌های والد">
              <strong className="text-sm font-bold text-gray-900">{toPersianDigits(summary.parentCount)}</strong>
            </SummaryRow>
            <div className="h-px bg-gray-200 my-0.5" />
            <SummaryRow icon={<Percent className="w-[13px] h-[13px]" />} label="مجموع وزن ریشه">
              <strong className={cn('text-sm font-bold', summary.hasRootWeightOk ? 'text-success-700' : 'text-error-700')}>
                {toPersianDigits(summary.rootWeightSum)}٪ {summary.hasRootWeightOk && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
              </strong>
            </SummaryRow>
            <SummaryRow
              icon={<AlertTriangle className={cn('w-[13px] h-[13px]', summary.unbalancedParents > 0 && 'text-error-500')} />}
              label="وزن‌های نامتعادل"
              alert={summary.unbalancedParents > 0}
            >
              <strong className={cn('text-sm font-bold', summary.unbalancedParents > 0 && 'text-error-700')}>
                {toPersianDigits(summary.unbalancedParents)} مورد
              </strong>
            </SummaryRow>
          </div>
        </div>
      )}
    </aside>
  );
}

function SummaryRow({
  icon,
  label,
  children,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between text-xs text-gray-700', alert && 'text-error-700')}>
      <span className="flex items-center gap-[5px]">
        <span className="text-gray-400">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function countActiveFilters(filters: WbsFilters): number {
  let n = 0;
  if (filters.search !== DEFAULT_WBS_FILTERS.search) n++;
  if (filters.status !== DEFAULT_WBS_FILTERS.status) n++;
  if (filters.ownerId !== DEFAULT_WBS_FILTERS.ownerId) n++;
  if (filters.nodeType !== DEFAULT_WBS_FILTERS.nodeType) n++;
  return n;
}
