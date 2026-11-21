import { baseApi } from '@/app/api/baseApi';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { ActivityEventDto, ProjectOverviewDto } from '../types';

// F17 — فقط خواندن (`features/charts.md` ۹). کش بر پایهٔ `computedAt`:
// هر رویدادی که اعداد را عوض کند برچسب `Chart` همان پروژه را باطل می‌کند.

export const chartsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectOverview: build.query<ProjectOverviewDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.PROJECT_OVERVIEW(id)),
      providesTags: (_result, _error, id) => [{ type: 'Chart', id }],
    }),

    getProjectActivity: build.query<ActivityEventDto[], { projectId: EntityId; limit?: number }>({
      queryFn: serverQuery(({ projectId, limit }) => ({
        url: ENDPOINTS.PROJECT_ACTIVITY(projectId),
        params: { limit: limit ?? 10 },
      })),
      providesTags: (_result, _error, { projectId }) => [{ type: 'ActivityLog', id: projectId }],
    }),
  }),
});

export const { useGetProjectOverviewQuery, useGetProjectActivityQuery } = chartsApi;
