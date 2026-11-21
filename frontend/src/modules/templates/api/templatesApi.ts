import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId, RialAmount } from '@/shared/types/api';
import type {
  ImportTemplateRequest,
  ImportTemplateResultDto,
  PublishTemplateRequest,
  TemplateDetailDto,
  TemplateListDto,
  TemplatePreviewDto,
  TemplateValidationDto,
} from '../types';

// F16 — کتابخانهٔ قالب‌ها (W31). کد دسترسی هر endpoint:
//   getTemplates, getTemplate, getTemplatePreview        templates.view
//   validateTemplate, archiveTemplate,
//   setDefaultTemplate, deleteTemplate, importTemplate   templates.manage
//   publishTemplate                                      templates.publish

/** ساخت پروژه از قالب و پیشنهاد قالب هم به این داده نگاه می‌کنند (F02). */
const TEMPLATES_AFTER = ['Template', 'Project'] as const;

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTemplates: build.query<
      TemplateListDto,
      { projectTypeId: string | null; includeArchived: boolean; search: string }
    >({
      queryFn: serverQuery(({ projectTypeId, includeArchived, search }) => ({
        url: ENDPOINTS.TEMPLATES,
        params: {
          type: projectTypeId ?? undefined,
          status: includeArchived ? 'all' : 'active',
          search: search || undefined,
        },
      })),
      providesTags: ['Template'],
    }),
    getTemplate: build.query<TemplateDetailDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.TEMPLATE_DETAILS(id)),
      providesTags: ['Template'],
    }),
    getTemplatePreview: build.query<
      TemplatePreviewDto,
      { templateId: EntityId; cbsBudgetRial: RialAmount; projectWorkdays: number }
    >({
      queryFn: serverQuery(({ templateId, cbsBudgetRial, projectWorkdays }) => ({
        url: ENDPOINTS.TEMPLATE_PREVIEW(templateId),
        params: { cbsBudget: cbsBudgetRial, workdays: projectWorkdays },
      })),
      providesTags: ['Template'],
    }),
    validateTemplate: build.query<TemplateValidationDto, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.TEMPLATE_VALIDATE(id), method: 'POST' })),
      providesTags: ['Template'],
    }),
    publishTemplate: build.mutation<TemplateDetailDto, PublishTemplateRequest>({
      queryFn: serverQuery(({ templateId, note }) => ({
        url: ENDPOINTS.TEMPLATE_PUBLISH(templateId),
        method: 'POST',
        body: { note },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...TEMPLATES_AFTER]),
    }),
    archiveTemplate: build.mutation<TemplateDetailDto, { templateId: EntityId; archived: boolean }>(
      {
        queryFn: serverQuery(({ templateId, archived }) => ({
          url: ENDPOINTS.TEMPLATE_ARCHIVE(templateId),
          method: archived ? 'POST' : 'DELETE',
        })),
        invalidatesTags: (_result, error) => (error ? [] : [...TEMPLATES_AFTER]),
      },
    ),
    setDefaultTemplate: build.mutation<
      TemplateDetailDto,
      { templateId: EntityId; isDefault: boolean }
    >({
      queryFn: serverQuery(({ templateId, isDefault }) => ({
        url: ENDPOINTS.TEMPLATE_DETAILS(templateId),
        method: 'PATCH',
        body: { isDefaultForType: isDefault },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...TEMPLATES_AFTER]),
    }),
    deleteTemplate: build.mutation<{ id: EntityId }, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.TEMPLATE_DETAILS(id), method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : [...TEMPLATES_AFTER]),
    }),
    importTemplate: build.mutation<ImportTemplateResultDto, ImportTemplateRequest>({
      queryFn: serverQuery((request) => {
        const body = new FormData();
        body.append('name', request.name);
        body.append('projectTypeId', request.projectTypeId);
        body.append('referenceDurationWd', String(request.referenceDurationWd));
        body.append('wbs', request.wbsFile);
        if (request.cbsFile) body.append('cbs', request.cbsFile);
        return {
          url: ENDPOINTS.TEMPLATE_IMPORT,
          method: 'POST',
          body,
          params: { commit: request.commit },
        };
      }),
      invalidatesTags: (_result, error, { commit }) =>
        error || !commit ? [] : [...TEMPLATES_AFTER],
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplatePreviewQuery,
  useValidateTemplateQuery,
  usePublishTemplateMutation,
  useArchiveTemplateMutation,
  useSetDefaultTemplateMutation,
  useDeleteTemplateMutation,
  useImportTemplateMutation,
} = templatesApi;

registerApiBehavior({
  getTemplates: { showErrorToast: false },
  getTemplate: { showErrorToast: false },
  getTemplatePreview: { showErrorToast: false },
  validateTemplate: { showErrorToast: false },
  importTemplate: { showErrorToast: false },
  publishTemplate: { showSuccessToast: true, successMessage: 'نسخهٔ تازهٔ قالب منتشر شد.' },
  setDefaultTemplate: {
    showSuccessToast: true,
    successMessage: 'قالب پیش‌فرض این نوع پروژه به‌روز شد.',
  },
  deleteTemplate: { showSuccessToast: true, successMessage: 'قالب حذف شد.' },
});
