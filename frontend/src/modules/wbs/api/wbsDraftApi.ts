import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { DraftTreeDto, OpsRequest, PreviewResultDto, SaveResultDto } from '../types/draft';
import type { WbsImportPreviewDto, WbsImportRequest } from '../types/import';
import { wbsTreeTag } from './wbsApi';

// W12 — نسخهٔ کاری WBS. همه با `plan.edit_draft` (wbs.md ۱۱).
//   getWbsDraft     درخت نسخهٔ کاری با قفل‌ها و اعتبارسنجی
//   previewWbsOps   اجرای فهرست عملیات بدون نوشتن (mutation چون بدنه دارد و کش نمی‌شود)
//   saveWbsOps      ذخیره با قفل خوش‌بینانهٔ `draftRevision` (۴۰۹ اگر کهنه باشد)

const draftTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft:${projectId}`,
});
const draftTreeTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft-tree:${projectId}`,
});

const importBody = ({ file, mode, parentId, draftRevision }: WbsImportRequest) => {
  const body = new FormData();
  body.append('file', file);
  body.append('mode', mode);
  body.append('draftRevision', String(draftRevision));
  if (parentId) body.append('parentId', parentId);
  return body;
};

export const wbsDraftApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWbsDraft: build.query<DraftTreeDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.WBS_DRAFT_TREE(projectId)),
      providesTags: (_result, _error, projectId) => [draftTreeTag(projectId)],
    }),

    previewWbsOps: build.mutation<PreviewResultDto, OpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.WBS_DRAFT_OPS_PREVIEW(projectId),
        method: 'POST',
        body: { draftRevision, ops },
      })),
    }),

    saveWbsOps: build.mutation<SaveResultDto, OpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.WBS_DRAFT_OPS(projectId),
        method: 'POST',
        body: { draftRevision, ops },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      // سربرگ (وضعیت نسخه)، اعتبارسنجی نسخهٔ کاری، و در پروژهٔ پیش‌نویس درخت جاری
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              { type: 'Project', id: projectId },
              draftTag(projectId),
              draftTreeTag(projectId),
              wbsTreeTag(projectId),
            ],
    }),

    /** W39 — پیش‌نمایش و گزارش اعتبارسنجی فایل Excel (wbs.md ۶.۲). */
    previewWbsImport: build.mutation<WbsImportPreviewDto, WbsImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.WBS_IMPORT_PREVIEW(request.projectId),
        method: 'POST',
        body: importBody(request),
      })),
    }),

    /** W39 — «بارگذاری N آیتم» به نسخهٔ کاری. */
    confirmWbsImport: build.mutation<
      { importCount: number; firstId: EntityId | null },
      WbsImportRequest
    >({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.WBS_IMPORT_CONFIRM(request.projectId),
        method: 'POST',
        body: importBody(request),
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              { type: 'Project', id: projectId },
              draftTag(projectId),
              draftTreeTag(projectId),
              wbsTreeTag(projectId),
              { type: 'CbsItem', id: `tree:${projectId}` },
            ],
    }),
  }),
});

export const {
  useGetWbsDraftQuery,
  usePreviewWbsOpsMutation,
  useSaveWbsOpsMutation,
  usePreviewWbsImportMutation,
  useConfirmWbsImportMutation,
} = wbsDraftApi;

registerApiBehavior({
  getWbsDraft: { showErrorToast: false },
  previewWbsImport: { showErrorToast: false },
  confirmWbsImport: {
    showGlobalLoading: true,
    loadingMessage: 'در حال بارگذاری آیتم‌ها…',
    showSuccessToast: true,
    successMessage: 'ساختار فایل به نسخهٔ کاری افزوده شد.',
  },
  // پیش‌نمایش خطای خودش را کنار ردیف نشان می‌دهد
  previewWbsOps: { showErrorToast: false },
  saveWbsOps: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ذخیرهٔ نسخهٔ کاری…',
    showSuccessToast: true,
    successMessage: 'تغییرها در نسخهٔ کاری ذخیره شد.',
  },
});
