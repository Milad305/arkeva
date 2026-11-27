import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { LIST_ID } from '@/app/api/tagTypes';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  CodeAvailabilityDto,
  CreateProjectResultDto,
  OrgDirectoryUserDto,
  ProjectWizardDraft,
  SchedulePreviewDto,
  WizardOptionsDto,
  WizardSummaryDto,
  WizardTeamCheckDto,
  WizardTemplateDto,
} from '../types/wizard';

// ویزارد ساخت پروژه (F02 ۵، ۱۲) — همه با `project.create`.

export const wizardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWizardOptions: build.query<WizardOptionsDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.PROJECT_DRAFT_OPTIONS),
      providesTags: [{ type: 'Project', id: 'wizard-options' }],
    }),
    getWizardDraft: build.query<ProjectWizardDraft, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.PROJECT_DRAFT(id)),
      providesTags: (_result, _error, id) => [{ type: 'Project', id: `draft:${id}` }],
    }),
    checkProjectCode: build.query<CodeAvailabilityDto, string>({
      queryFn: serverQuery((code) => ({ url: ENDPOINTS.PROJECT_CODE_AVAILABLE, params: { code } })),
    }),
    previewSchedule: build.query<SchedulePreviewDto, ProjectWizardDraft['schedule']>({
      queryFn: serverQuery((schedule) => ({
        url: ENDPOINTS.PROJECT_DRAFT_SCHEDULE_PREVIEW,
        method: 'POST',
        body: schedule,
      })),
    }),
    getWizardTemplates: build.query<WizardTemplateDto[], EntityId | null>({
      queryFn: serverQuery((projectTypeId) => ({
        url: ENDPOINTS.PROJECT_DRAFT_TEMPLATES,
        params: { projectTypeId: projectTypeId ?? undefined },
      })),
      providesTags: [{ type: 'Template', id: LIST_ID }],
    }),
    searchOrgUsers: build.query<OrgDirectoryUserDto[], string>({
      queryFn: serverQuery((search) => ({
        url: ENDPOINTS.ORG_USERS_SEARCH,
        params: { q: search },
      })),
    }),
    checkWizardTeam: build.query<
      WizardTeamCheckDto,
      Pick<ProjectWizardDraft, 'team' | 'structure' | 'basic'>
    >({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.PROJECT_DRAFT_TEAM_CHECK,
        method: 'POST',
        body,
      })),
    }),
    getWizardSummary: build.query<WizardSummaryDto, ProjectWizardDraft>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.PROJECT_DRAFT_SUMMARY,
        method: 'POST',
        body,
      })),
    }),
    saveWizardDraft: build.mutation<ProjectWizardDraft, ProjectWizardDraft>({
      queryFn: serverQuery((draft) =>
        draft.id
          ? { url: ENDPOINTS.PROJECT_DRAFT(draft.id), method: 'PUT', body: draft }
          : { url: ENDPOINTS.PROJECT_DRAFTS, method: 'POST', body: draft },
      ),
      invalidatesTags: (result) => [
        { type: 'Project', id: LIST_ID },
        ...(result ? [{ type: 'Project' as const, id: `draft:${result.id}` }] : []),
      ],
    }),
    deleteWizardDraft: build.mutation<{ id: EntityId }, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.PROJECT_DRAFT(id), method: 'DELETE' })),
      invalidatesTags: [{ type: 'Project', id: LIST_ID }],
    }),
    createProject: build.mutation<CreateProjectResultDto, ProjectWizardDraft>({
      queryFn: serverQuery((draft) => ({
        url: ENDPOINTS.PROJECT_DRAFT_CREATE(draft.id || 'new'),
        method: 'POST',
        body: draft,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error) =>
        error
          ? []
          : [
              { type: 'Project', id: LIST_ID },
              { type: 'Dashboard', id: 'portfolio' },
              { type: 'Dashboard', id: 'org' },
              { type: 'Project', id: 'wizard-options' },
            ],
    }),
  }),
});

export const {
  useGetWizardOptionsQuery,
  useGetWizardDraftQuery,
  useCheckProjectCodeQuery,
  usePreviewScheduleQuery,
  useGetWizardTemplatesQuery,
  useSearchOrgUsersQuery,
  useCheckWizardTeamQuery,
  useGetWizardSummaryQuery,
  useSaveWizardDraftMutation,
  useDeleteWizardDraftMutation,
  useCreateProjectMutation,
} = wizardApi;

registerApiBehavior({
  getWizardOptions: { showErrorToast: false },
  getWizardDraft: { showErrorToast: false },
  checkProjectCode: { showErrorToast: false },
  previewSchedule: { showErrorToast: false },
  getWizardTemplates: { showErrorToast: false },
  searchOrgUsers: { showErrorToast: false },
  checkWizardTeam: { showErrorToast: false },
  getWizardSummary: { showErrorToast: false },
  saveWizardDraft: { showErrorToast: true },
  deleteWizardDraft: { showSuccessToast: true, successMessage: 'پیش‌نویس پاک شد.' },
  createProject: { showErrorToast: false },
});
