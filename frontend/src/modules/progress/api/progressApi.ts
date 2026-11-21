import { baseApi } from '@/app/api/baseApi';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { ExplainParams, MetricExplanationDto } from '../types';

// F10 — خواندنی‌های ماژول محاسبات که صفحه‌های دیگر لازم دارند.

export const progressApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** `GET /projects/:pid/progress/explain?metric=&itemId=&date=` (G9). */
    explainMetric: build.query<MetricExplanationDto, ExplainParams>({
      queryFn: serverQuery(({ projectId, metric, itemId, date }) => ({
        url: ENDPOINTS.PROJECT_PROGRESS_EXPLAIN(projectId),
        params: { metric, itemId, date },
      })),
      providesTags: (_result, _error, { projectId }) => [{ type: 'Chart', id: projectId }],
    }),
  }),
});

export const { useExplainMetricQuery } = progressApi;
