import { useEffect, useState } from 'react';

import { PROJECT_STATUS } from '@/config/constants';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Card } from '@/shared/components/ui/Card';
import { Chip } from '@/shared/components/ui/Chip';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { jalaliToIso } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { ProjectListView, ProjectSortKey, StatusFilter } from '../hooks/useProjectListView';

export type ProjectsViewMode = 'table' | 'cards';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'همه',
  at_risk: 'در خطر',
  ...PROJECT_STATUS,
};

/** ترتیب تراشه‌های W08؛ «در خطر» شاخص ب24 است، نه وضعیت. */
const CHIP_ORDER: StatusFilter[] = ['all', 'active', 'at_risk', 'paused', 'draft', 'completed'];

const SORT_OPTIONS: Array<SelectOption<ProjectSortKey>> = [
  { value: 'deviation', label: 'بیشترین انحراف', text: 'بیشترین انحراف' },
  { value: 'actual', label: 'کمترین پیشرفت', text: 'کمترین پیشرفت' },
  { value: 'plannedFinish', label: 'نزدیک‌ترین پایان', text: 'نزدیک‌ترین پایان' },
  { value: 'name', label: 'نام پروژه', text: 'نام پروژه' },
];

export interface ProjectFilterBarProps {
  view: ProjectListView;
  mode: ProjectsViewMode;
  onModeChange: (mode: ProjectsViewMode) => void;
}

/**
 * نوار فیلتر پروژه‌ها.
 *
 * W07 و W08 دو چیدمان متفاوت دارند — جدول با فهرست‌های بازشو، کارت با تراشه —
 * ولی هر دو یک وضعیت فیلتر مشترک را می‌خوانند تا جابه‌جایی نما فیلترها را نگه دارد.
 * فیلترهای F02 ۹: وضعیت، مدیر، نوع + جستجو در نام و کد. «کارفرما» از بوم آمده است.
 */
export function ProjectFilterBar({ view, mode, onModeChange }: ProjectFilterBarProps) {
  const { filters, setFilter } = view;

  const statusOptions: Array<SelectOption<StatusFilter>> = (
    ['all', ...Object.keys(PROJECT_STATUS), 'at_risk'] as StatusFilter[]
  ).map((status) => ({
    value: status,
    label: STATUS_FILTER_LABELS[status],
    text: STATUS_FILTER_LABELS[status],
  }));

  const search = (
    <TextInput
      size="sm"
      icon="search"
      type="search"
      placeholder="جستجوی نام یا کد پروژه…"
      aria-label="جستجوی پروژه"
      value={filters.q}
      onChange={(event) => setFilter('q', event.target.value)}
      style={{ width: mode === 'cards' ? 260 : 240, maxWidth: '100%' }}
    />
  );

  const viewToggle = (
    <SegmentedControl
      className="ms-auto"
      activeKey={mode}
      onChange={(key) => onModeChange(key as ProjectsViewMode)}
      items={[
        { key: 'table', label: 'جدول', icon: 'list' },
        { key: 'cards', label: 'کارت', icon: 'layout-grid' },
      ]}
    />
  );

  if (mode === 'cards') {
    return (
      <Card overflowVisible className="row wrap g8" style={{ padding: '10px 12px', marginBottom: 16 }}>
        {search}
        {CHIP_ORDER.map((status) => (
          <Chip
            key={status}
            selected={filters.status === status}
            onClick={() => setFilter('status', status)}
          >
            {`${STATUS_FILTER_LABELS[status]} (${toFaDigits(view.statusCounts[status] ?? 0)})`}
          </Chip>
        ))}
        <Select
          size="sm"
          width={200}
          prefix="مرتب‌سازی"
          label="مرتب‌سازی"
          value={view.sort.by}
          // همهٔ گزینه‌ها صعودی‌اند: بیشترین انحراف = منفی‌ترین اول
          onChange={(by) => view.setSort({ by, dir: 'asc' })}
          options={SORT_OPTIONS}
        />
        {viewToggle}
      </Card>
    );
  }

  return (
    <Card overflowVisible className="row wrap g8" style={{ padding: '10px 12px', marginBottom: 14 }}>
      {search}
      <Select
        size="sm"
        width={140}
        prefix="وضعیت"
        label="وضعیت"
        value={filters.status}
        onChange={(status) => setFilter('status', status)}
        options={statusOptions}
      />
      <Select
        size="sm"
        width={170}
        prefix="کارفرما"
        label="کارفرما"
        value={filters.clientName ?? ''}
        onChange={(value) => setFilter('clientName', value || null)}
        options={[
          { value: '', label: 'همه', text: 'همه' },
          ...view.clientOptions.map((name) => ({ value: name, label: name, text: name })),
        ]}
      />
      <Select
        size="sm"
        width={170}
        prefix="مدیر پروژه"
        label="مدیر پروژه"
        value={filters.managerId ?? ''}
        onChange={(value) => setFilter('managerId', value || null)}
        options={[
          { value: '', label: 'همه', text: 'همه' },
          ...view.managerOptions.map((manager) => ({
            value: manager.id,
            label: manager.name,
            text: manager.name,
          })),
        ]}
      />
      <Select
        size="sm"
        width={140}
        prefix="نوع"
        label="نوع پروژه"
        value={filters.typeId ?? ''}
        onChange={(value) => setFilter('typeId', value || null)}
        options={[
          { value: '', label: 'همه', text: 'همه' },
          ...view.typeOptions.map((type) => ({ value: type.id, label: type.name, text: type.name })),
        ]}
      />
      <FinishRange view={view} />
      {view.hasActiveFilters && (
        <AppButton variant="ghost" size="sm" icon="x" className="tx-pri" onClick={view.clearFilters}>
          پاک کردن فیلترها
        </AppButton>
      )}
      {viewToggle}
    </Card>
  );
}

/**
 * بازهٔ «پایان برنامه‌ای» (F02 ۹، تصمیم 1405/08/22) — ورودی شمسی، ذخیرهٔ میلادی.
 * تاریخ ناقص یا نامعتبر فیلتر را اعمال نمی‌کند و فیلد قرمز می‌شود.
 */
function FinishRange({ view }: { view: ProjectListView }) {
  const { filters, setFilter } = view;
  const [raw, setRaw] = useState({ finishFrom: '', finishTo: '' });

  // «پاک کردن فیلترها» باید متن ورودی‌ها را هم پاک کند
  useEffect(() => {
    if (filters.finishFrom === null && filters.finishTo === null) {
      setRaw((current) => (current.finishFrom === '' && current.finishTo === '' ? current : { finishFrom: '', finishTo: '' }));
    }
  }, [filters.finishFrom, filters.finishTo]);

  const field = (key: 'finishFrom' | 'finishTo', label: string, placeholder: string) => {
    const value = raw[key];
    const parsed = value.trim() === '' ? null : jalaliToIso(value);
    return (
      <TextInput
        size="sm"
        ltr
        icon={key === 'finishFrom' ? 'calendar' : undefined}
        style={{ width: 118 }}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        invalid={value.trim() !== '' && !parsed}
        onChange={(event) => {
          const next = event.target.value;
          setRaw((current) => ({ ...current, [key]: next }));
          if (next.trim() === '') setFilter(key, null);
          else {
            const iso = jalaliToIso(next);
            if (iso) setFilter(key, iso);
          }
        }}
      />
    );
  };

  return (
    <span className="row g6" title="فیلتر روی پایان برنامه‌ای">
      <span className="t-xs tx5 nowrap">پایان از</span>
      {field('finishFrom', 'پایان برنامه‌ای از', '۱۴۰۴/۰۱/۰۱')}
      <span className="t-xs tx5">تا</span>
      {field('finishTo', 'پایان برنامه‌ای تا', '۱۴۰۵/۱۲/۲۹')}
    </span>
  );
}
