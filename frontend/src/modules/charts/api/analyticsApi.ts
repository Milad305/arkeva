import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { PersonRef } from '@/modules/projects/types';
import type {
  ChartQuery,
  CostChartsDto,
  ProgressChartsDto,
  ResourceChartsDto,
  RiskChartsDto,
} from '../types/analytics';

// F17 — W21 تا W24 (charts.md ۹). همه فقط خواندن با `charts.view`؛ W22 با `charts.view_cost`
// (= `cbs.view_amounts`). دو اقدام گلوگاه W23 به F09 می‌روند (تصمیم 1405/08/15).

const chartTag = (projectId: EntityId) => [
  { type: 'Chart' as const, id: projectId },
  'FieldReport' as const,
  'WbsItem' as const,
];

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProgressCharts: build.query<ProgressChartsDto, ChartQuery>({
      queryFn: serverQuery(({ projectId, preset }) => ({
        url: ENDPOINTS.CHARTS_PROGRESS(projectId),
        params: { range: preset },
      })),
      providesTags: (_result, _error, { projectId }) => chartTag(projectId),
    }),
    getCostCharts: build.query<CostChartsDto, ChartQuery>({
      queryFn: serverQuery(({ projectId, preset }) => ({
        url: ENDPOINTS.CHARTS_COST(projectId),
        params: { range: preset },
      })),
      providesTags: (_result, _error, { projectId }) => [...chartTag(projectId), 'CbsItem'],
    }),
    getResourceCharts: build.query<ResourceChartsDto, ChartQuery>({
      queryFn: serverQuery(({ projectId, preset }) => ({
        url: ENDPOINTS.CHARTS_RESOURCES(projectId),
        params: { range: preset },
      })),
      providesTags: (_result, _error, { projectId }) => [
        ...chartTag(projectId),
        'ProjectMember',
        'Assignment',
      ],
    }),
    getRiskCharts: build.query<RiskChartsDto, ChartQuery>({
      queryFn: serverQuery(({ projectId }) => ENDPOINTS.CHARTS_RISK(projectId)),
      providesTags: (_result, _error, { projectId }) => [...chartTag(projectId), 'Risk'],
    }),
    remindApprover: build.mutation<{ count: number }, { projectId: EntityId; userId: EntityId }>({
      queryFn: serverQuery(({ projectId, userId }) => ({
        url: ENDPOINTS.APPROVER_REMIND(projectId, userId),
        method: 'POST',
      })),
      invalidatesTags: ['Notification'],
    }),
    reassignApprover: build.mutation<
      { count: number },
      { projectId: EntityId; userId: EntityId; substitute: PersonRef }
    >({
      queryFn: serverQuery(({ projectId, userId, substitute }) => ({
        url: ENDPOINTS.APPROVER_REASSIGN(projectId, userId),
        method: 'POST',
        body: { substituteUserId: substitute.id },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...chartTag(projectId), 'FieldReportItem', 'Notification'],
    }),
  }),
});

export const {
  useGetProgressChartsQuery,
  useGetCostChartsQuery,
  useGetResourceChartsQuery,
  useGetRiskChartsQuery,
  useRemindApproverMutation,
  useReassignApproverMutation,
} = analyticsApi;

registerApiBehavior({
  getProgressCharts: { showErrorToast: false },
  getCostCharts: { showErrorToast: false },
  getResourceCharts: { showErrorToast: false },
  getRiskCharts: { showErrorToast: false },
  remindApprover: { showSuccessToast: true, successMessage: 'یادآوری برای تأییدکننده فرستاده شد.' },
  reassignApprover: {
    showSuccessToast: true,
    successMessage: 'آیتم‌های در انتظار به جایگزین واگذار شد.',
  },
});
