import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  CbsDraftTreeDto,
  CbsImportPreviewDto,
  CbsImportRequest,
  CbsOpsRequest,
  CbsPreviewResultDto,
  CbsSaveResultDto,
} from '../types/draft';
import { cbsTreeTag } from './cbsApi';

// حالت ویرایش CBS — همان نسخهٔ کاری W12 (F04). همه با `plan.edit_draft` (cbs.md ۱۳؛
// تصمیم 1405/08/15). تغییر نرخ، مقدار و مبلغ در پروژهٔ فعال را سرور با `cbs.revise_budget`
// هم می‌سنجد (۷.۲).
//   getCbsDraft        درخت CBS نسخهٔ کاری با قفل‌ها و اعتبارسنجی کل نسخه
//   previewCbsOps      اجرای فهرست عملیات بی‌نوشتن
//   saveCbsOps         ذخیره با قفل خوش‌بینانهٔ `draftRevision`
//   previewCbsImport   خواندن فایل Excel و پیش‌نمایش ردیف‌ها
//   confirmCbsImport   افزودن همه یا هیچ به نسخهٔ کاری

/** درخت نسخهٔ کاری WBS و CBS یک برچسب دارند: هر دو از یک نسخه و یک اعتبارسنجی‌اند. */
const draftTreeTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft-tree:${projectId}`,
});
const draftTag = (projectId: EntityId) => ({
  type: 'PlanVersion' as const,
  id: `draft:${projectId}`,
});

const importBody = ({ file, mode, parentId, draftRevision }: CbsImportRequest) => {
  const body = new FormData();
  body.append('file', file);
  body.append('mode', mode);
  body.append('draftRevision', String(draftRevision));
  if (parentId) body.append('parentId', parentId);
  return body;
};

export const cbsDraftApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCbsDraft: build.query<CbsDraftTreeDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.CBS_DRAFT_TREE(projectId)),
      providesTags: (_result, _error, projectId) => [draftTreeTag(projectId)],
    }),

    previewCbsOps: build.mutation<CbsPreviewResultDto, CbsOpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.CBS_DRAFT_OPS_PREVIEW(projectId),
        method: 'POST',
        body: { draftRevision, ops },
      })),
    }),

    saveCbsOps: build.mutation<CbsSaveResultDto, CbsOpsRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, ops }) => ({
        url: ENDPOINTS.CBS_DRAFT_OPS(projectId),
        method: 'POST',
        body: { draftRevision, ops },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      // سربرگ، اعتبارسنجی، و در پروژهٔ پیش‌نویس CBS و WBS جاری
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              { type: 'Project', id: projectId },
              draftTag(projectId),
              draftTreeTag(projectId),
              cbsTreeTag(projectId),
              { type: 'WbsItem', id: `tree:${projectId}` },
            ],
    }),

    previewCbsImport: build.mutation<CbsImportPreviewDto, CbsImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.CBS_IMPORT_PREVIEW(request.projectId),
        method: 'POST',
        body: importBody(request),
      })),
    }),

    confirmCbsImport: build.mutation<CbsSaveResultDto, CbsImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.CBS_IMPORT_CONFIRM(request.projectId),
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
              cbsTreeTag(projectId),
              { type: 'WbsItem', id: `tree:${projectId}` },
            ],
    }),
  }),
});

export const {
  useGetCbsDraftQuery,
  usePreviewCbsOpsMutation,
  useSaveCbsOpsMutation,
  usePreviewCbsImportMutation,
  useConfirmCbsImportMutation,
} = cbsDraftApi;

registerApiBehavior({
  getCbsDraft: { showErrorToast: false },
  previewCbsOps: { showErrorToast: false },
  previewCbsImport: { showErrorToast: false },
  saveCbsOps: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ذخیرهٔ نسخهٔ کاری…',
    showSuccessToast: true,
    successMessage: 'تغییرهای CBS در نسخهٔ کاری ذخیره شد.',
  },
  confirmCbsImport: {
    showGlobalLoading: true,
    loadingMessage: 'در حال افزودن ردیف‌ها…',
    showSuccessToast: true,
    successMessage: 'ردیف‌های فایل به نسخهٔ کاری افزوده شد.',
  },
});
