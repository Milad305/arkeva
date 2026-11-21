import { baseApi } from '@/app/api/baseApi';
import { serverQuery } from '@/app/api/serverQuery';
import { registerApiBehavior } from '@/app/api/behavior';
import { LIST_ID } from '@/app/api/tagTypes';
import { ENDPOINTS } from '@/config/endpoints';
import type { ProjectStatus } from '@/config/constants';
import type { EntityId } from '@/shared/types/api';
import type {
  ActivationCheckDto,
  PortfolioSummaryDto,
  ProjectDetailDto,
  ProjectListItemDto,
  ProjectListParams,
} from '../types';

// endpointهای پرتفوی — مسیرها از `design/features/project-setup.md` بخش ۱۲
// و شاخص‌های پرتفوی از `design/features/charts.md` (`GET /dashboard`، ب24).
// چرخهٔ عمر دقیقاً نمودار حالت F02 بخش ۸ است.

interface TransitionResult {
  id: EntityId;
  status: ProjectStatus;
}

const invalidateProject = (_result: unknown, _error: unknown, arg: EntityId | { id: EntityId }) => {
  const id = typeof arg === 'object' ? arg.id : arg;
  return [
    { type: 'Project' as const, id },
    { type: 'Project' as const, id: LIST_ID },
    { type: 'Dashboard' as const, id: 'portfolio' },
    { type: 'Chart' as const, id },
  ];
};

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectListItemDto[], ProjectListParams | void>({
      queryFn: serverQuery((params) => ({ url: ENDPOINTS.PROJECTS, params: params ?? undefined })),
      providesTags: (result) => [
        { type: 'Project', id: LIST_ID },
        ...(result ?? []).map((project) => ({ type: 'Project' as const, id: project.id })),
      ],
    }),

    getPortfolioSummary: build.query<PortfolioSummaryDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.PROJECTS_SUMMARY),
      providesTags: [{ type: 'Dashboard', id: 'portfolio' }],
    }),

    getProject: build.query<ProjectDetailDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.PROJECT_DETAILS(id)),
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    getActivationCheck: build.query<ActivationCheckDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.PROJECT_ACTIVATION_CHECK(id)),
      // برچسب جدا: فعال‌سازی نباید این query را دوباره بخواند (پروژهٔ فعال پیش‌شرط ندارد)
      providesTags: (_result, _error, id) => [{ type: 'Project', id: `${id}:activation` }],
    }),

    /** فعال‌سازی = اعمال برنامهٔ مبنا (F02 ۸.۱)؛ از آن لحظه اپ گزارش می‌پذیرد. */
    activateProject: build.mutation<TransitionResult, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.PROJECT_ACTIVATE(id), method: 'POST' })),
      invalidatesTags: invalidateProject,
    }),

    pauseProject: build.mutation<TransitionResult, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.PROJECT_PAUSE(id), method: 'POST' })),
      invalidatesTags: invalidateProject,
    }),

    resumeProject: build.mutation<TransitionResult, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.PROJECT_RESUME(id), method: 'POST' })),
      invalidatesTags: invalidateProject,
    }),

    completeProject: build.mutation<TransitionResult, { id: EntityId; reason: string }>({
      queryFn: serverQuery(({ id, reason }) => ({
        url: ENDPOINTS.PROJECT_COMPLETE(id),
        method: 'POST',
        body: { reason },
      })),
      invalidatesTags: invalidateProject,
    }),

    archiveProject: build.mutation<TransitionResult, { id: EntityId; reason: string }>({
      queryFn: serverQuery(({ id, reason }) => ({
        url: ENDPOINTS.PROJECT_ARCHIVE(id),
        method: 'POST',
        body: { reason },
      })),
      invalidatesTags: invalidateProject,
    }),

    restoreProject: build.mutation<TransitionResult, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.PROJECT_RESTORE(id), method: 'POST' })),
      invalidatesTags: invalidateProject,
    }),

    deleteProject: build.mutation<
      { id: EntityId; purgeAfterDays: number },
      { id: EntityId; confirmName: string }
    >({
      queryFn: serverQuery(({ id, confirmName }) => ({
        url: ENDPOINTS.PROJECT_DELETE(id),
        method: 'POST',
        body: { confirmName },
      })),
      invalidatesTags: invalidateProject,
    }),
  }),
});

registerApiBehavior({
  // پنل فعال‌سازی خطای خودش را درون کارت نشان می‌دهد
  getActivationCheck: { showErrorToast: false },
  activateProject: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ثبت برنامهٔ مبنا…',
    showSuccessToast: true,
    successMessage: 'پروژه فعال شد و برنامهٔ مبنا ثبت شد. از این لحظه اپ گزارش می‌پذیرد.',
  },
  pauseProject: {
    showGlobalLoading: true,
    showSuccessToast: true,
    successMessage: 'پروژه متوقف شد. تا ادامهٔ پروژه، اپ گزارش نمی‌پذیرد.',
  },
  resumeProject: {
    showGlobalLoading: true,
    showSuccessToast: true,
    successMessage: 'پروژه دوباره فعال شد. تاریخ‌ها را در صورت نیاز بازنگری کنید.',
  },
  completeProject: {
    showGlobalLoading: true,
    showSuccessToast: true,
    successMessage: 'پروژه تمام‌شده اعلام شد و فقط‌خواندنی است.',
  },
  archiveProject: {
    showGlobalLoading: true,
    showSuccessToast: true,
    successMessage: 'پروژه بایگانی شد. مدیر سازمان می‌تواند آن را بازگرداند.',
  },
  restoreProject: {
    showGlobalLoading: true,
    showSuccessToast: true,
    successMessage: 'پروژه از بایگانی بازگردانده شد.',
  },
  deleteProject: {
    showGlobalLoading: true,
  },
});

export const {
  useGetProjectQuery,
  useGetActivationCheckQuery,
  useActivateProjectMutation,
  useGetProjectsQuery,
  useGetPortfolioSummaryQuery,
  usePauseProjectMutation,
  useResumeProjectMutation,
  useCompleteProjectMutation,
  useArchiveProjectMutation,
  useRestoreProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;
