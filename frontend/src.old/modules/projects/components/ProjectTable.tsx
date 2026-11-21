import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowDown, Check, TrendingUp, AlertTriangle } from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import type { ProjectDto, ProjectSortField } from '../types';
import { PROJECT_TYPE_ICONS } from '../types';
import {
  PROJECT_STATUS_STYLE,
  getDeviationBadge,
  getProgressColor,
  AVATAR_COLORS,
} from '../services/projectHelpers';
import { ProjectRowMenu } from './ProjectRowMenu';

// مطابق designs/Projects.html table view.
// تمام استایل‌ها (ارتفاع، padding، رنگ‌ها) دقیقاً از HTML استخراج شده.

interface ProjectTableProps {
  projects: ProjectDto[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  sort: ProjectSortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: ProjectSortField) => void;
}

export function ProjectTable({
  projects,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sort,
  sortDir,
  onSort,
}: ProjectTableProps) {
  const navigate = useNavigate();
  const allSelected = projects.length > 0 && projects.every((p) => selectedIds.has(p.id));
  const someSelected = projects.some((p) => selectedIds.has(p.id));

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* نوار ابزار بالای جدول */}
      <div className="px-3.5 py-2.5 flex items-center gap-2.5 border-b border-gray-200 bg-white">
        <span className="text-[12.5px] text-gray-600">
          {toPersianDigits(projects.length)} پروژه نمایش داده می‌شود
        </span>
        <span className="text-gray-300">·</span>
        <button className="h-[30px] px-2.5 inline-flex items-center gap-1.5 rounded-md text-[12.5px] text-gray-700 hover:bg-gray-100 transition-colors">
          <ArrowUpDown className="w-3 h-3 shrink-0" />
          <span>ستون‌های نمایش</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-600 inline-flex items-center gap-1.5">
          <span>مرتب‌سازی:{' '}<strong className="font-semibold text-gray-800">{toPersianDigits(projects[0]?.actualProgress ?? 0)}٪ ↓</strong></span>
        </span>
      </div>

      {/* جدول */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] min-w-[1280px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-9 pr-3.5 py-2.5 text-right">
                <HeaderCheckbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={onToggleSelectAll}
                />
              </th>
              <SortHeader
                label="نام پروژه"
                field="name"
                currentSort={sort}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">کارفرما</th>
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">مدیر پروژه</th>
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">پیشرفت برنامه‌ای</th>
              <SortHeader
                label="پیشرفت واقعی"
                field="actualProgress"
                currentSort={sort}
                sortDir={sortDir}
                onSort={onSort}
                bold
              />
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">انحراف</th>
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">بودجه</th>
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">تاریخ پایان</th>
              <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">وضعیت</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                selected={selectedIds.has(p.id)}
                onToggle={() => onToggleSelect(p.id)}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────── ردیف پروژه ──────────

interface ProjectRowProps {
  project: ProjectDto;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}

function ProjectRow({ project, selected, onToggle, onClick }: ProjectRowProps) {
  const statusStyle = PROJECT_STATUS_STYLE[project.status];
  const ac = AVATAR_COLORS[project.manager.avatarColor];
  const pColor = getProgressColor(project.deviation, project.status);
  const devBadge = getDeviationBadge(project.deviation, project.status);
  const TypeIcon = PROJECT_TYPE_ICONS[project.type];

  return (
    <tr
      onClick={onClick}
      className={cn('cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50', selected && 'bg-primary-100/30')}
    >
      {/* checkbox */}
      <td className="pr-3.5 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <RowCheckbox checked={selected} onChange={onToggle} />
      </td>

      {/* نام پروژه */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-[220px]">
          <div
            className="w-9 h-9 rounded-md flex-shrink-0 inline-flex items-center justify-center text-white relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, transparent 0 6px, rgba(255,255,255,0.08) 6px 7px), none`,
              backgroundColor: pColorForType(project),
            }}
          >
            <TypeIcon className="w-4 h-4 relative z-10" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 leading-snug">{project.name}</div>
            <div className="mono text-[11px] text-gray-500 mt-0.5">{project.code}</div>
          </div>
        </div>
      </td>

      {/* کارفرما */}
      <td className="px-3 py-3">
        <div className="text-gray-800">
          {project.employer.length > 24 ? project.employerShort : project.employer}
        </div>
      </td>

      {/* مدیر پروژه */}
      <td className="px-3 py-3">
        <div className="inline-flex items-center gap-2">
          <span
            className="w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-[10.5px] font-semibold flex-shrink-0"
            style={{ background: ac.bg, color: ac.fg }}
          >
            {project.manager.initials}
          </span>
          <span>{project.manager.fullName}</span>
        </div>
      </td>

      {/* پیشرفت برنامه‌ای */}
      <td className="px-3 py-3">
        <div className="min-w-[130px]">
          <div className="text-xs font-semibold text-gray-900 mb-1 flex justify-between items-center">
            <span>{toPersianDigits(project.plannedProgress)}٪</span>
            <span className="text-gray-500 font-normal text-[10.5px]">برنامه‌ای</span>
          </div>
          <ProgressBar value={project.plannedProgress} color="#A1A1AA" />
        </div>
      </td>

      {/* پیشرفت واقعی */}
      <td className="px-3 py-3">
        <div className="min-w-[130px]">
          <div className="text-xs font-semibold text-gray-900 mb-1 flex justify-between items-center">
            <span>{toPersianDigits(project.actualProgress)}٪</span>
            <span className="text-gray-500 font-normal text-[10.5px]">واقعی</span>
          </div>
          <ProgressBar value={project.actualProgress} color={pColor} />
        </div>
      </td>

      {/* انحراف */}
      <td className="px-3 py-3">
        <DeviationBadgeView badge={devBadge} />
      </td>

      {/* بودجه */}
      <td className="px-3 py-3">
        <div className="min-w-[150px]">
          <div className="font-semibold text-gray-900">
            {toPersianDigits(project.budget.toLocaleString('en-US'))} میلیارد ﷼
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <span className="mono text-gray-700 font-medium">
              {toPersianDigits(project.budgetUsedPct)}٪
            </span>
            <span>مصرف‌شده</span>
          </div>
        </div>
      </td>

      {/* تاریخ پایان */}
      <td className="px-3 py-3">
        <span className="mono text-xs text-gray-700">{formatJalaliShort(project.endDate)}</span>
      </td>

      {/* وضعیت */}
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm text-[11.5px] font-medium whitespace-nowrap"
          style={{ background: statusStyle.bg, color: statusStyle.fg }}
        >
          <span
            className="w-[5px] h-[5px] rounded-full"
            style={{ background: statusStyle.dot }}
          />
          {statusStyle.label}
        </span>
      </td>

      {/* اکشن */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <ProjectRowMenu project={project} />
      </td>
    </tr>
  );
}

// helper: رنگ thumbnail از tint type
function pColorForType(p: ProjectDto): string {
  const tints: Record<string, string> = {
    building: '#1A3354',
    commercial: '#1D4ED8',
    industrial: '#3F3F46',
    road: '#2C4A73',
    tunnel: '#3F3F46',
    hospital: '#B45813',
    energy: '#D97706',
    parking: '#15803D',
    heritage: '#52525B',
  };
  return tints[p.type] ?? '#1A3354';
}

// نمایش شمسی کوتاه برای نمایش در جدول (فعلاً ساده)
function formatJalaliShort(iso: string): string {
  // TODO: وقتی dayjs-jalali وصل شد، این را واقعی کن. فعلاً همان ISO را برمی‌گردانیم.
  return iso.replace(/-/g, '/').replace(/^\d{4}/, (y) => String(Number(y) + 1021));
}

// ────────── Sub-components ──────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

function DeviationBadgeView({
  badge,
}: {
  badge: ReturnType<typeof getDeviationBadge>;
}) {
  const Icon =
    badge.severity === 'positive'
      ? TrendingUp
      : badge.severity === 'ok' && badge.label !== '—' && badge.label !== 'به‌موقع'
        ? Check
        : badge.severity === 'warning' || badge.severity === 'critical'
          ? AlertTriangle
          : null;

  return (
    <span
      className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm text-[11.5px] font-medium whitespace-nowrap"
      style={{ background: badge.bg, color: badge.fg }}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{badge.label}</span>
    </span>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'w-4 h-4 rounded border flex items-center justify-center transition-all',
        checked || indeterminate
          ? 'bg-primary-700 border-primary-700'
          : 'border-gray-300 bg-white',
      )}
    >
      {indeterminate && !checked && (
        <span className="w-2 h-0.5 bg-white rounded-full" />
      )}
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
    </button>
  );
}

function RowCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'w-4 h-4 rounded border flex items-center justify-center transition-all',
        checked ? 'bg-primary-700 border-primary-700' : 'border-gray-300 bg-white',
      )}
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
    </button>
  );
}

function SortHeader({
  label,
  field,
  currentSort,
  sortDir,
  onSort,
  bold: _bold,
}: {
  label: string;
  field: ProjectSortField;
  currentSort: ProjectSortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: ProjectSortField) => void;
  bold?: boolean;
}) {
  void _bold;
  const active = currentSort === field;
  return (
    <th className="px-3 py-2.5 text-right whitespace-nowrap">
      <button
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-gray-900 transition-colors text-[11.5px]',
          active ? 'text-gray-900 font-bold' : 'font-semibold text-gray-600',
        )}
      >
        <span>{label}</span>
        {active ? (
          <ArrowDown className={cn('w-3 h-3 shrink-0', sortDir === 'asc' && 'rotate-180')} />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-400 shrink-0" />
        )}
      </button>
    </th>
  );
}
