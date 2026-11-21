import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  CustomTemplateInput,
  GeneratedReportDto,
  GenerateReportRequest,
  PreviewQuery,
  ReportOptionsDto,
  ReportPreviewDto,
  ReportRangeOptionDto,
  ReportScheduleDto,
  ReportTemplateDto,
  ReportTemplateListDto,
  ScheduleInput,
  SendReportRequest,
  SendReportResultDto,
} from '../types';

// F18 — گزارش‌های مدیریتی (W25). کد دسترسی هر endpoint:
//   getReportTemplates, getReportOptions, getReportRanges,
//   getReportPreview, getGeneratedReports                 reports.view
//   generateReport                                        reports.generate
//   createCustomTemplate                                  reports.custom_template
//   getSchedules, saveSchedule, toggleSchedule,
//   deleteSchedule, runScheduleNow                        reports.schedule (مالی: reports.schedule_financial)
//   sendReport                                            reports.generate (+ reports.send_external برای نشانی بیرونی)
//   deleteGeneratedReport                                 reports.generate (مدیر پروژه یا سازنده، ۷.۵)

export const managementReportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReportTemplates: build.query<ReportTemplateListDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.REPORT_TEMPLATES),
      providesTags: ['ManagementReport'],
    }),
    getReportOptions: build.query<ReportOptionsDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.REPORT_OPTIONS),
      providesTags: ['ManagementReport', 'Project', 'User'],
    }),
    getReportRanges: build.query<ReportRangeOptionDto[], { projectId: EntityId | null }>({
      queryFn: serverQuery(({ projectId }) => ({
        url: ENDPOINTS.REPORT_RANGES,
        params: { projectId: projectId ?? undefined },
      })),
      providesTags: ['ManagementReport'],
    }),
    getReportPreview: build.query<ReportPreviewDto, PreviewQuery>({
      queryFn: serverQuery((query) => ({
        url: ENDPOINTS.REPORT_PREVIEW(query.projectId ?? 'org'),
        method: 'POST',
        body: {
          templateId: query.templateId,
          rangeId: query.rangeId,
          disabledSections: query.disabledSections,
        },
      })),
      providesTags: ['ManagementReport', 'Chart'],
    }),
    createCustomTemplate: build.mutation<ReportTemplateDto, CustomTemplateInput>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.REPORT_TEMPLATES, method: 'POST', body })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),

    getGeneratedReports: build.query<GeneratedReportDto[], void>({
      queryFn: serverQuery(() => ENDPOINTS.GENERATED_REPORTS),
      providesTags: ['ManagementReport'],
    }),
    generateReport: build.mutation<GeneratedReportDto, GenerateReportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.PROJECT_REPORTS(request.projectId ?? 'org'),
        method: 'POST',
        body: { templateId: request.templateId, rangeId: request.rangeId, format: request.format },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
    deleteGeneratedReport: build.mutation<{ id: EntityId }, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.GENERATED_REPORT(id), method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
    sendReport: build.mutation<
      SendReportResultDto,
      SendReportRequest & { canSendExternal: boolean }
    >({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.REPORT_SEND(request.projectId ?? 'org'),
        method: 'POST',
        body: {
          templateId: request.templateId,
          rangeId: request.rangeId,
          recipients: request.recipients,
        },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport', 'Notification']),
    }),

    getSchedules: build.query<ReportScheduleDto[], void>({
      queryFn: serverQuery(() => ENDPOINTS.REPORT_SCHEDULES),
      providesTags: ['ManagementReport'],
    }),
    saveSchedule: build.mutation<ReportScheduleDto, ScheduleInput & { canSendExternal: boolean }>({
      queryFn: serverQuery((input) =>
        input.id
          ? { url: ENDPOINTS.REPORT_SCHEDULE(input.id), method: 'PATCH', body: input }
          : { url: ENDPOINTS.REPORT_SCHEDULES, method: 'POST', body: input },
      ),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
    toggleSchedule: build.mutation<ReportScheduleDto, { scheduleId: EntityId; enabled: boolean }>({
      queryFn: serverQuery(({ scheduleId, enabled }) => ({
        url: ENDPOINTS.REPORT_SCHEDULE(scheduleId),
        method: 'PATCH',
        body: { enabled },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
    deleteSchedule: build.mutation<{ id: EntityId }, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.REPORT_SCHEDULE(id), method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
    runScheduleNow: build.mutation<GeneratedReportDto, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.REPORT_SCHEDULE_RUN(id), method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : ['ManagementReport']),
    }),
  }),
});

export const {
  useGetReportTemplatesQuery,
  useGetReportOptionsQuery,
  useGetReportRangesQuery,
  useGetReportPreviewQuery,
  useCreateCustomTemplateMutation,
  useGetGeneratedReportsQuery,
  useGenerateReportMutation,
  useDeleteGeneratedReportMutation,
  useSendReportMutation,
  useGetSchedulesQuery,
  useSaveScheduleMutation,
  useToggleScheduleMutation,
  useDeleteScheduleMutation,
  useRunScheduleNowMutation,
} = managementReportsApi;

registerApiBehavior({
  getReportTemplates: { showErrorToast: false },
  getReportOptions: { showErrorToast: false },
  getReportRanges: { showErrorToast: false },
  getReportPreview: { showErrorToast: false },
  getGeneratedReports: { showErrorToast: false },
  getSchedules: { showErrorToast: false },
  createCustomTemplate: {
    showSuccessToast: true,
    successMessage: 'قالب سفارشی ساخته شد و در کتابخانه آمد.',
  },
  deleteGeneratedReport: { showSuccessToast: true, successMessage: 'خروجی حذف شد.' },
  deleteSchedule: { showSuccessToast: true, successMessage: 'زمان‌بندی حذف شد.' },
  runScheduleNow: {
    showSuccessToast: true,
    successMessage: 'گزارش همین حالا ساخته شد و در «خروجی‌های اخیر» است.',
  },
});
