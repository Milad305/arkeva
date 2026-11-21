import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  LinkImportPreviewDto,
  LinkImportRequest,
  LinkOpsRequest,
  LinksPreviewDto,
  LinksViewDto,
} from '../types';

// W15 — اتصال WBS ↔ CBS (cbs.md ۱۴). کد دسترسی هر endpoint:
//   getCurrentLinks          cbs.view (مبالغ با cbs.view_amounts، D11)
//   getDraftLinks, preview…  plan.edit_draft
//   saveLinkOps, import…     plan.edit_draft
// درخت نسخهٔ کاری WBS، CBS و اتصال‌ها یک برچسب دارند: هر سه از یک نسخه و یک اعتبارسنجی‌اند.

const draftTreeTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft-tree:${projectId}`,
});
const draftTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft:${projectId}`,
});
const currentTag = (projectId: EntityId) => ({ type: 'Link' as const, id: `current:${projectId}` });

const afterWrite = (projectId: EntityId) => [
  { type: 'Project' as const, id: projectId },
  draftTag(projectId),
  draftTreeTag(projectId),
  currentTag(projectId),
  { type: 'WbsItem' as const, id: `tree:${projectId}` },
  { type: 'CbsItem' as const, id: `tree:${projectId}` },
];

const importBody = ({ file, draftRevision }: LinkImportRequest) => {
  const body = new FormData();
  body.append('file', file);
  body.append('draftRevision', String(draftRevision));
  return body;
};

export const linksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentLinks: build.query<LinksViewDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.LINKS(projectId)),
      providesTags: (_result, _error, projectId) => [currentTag(projectId)],
    }),
    getDraftLinks: build.query<LinksViewDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.LINKS_DRAFT(projectId)),
      providesTags: (_result, _error, projectId) => [draftTreeTag(projectId)],
    }),
    previewLinkOps: build.mutation<LinksPreviewDto, LinkOpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.LINKS_DRAFT_OPS_PREVIEW(projectId),
        method: 'POST',
        body: { draftRevision, ops },
      })),
    }),
    saveLinkOps: build.mutation<LinksViewDto, LinkOpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.LINKS_DRAFT_OPS(projectId),
        method: 'POST',
        body: { draftRevision, ops },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : afterWrite(projectId)),
    }),
    previewLinkImport: build.mutation<LinkImportPreviewDto, LinkImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.LINKS_IMPORT_PREVIEW(request.projectId),
        method: 'POST',
        body: importBody(request),
      })),
    }),
    confirmLinkImport: build.mutation<LinksViewDto, LinkImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.LINKS_IMPORT_CONFIRM(request.projectId),
        method: 'POST',
        body: importBody(request),
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : afterWrite(projectId)),
    }),
  }),
});

export const {
  useGetCurrentLinksQuery,
  useGetDraftLinksQuery,
  usePreviewLinkOpsMutation,
  useSaveLinkOpsMutation,
  usePreviewLinkImportMutation,
  useConfirmLinkImportMutation,
} = linksApi;

registerApiBehavior({
  getCurrentLinks: { showErrorToast: false },
  getDraftLinks: { showErrorToast: false },
  previewLinkOps: { showErrorToast: false },
  previewLinkImport: { showErrorToast: false },
  saveLinkOps: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ذخیرهٔ نسخهٔ کاری…',
    showSuccessToast: true,
    successMessage: 'اتصال‌ها در نسخهٔ کاری ذخیره شد.',
  },
  confirmLinkImport: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ورود اتصال‌ها…',
    showSuccessToast: true,
    successMessage: 'اتصال‌های فایل در نسخهٔ کاری ثبت شد.',
  },
});
