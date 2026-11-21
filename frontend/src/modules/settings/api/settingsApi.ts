import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { baseApi as rootApi } from '@/app/api/baseApi';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  AreaDto,
  AreasDto,
  BackupsDto,
  CalendarDto,
  ChannelKey,
  FieldRulesDto,
  FileLinkDto,
  GeneralSettingsDto,
  GeneralSettingsInput,
  ProgressSettingsDto,
  ProgressSettingsInput,
  ProjectSettingsDto,
  WorkflowSettingsDto,
  WorkflowSettingsInput,
} from '../types';

// تنظیمات پروژه W28–W30. کد دسترسی هر endpoint:
//   getProjectSettings                          project.view (مبالغ با cbs.view_amounts)
//   saveGeneral/Calendar/Progress/FieldRules/Workflow، پشتیبان   project.settings.edit
//   getBackups                                  project.view
//   requestFullExport, downloadFullExport       export.full
//   exportXer                                   integrations.export_p6
//   (مرجع PV درون saveProgress: plan.set_pv_reference)
//   getAreas, saveAreas                         approval_routes.manage
//   closePeriod                                 period.close
//   setNotificationChannel                      notifications.configure_project
//   saveAlertRule                               alerts.configure
//   transferManager                             project.transfer_manager

const TAGS = (projectId: EntityId) => [{ type: 'ProjectSettings' as const, id: projectId }];
/** آستانه، تقویم و گردش‌کار عددها را عوض می‌کنند: پروژه، WBS، نمودارها و صف گزارش هم تازه شوند. */
const AFTER = (projectId: EntityId) => [
  ...TAGS(projectId),
  { type: 'Project' as const, id: projectId },
  'WbsItem' as const,
  'Chart' as const,
  'FieldReport' as const,
  'Alert' as const,
];

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectSettings: build.query<
      ProjectSettingsDto,
      { projectId: EntityId; canViewAmounts: boolean }
    >({
      queryFn: serverQuery(({ projectId }) => ENDPOINTS.PROJECT_SETTINGS(projectId)),
      providesTags: (_result, _error, { projectId }) => TAGS(projectId),
    }),
    saveGeneral: build.mutation<
      GeneralSettingsDto,
      { projectId: EntityId; input: GeneralSettingsInput }
    >({
      queryFn: serverQuery(({ projectId, input }) => ({
        url: ENDPOINTS.PROJECT_SETTINGS(projectId),
        method: 'PATCH',
        body: { general: input },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...AFTER(projectId), { type: 'Project', id: 'LIST' }],
    }),
    saveCalendar: build.mutation<
      CalendarDto,
      { projectId: EntityId; input: Omit<CalendarDto, 'missingOfficialYears'> }
    >({
      queryFn: serverQuery(({ projectId, input }) => ({
        url: ENDPOINTS.PROJECT_CALENDAR(projectId),
        method: 'PUT',
        body: input,
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : AFTER(projectId)),
    }),
    addOfficialHolidays: build.mutation<CalendarDto, { projectId: EntityId; year: number }>({
      queryFn: serverQuery(({ projectId, year }) => ({
        url: ENDPOINTS.PROJECT_CALENDAR_OFFICIAL(projectId, year),
        method: 'POST',
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : AFTER(projectId)),
    }),
    saveProgress: build.mutation<
      ProgressSettingsDto,
      { projectId: EntityId; input: ProgressSettingsInput }
    >({
      queryFn: serverQuery(({ projectId, input }) => ({
        url: ENDPOINTS.PROJECT_SETTINGS(projectId),
        method: 'PATCH',
        body: { progress: input },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...AFTER(projectId), 'Dashboard', 'PlanVersion'],
    }),
    saveFieldRules: build.mutation<
      FieldRulesDto,
      { projectId: EntityId; input: Partial<FieldRulesDto> }
    >({
      queryFn: serverQuery(({ projectId, input }) => ({
        url: ENDPOINTS.PROJECT_SETTINGS(projectId),
        method: 'PATCH',
        body: { field: input },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : AFTER(projectId)),
    }),
    saveWorkflow: build.mutation<
      WorkflowSettingsDto,
      { projectId: EntityId; input: WorkflowSettingsInput }
    >({
      queryFn: serverQuery(({ projectId, input }) => ({
        url: ENDPOINTS.PROJECT_SETTINGS(projectId),
        method: 'PATCH',
        body: { workflow: input },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...AFTER(projectId), 'FieldReportItem', 'Dashboard'],
    }),
    getAreas: build.query<AreasDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.APPROVAL_ROUTES(projectId)),
      providesTags: (_result, _error, projectId) => [
        ...TAGS(projectId),
        { type: 'ProjectMember', id: projectId },
      ],
    }),
    saveAreas: build.mutation<
      AreasDto,
      { projectId: EntityId; areas: AreaDto[]; fallbackApproverId: EntityId }
    >({
      queryFn: serverQuery(({ projectId, areas, fallbackApproverId }) => ({
        url: ENDPOINTS.APPROVAL_ROUTES_PUT(projectId),
        method: 'PUT',
        body: { areas, fallbackApproverId },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              ...TAGS(projectId),
              { type: 'ProjectMember', id: projectId },
              'Assignment',
              'FieldReport',
            ],
    }),
    closePeriod: build.mutation<unknown, { projectId: EntityId; periodId: EntityId }>({
      queryFn: serverQuery(({ projectId, periodId }) => ({
        url: ENDPOINTS.PROJECT_PERIOD_CLOSE(projectId, periodId),
        method: 'POST',
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...TAGS(projectId), 'Chart'],
    }),
    setNotificationChannel: build.mutation<
      unknown,
      { projectId: EntityId; code: string; channel: ChannelKey; on: boolean }
    >({
      queryFn: serverQuery(({ projectId, code, channel, on }) => ({
        url: ENDPOINTS.NOTIFICATION_MATRIX(projectId),
        method: 'PUT',
        body: { code, channel, on },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : TAGS(projectId)),
    }),
    saveAlertRule: build.mutation<
      unknown,
      { projectId: EntityId; code: string; enabled: boolean; params: Record<string, number> }
    >({
      queryFn: serverQuery(({ projectId, code, enabled, params }) => ({
        url: ENDPOINTS.ALERT_RULE(projectId, code),
        method: 'PATCH',
        body: { enabled, params },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [...TAGS(projectId), 'Alert'],
    }),
    setBackupSchedule: build.mutation<
      BackupsDto,
      { projectId: EntityId; schedule: BackupsDto['schedule'] }
    >({
      queryFn: serverQuery(({ projectId, schedule }) => ({
        url: ENDPOINTS.PROJECT_BACKUPS(projectId),
        method: 'PATCH',
        body: { schedule },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : TAGS(projectId)),
    }),
    manualBackup: build.mutation<BackupsDto, { projectId: EntityId; note: string }>({
      queryFn: serverQuery(({ projectId, note }) => ({
        url: ENDPOINTS.PROJECT_BACKUPS(projectId),
        method: 'POST',
        body: { note },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : TAGS(projectId)),
    }),
    /** فقط برای پایش خروجی کامل در جریان؛ پایانش تنظیمات را تازه می‌کند. */
    getBackups: build.query<BackupsDto, { projectId: EntityId }>({
      queryFn: serverQuery(({ projectId }) => ENDPOINTS.PROJECT_BACKUPS(projectId)),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        const status = result?.data.fullExport?.status;
        if (result && status !== 'queued' && status !== 'running')
          dispatch(rootApi.util.invalidateTags(TAGS(projectId)));
      },
    }),
    requestFullExport: build.mutation<BackupsDto, { projectId: EntityId }>({
      queryFn: serverQuery(({ projectId }) => ({
        url: ENDPOINTS.PROJECT_FULL_EXPORT(projectId),
        method: 'POST',
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : TAGS(projectId)),
    }),
    downloadFullExport: build.mutation<FileLinkDto, { projectId: EntityId; exportId: EntityId }>({
      queryFn: serverQuery(({ projectId, exportId }) =>
        ENDPOINTS.PROJECT_FULL_EXPORT_DOWNLOAD(projectId, exportId),
      ),
    }),
    exportXer: build.mutation<FileLinkDto, { projectId: EntityId }>({
      queryFn: serverQuery(({ projectId }) => ({
        url: ENDPOINTS.PROJECT_P6_XER(projectId),
        method: 'POST',
      })),
    }),
    transferManager: build.mutation<
      { managerName: string },
      { projectId: EntityId; userId: EntityId; otp: string }
    >({
      queryFn: serverQuery(({ projectId, userId, otp }) => ({
        url: ENDPOINTS.PROJECT_TRANSFER_MANAGER(projectId),
        method: 'POST',
        body: { userId, otp },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              ...AFTER(projectId),
              { type: 'ProjectMember', id: projectId },
              { type: 'Project', id: 'LIST' },
            ],
    }),
  }),
});

export const {
  useGetProjectSettingsQuery,
  useSaveGeneralMutation,
  useSaveCalendarMutation,
  useAddOfficialHolidaysMutation,
  useSaveProgressMutation,
  useSaveFieldRulesMutation,
  useSaveWorkflowMutation,
  useGetAreasQuery,
  useSaveAreasMutation,
  useClosePeriodMutation,
  useSetNotificationChannelMutation,
  useSaveAlertRuleMutation,
  useSetBackupScheduleMutation,
  useManualBackupMutation,
  useGetBackupsQuery,
  useRequestFullExportMutation,
  useDownloadFullExportMutation,
  useExportXerMutation,
  useTransferManagerMutation,
} = settingsApi;

registerApiBehavior({
  getProjectSettings: { showErrorToast: false },
  getAreas: { showErrorToast: false },
  saveGeneral: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'تغییرات ذخیره شد.',
  },
  saveCalendar: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'تقویم ذخیره شد؛ تاریخ‌های پیش‌بینی دوباره محاسبه می‌شوند.',
  },
  addOfficialHolidays: { showSuccessToast: true, successMessage: 'تعطیلات رسمی اضافه شد.' },
  saveProgress: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'تنظیمات پیشرفت ذخیره شد.',
  },
  saveFieldRules: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'قواعد گزارش کارگاه ذخیره شد.',
  },
  saveWorkflow: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'گردش‌کار تأیید ذخیره شد.',
  },
  saveAreas: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'حوزه‌های تأیید ذخیره شد.',
  },
  closePeriod: { showSuccessToast: true, successMessage: 'دوره بسته شد و عکس دوره ثبت شد.' },
  setNotificationChannel: { showErrorToast: true },
  saveAlertRule: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'قاعدهٔ هشدار ذخیره شد.',
  },
  setBackupSchedule: { showSuccessToast: true, successMessage: 'برنامهٔ پشتیبان ذخیره شد.' },
  manualBackup: { showSuccessToast: true, successMessage: 'پشتیبان دستی گرفته شد.' },
  getBackups: { showErrorToast: false },
  requestFullExport: {
    showSuccessToast: true,
    successMessage: 'ساخت خروجی کامل شروع شد؛ آماده که شد دکمهٔ دریافت فعال می‌شود.',
  },
  downloadFullExport: { showErrorToast: true },
  exportXer: { showSuccessToast: true, successMessage: 'فایل XER از نسخهٔ جاری ساخته شد.' },
  transferManager: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'مدیریت پروژه منتقل شد.',
  },
});
