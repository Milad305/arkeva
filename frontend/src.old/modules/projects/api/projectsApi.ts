// RTK Query endpointهای پروژه — ساختار واقعی، فعلاً mock (مطابق frontend-react.md بخش ۱۲.۳).
// وقتی بک‌اند آماده شد، فقط baseQuery به URL واقعی وصل می‌شود، نه بازنویسی.

import { baseApi } from '@/app/api/baseApi';
import { ENDPOINTS } from '@/config/endpoints';
import type {
  ProjectDto,
  ProjectKpi,
  ProjectListResult,
  ProjectQueryParams,
  CreateProjectDto,
  ProjectOverviewKpis,
  CriticalWbsItemDto,
  TopCbsItemDto,
  ActivityFeedItemDto,
  SCurvePointDto,
  ProjectTabCounts,
} from '../types';
import {
  MOCK_PROJECTS,
  MOCK_PROJECT_KPI,
  mockListProjects,
} from '../mocks/projects';
import {
  mockGetOverviewKpis,
  mockGetCriticalWbs,
  mockGetTopCbs,
  mockGetActivityFeed,
  mockGetSCurve,
  mockGetTabCounts,
} from '../mocks/projectDetail';

// helper: اعمال فیلتر و sort روی mock (شبیه‌سازی بک‌اند)
function applyQuery(params: ProjectQueryParams): ProjectListResult {
  let items = [...MOCK_PROJECTS];

  const f = params.filters;
  if (f.search) {
    const q = f.search.toLowerCase();
    items = items.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }
  if (f.status !== 'all') {
    items = items.filter((p) => p.status === f.status);
  }
  if (f.employer !== 'all') {
    items = items.filter((p) => p.employer === f.employer);
  }
  if (f.managerId !== 'all') {
    items = items.filter((p) => p.manager.id === f.managerId);
  }
  if (f.type.length > 0) {
    items = items.filter((p) => f.type.includes(p.type));
  }

  // sort
  const dir = params.sortDir === 'asc' ? 1 : -1;
  items.sort((a, b) => {
    const av = a[params.sort];
    const bv = b[params.sort];
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  const total = items.length;
  const start = (params.page - 1) * params.pageSize;
  const paged = items.slice(start, start + params.pageSize);

  return {
    items: paged,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // لیست پروژه‌ها با فیلتر/صفحه‌بندی
    getProjects: builder.query<ProjectListResult, ProjectQueryParams>({
      query: (params) => ({
        url: ENDPOINTS.PROJECTS,
        method: 'GET',
        params, // در واقعیت بک‌اند این را parse می‌کند
      }),
      // فعلاً mock — وقتی بک‌اند وصل شد، این transformResponse حذف می‌شود
      transformResponse: (_response: unknown, _meta, arg: ProjectQueryParams) => {
        return applyQuery(arg);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Project' as const, id })),
              { type: 'Project', id: 'LIST' },
            ]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    // جزئیات یک پروژه
    getProject: builder.query<ProjectDto, number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_DETAILS(id), method: 'GET' }),
      transformResponse: (_response: unknown, _meta, id: number) => {
        return MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0]!;
      },
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    // KPI strip
    getProjectKpi: builder.query<ProjectKpi, void>({
      query: () => ({ url: `${ENDPOINTS.PROJECTS}/kpi`, method: 'GET' }),
      transformResponse: () => MOCK_PROJECT_KPI,
      providesTags: [{ type: 'Project', id: 'KPI' }],
    }),

    // ─── جزئیات پروژه (Overview tab) ───

    // KPI های aggregated صفحهٔ Overview
    getProjectOverviewKpis: builder.query<ProjectOverviewKpis, number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_OVERVIEW_KPIS(id), method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetOverviewKpis(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `OVERVIEW-${id}` }],
    }),

    // آیتم‌های بحرانی WBS
    getProjectCriticalWbs: builder.query<CriticalWbsItemDto[], number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_CRITICAL_WBS(id), method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetCriticalWbs(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `CRIT-WBS-${id}` }],
    }),

    // CBS با بیشترین مصرف
    getProjectTopCbs: builder.query<TopCbsItemDto[], number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_TOP_CBS(id), method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetTopCbs(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `TOP-CBS-${id}` }],
    }),

    // Activity feed
    getProjectActivityFeed: builder.query<ActivityFeedItemDto[], number>({
      query: (id) => ({ url: `${ENDPOINTS.PROJECTS}/${id}/activity`, method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetActivityFeed(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `FEED-${id}` }],
    }),

    // دادهٔ S-Curve
    getProjectSCurve: builder.query<SCurvePointDto[], number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_S_CURVE(id), method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetSCurve(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `SCURVE-${id}` }],
    }),

    // شمارش تب‌ها (badge روی گزارش‌ها/اعضا)
    getProjectTabCounts: builder.query<ProjectTabCounts, number>({
      query: (id) => ({ url: `${ENDPOINTS.PROJECTS}/${id}/tab-counts`, method: 'GET' }),
      transformResponse: (_r, _m, id) => mockGetTabCounts(id),
      providesTags: (_r, _e, id) => [{ type: 'Project', id: `TABCNT-${id}` }],
    }),

    // ساخت پروژه جدید
    createProject: builder.mutation<ProjectDto, CreateProjectDto>({
      query: (body) => ({ url: ENDPOINTS.PROJECTS, method: 'POST', body }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }, { type: 'Project', id: 'KPI' }],
      extraOptions: {
        showGlobalLoading: true,
        loadingMessage: 'در حال ساخت پروژه...',
        showSuccessToast: true,
        successMessage: 'پروژه با موفقیت ایجاد شد',
      } as never,
    }),

    // آرشیو
    archiveProject: builder.mutation<void, number>({
      query: (id) => ({ url: ENDPOINTS.PROJECT_ARCHIVE(id), method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Project', id },
        { type: 'Project', id: 'LIST' },
        { type: 'Project', id: 'KPI' },
      ],
      extraOptions: {
        showSuccessToast: true,
        successMessage: 'پروژه آرشیو شد',
      } as never,
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useGetProjectKpiQuery,
  useGetProjectOverviewKpisQuery,
  useGetProjectCriticalWbsQuery,
  useGetProjectTopCbsQuery,
  useGetProjectActivityFeedQuery,
  useGetProjectSCurveQuery,
  useGetProjectTabCountsQuery,
  useCreateProjectMutation,
  useArchiveProjectMutation,
} = projectsApi;

// re-export mock helper برای استفاده در جایی که لازم است
export { mockListProjects };
