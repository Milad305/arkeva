import { useMemo, useState } from 'react';
import { Plus, Upload, FileDown } from 'lucide-react';

import { AppButton, EmptyState, Skeleton } from '@/shared/components/ui';
import { Guard } from '@/shared/components/rbac/Guard';
import { Breadcrumb } from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { DEFAULT_PAGE_SIZE } from '@/config/constants';
import {
  useGetProjectsQuery,
  useGetProjectKpiQuery,
  useCreateProjectMutation,
} from '../api/projectsApi';
import type {
  ProjectFilters,
  ProjectSortField,
  CreateProjectDto,
} from '../types';
import { KpiStrip } from '../components/KpiStrip';
import { FiltersBar, type ViewMode } from '../components/FiltersBar';
import { ProjectTable } from '../components/ProjectTable';
import { ProjectCard } from '../components/ProjectCard';
import { Pagination } from '../components/Pagination';
import { CreateProjectModal } from '../components/CreateProjectModal';

// مطابق designs/Projects.html — صفحه فهرست پروژه‌ها.

const DEFAULT_FILTERS: ProjectFilters = {
  search: '',
  status: 'all',
  employer: 'all',
  managerId: 'all',
  type: [],
};

export default function ProjectsPage() {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<ProjectSortField>('actualProgress');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // co-located state برای query params
  const queryParams = useMemo(
    () => ({ page, pageSize, sort, sortDir, filters }),
    [page, pageSize, sort, sortDir, filters],
  );

  const { data: result, isLoading } = useGetProjectsQuery(queryParams);
  const { data: kpi, isLoading: kpiLoading } = useGetProjectKpiQuery();
  const [createProject] = useCreateProjectMutation();

  const projects = result?.items ?? [];

  const handleSort = (field: ProjectSortField) => {
    if (field === sort) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setSortDir('desc');
    }
  };

  const handleFiltersChange = (newFilters: ProjectFilters) => {
    setFilters(newFilters);
    setPage(1); // ریست صفحه هنگام فیلتر
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allSelected = projects.length > 0 && projects.every((p) => prev.has(p.id));
      if (allSelected) return new Set();
      return new Set(projects.map((p) => p.id));
    });
  };

  const handleCreate = (dto: CreateProjectDto) => {
    createProject(dto);
  };

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1480px]">
      {/* breadcrumb */}
      <Breadcrumb items={[{ label: 'خانه', to: '/dashboard' }, { label: 'پروژه‌ها' }]} />

      {/* page header */}
      <div className="flex items-end justify-between gap-4 my-2 mb-5 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">پروژه‌ها</h1>
          <p className="text-[13.5px] text-gray-500 mt-1">
            مدیریت و پایش پروژه‌های فعال، متوقف، پیش‌نویس و تمام‌شده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Guard permissions={['project.export']}>
            <AppButton variant="outline" size="md" onClick={() => { /* TODO: export */ }}>
              <FileDown className="w-4 h-4" />
              خروجی Excel
            </AppButton>
          </Guard>
          <Guard permissions={['wbs.import']}>
            <AppButton variant="outline" size="md" onClick={() => { /* TODO: import modal */ }}>
              <Upload className="w-4 h-4" />
              ورود از MSP
            </AppButton>
          </Guard>
          <Guard permissions={['project.create']}>
            <AppButton size="md" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              پروژه جدید
            </AppButton>
          </Guard>
        </div>
      </div>

      {/* KPI strip */}
      {kpiLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white px-4 py-3.5">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          ))}
        </div>
      ) : kpi ? (
        <KpiStrip kpi={kpi} />
      ) : null}

      {/* filters */}
      <FiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* bulk action bar (وقتی انتخاب‌ها فعال‌اند) */}
      {selectedIds.size > 0 && (
        <div className="bg-primary-700 text-white px-4 py-2.5 rounded-lg mb-3 flex items-center justify-between animate-slide-up">
          <span className="text-sm font-medium">
            {selectedIds.size.toLocaleString('fa-IR')} پروژه انتخاب شد
          </span>
          <div className="flex items-center gap-2">
            <button className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md transition-colors">
              خروجی Excel
            </button>
            <button className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md transition-colors">
              آرشیو
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs hover:bg-white/15 px-2 py-1.5 rounded-md transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* content */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-7 h-7 text-gray-400" />}
          title="هیچ پروژه‌ای یافت نشد"
          description="با تغییر فیلترها دوباره تلاش کنید، یا یک پروژه جدید بسازید."
          action={
            <Guard permissions={['project.create']}>
              <AppButton onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4" />
                پروژه جدید
              </AppButton>
            </Guard>
          }
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <ProjectTable
            projects={projects}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            sort={sort}
            sortDir={sortDir}
            onSort={handleSort}
          />
          {result && (
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              totalPages={result.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
        </div>
      ) : (
        <>
          <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5')}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          {result && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-3.5">
              <Pagination
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                totalPages={result.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </div>
          )}
        </>
      )}

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
