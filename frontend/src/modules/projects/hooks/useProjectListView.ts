import { useMemo, useState } from 'react';

import { DEFAULT_PAGE_SIZE, PROJECT_STATUS, type ProjectStatus } from '@/config/constants';
import type { EntityId, IsoDate } from '@/shared/types/api';
import type { ProjectListItemDto } from '../types';

// فیلتر، مرتب‌سازی و صفحه‌بندی فهرست پروژه‌ها — فقط نمایشی.
//
// هیچ عددی اینجا ساخته نمی‌شود؛ انحراف، CPI و «در خطر» همه از سرور می‌آیند
// (D07، ب24). پرتفوی هر سازمان ده‌ها پروژه است نه هزاران، پس فیلتر سمت کلاینت
// پاسخ فوری می‌دهد؛ `GET /projects?status=&q=` همچنان برای وقتی بک‌اند آمد آماده است.

/** «در خطر» وضعیت نیست؛ فیلتر جداگانه روی شاخص ب24 است. */
export type StatusFilter = 'all' | ProjectStatus | 'at_risk';

export type ProjectSortKey = 'deviation' | 'name' | 'actual' | 'plannedFinish';

export interface ProjectSort {
  by: ProjectSortKey;
  dir: 'asc' | 'desc';
}

export interface ProjectFilters {
  q: string;
  status: StatusFilter;
  clientName: string | null;
  managerId: EntityId | null;
  typeId: EntityId | null;
  /**
   * بازهٔ تاریخ روی **پایان برنامه‌ای** (project-setup.md ۹، تصمیم 1405/08/22):
   * همان ستونی که در جدول دیده می‌شود و مبنای تأخیر است. میلادی ذخیره می‌شود و
   * ورودی کاربر شمسی است.
   */
  finishFrom: IsoDate | null;
  finishTo: IsoDate | null;
}

const EMPTY_FILTERS: ProjectFilters = {
  q: '',
  status: 'all',
  clientName: null,
  managerId: null,
  typeId: null,
  finishFrom: null,
  finishTo: null,
};

/** پیش‌فرض F02 ۹: «مرتب‌سازی با انحراف» — عقب‌مانده‌ترین اول. */
const DEFAULT_SORT: ProjectSort = { by: 'deviation', dir: 'asc' };

function matches(project: ProjectListItemDto, filters: ProjectFilters): boolean {
  const q = filters.q.trim();
  if (q && !project.name.includes(q) && !project.code.toLowerCase().includes(q.toLowerCase())) {
    return false;
  }
  if (filters.status === 'at_risk' && !project.atRisk) return false;
  if (filters.status !== 'all' && filters.status !== 'at_risk' && project.status !== filters.status) {
    return false;
  }
  if (filters.clientName && project.clientName !== filters.clientName) return false;
  if (filters.managerId && project.manager.id !== filters.managerId) return false;
  if (filters.typeId && project.projectTypeId !== filters.typeId) return false;
  if (filters.finishFrom || filters.finishTo) {
    // پروژهٔ بدون پایان برنامه‌ای (پیش‌نویس ناتمام) در بازهٔ تاریخ نمی‌آید
    if (!project.plannedFinish) return false;
    if (filters.finishFrom && project.plannedFinish < filters.finishFrom) return false;
    if (filters.finishTo && project.plannedFinish > filters.finishTo) return false;
  }
  return true;
}

/** پروژهٔ بدون پیشرفت (پیش‌نویس) همیشه آخر می‌آید، در هر جهتی. */
function compare(a: ProjectListItemDto, b: ProjectListItemDto, sort: ProjectSort): number {
  const direction = sort.dir === 'asc' ? 1 : -1;

  switch (sort.by) {
    case 'name':
      return a.name.localeCompare(b.name, 'fa') * direction;
    case 'plannedFinish':
      return ((a.plannedFinish ?? '') < (b.plannedFinish ?? '') ? -1 : 1) * direction;
    case 'actual':
    case 'deviation': {
      const key = sort.by === 'actual' ? 'actualPercent' : 'deviation';
      const av = a.progress?.[key];
      const bv = b.progress?.[key];
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return (av - bv) * direction;
    }
    default:
      return 0;
  }
}

export interface ProjectListView {
  filters: ProjectFilters;
  setFilter: <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  sort: ProjectSort;
  setSort: (sort: ProjectSort) => void;
  /** کلیک روی سرستون: همان ستون جهت را برمی‌گرداند، ستون تازه از صعودی شروع می‌کند. */
  toggleSort: (by: ProjectSortKey) => void;

  /** فهرست فیلترشده و مرتب‌شده، بدون صفحه‌بندی — برای نمای کارتی و خروجی. */
  visible: ProjectListItemDto[];
  /** صفحهٔ جاری — برای نمای جدولی. */
  paged: ProjectListItemDto[];
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  /** شمار هر تراشهٔ وضعیت، روی کل پرتفوی (نه روی فهرست فیلترشده). */
  statusCounts: Record<StatusFilter, number>;
  clientOptions: string[];
  managerOptions: Array<{ id: EntityId; name: string }>;
  typeOptions: Array<{ id: EntityId; name: string }>;
}

/** وضعیت اولیه از نشانی (`?status=active` یا `?status=at_risk`) — پیوندهای W05. */
export function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'at_risk' || value === 'all') return value;
  return value && value in PROJECT_STATUS ? (value as ProjectStatus) : 'all';
}

export function useProjectListView(
  projects: readonly ProjectListItemDto[],
  initialStatus: StatusFilter = 'all',
): ProjectListView {
  const [filters, setFilters] = useState<ProjectFilters>({ ...EMPTY_FILTERS, status: initialStatus });
  const [sort, setSort] = useState<ProjectSort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const visible = useMemo(
    () => projects.filter((project) => matches(project, filters)).sort((a, b) => compare(a, b, sort)),
    [projects, filters, sort],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const statusCounts = useMemo(() => {
    const counts = { all: projects.length, at_risk: 0 } as Record<StatusFilter, number>;
    for (const status of Object.keys(PROJECT_STATUS) as ProjectStatus[]) counts[status] = 0;
    for (const project of projects) {
      counts[project.status] += 1;
      if (project.atRisk) counts.at_risk += 1;
    }
    return counts;
  }, [projects]);

  const clientOptions = useMemo(
    () => [...new Set(projects.map((project) => project.clientName))].sort((a, b) => a.localeCompare(b, 'fa')),
    [projects],
  );

  const managerOptions = useMemo(() => {
    const seen = new Map<EntityId, string>();
    for (const project of projects) seen.set(project.manager.id, project.manager.fullName);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [projects]);

  function setFilter<K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const typeOptions = useMemo(() => {
    const seen = new Map<EntityId, string>();
    for (const project of projects) seen.set(project.projectTypeId, project.projectTypeName);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [projects]);

  return {
    filters,
    setFilter,
    clearFilters: () => {
      setFilters(EMPTY_FILTERS);
      setPage(1);
    },
    hasActiveFilters:
      filters.q.trim() !== '' ||
      filters.status !== 'all' ||
      filters.clientName !== null ||
      filters.managerId !== null ||
      filters.typeId !== null ||
      filters.finishFrom !== null ||
      filters.finishTo !== null,

    sort,
    setSort: (next) => {
      setSort(next);
      setPage(1);
    },
    toggleSort: (by) => {
      setSort((current) =>
        current.by === by ? { by, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { by, dir: 'asc' },
      );
      setPage(1);
    },

    visible,
    paged,
    page: safePage,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },

    statusCounts,
    clientOptions,
    managerOptions,
    typeOptions,
  };
}
