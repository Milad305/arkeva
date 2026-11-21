import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { UpdateStatusNoteRequest, WbsItemDetailDto, WbsTreeDto } from '../types';

// F03 — درخت جاری و جزئیات آیتم (`features/wbs.md` ۱۱). هر endpoint یک کد دسترسی:
//   getWbsTree, getWbsItem  → wbs.view (دامنهٔ داده و حذف مبلغ در سرور، D11)
//   updateWbsStatusNote     → wbs.edit_note
// ویرایش ساختار (`plan-draft/wbs/ops`) با W12 می‌آید.

/** برچسب کل درخت یک پروژه — جدا از برچسب هر آیتم. */
export const wbsTreeTag = (projectId: EntityId) => ({
  type: 'WbsItem' as const,
  id: `tree:${projectId}`,
});

export const wbsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWbsTree: build.query<WbsTreeDto, EntityId>({
      queryFn: serverQuery((projectId) => ({
        url: ENDPOINTS.WBS_TREE(projectId),
        params: { include: 'progress' },
      })),
      providesTags: (_result, _error, projectId) => [wbsTreeTag(projectId)],
    }),

    getWbsItem: build.query<WbsItemDetailDto, { projectId: EntityId; itemId: EntityId }>({
      queryFn: serverQuery(({ projectId, itemId }) => ENDPOINTS.WBS_ITEM(projectId, itemId)),
      providesTags: (_result, _error, { itemId }) => [{ type: 'WbsItem', id: itemId }],
    }),

    updateWbsStatusNote: build.mutation<
      { id: EntityId; statusNote: string | null },
      UpdateStatusNoteRequest
    >({
      queryFn: serverQuery(({ projectId, itemId, statusNote }) => ({
        url: ENDPOINTS.WBS_STATUS_NOTE(projectId, itemId),
        method: 'PATCH',
        body: { statusNote },
      })),
      invalidatesTags: (_result, error, { projectId, itemId }) =>
        error ? [] : [{ type: 'WbsItem', id: itemId }, wbsTreeTag(projectId)],
    }),
  }),
});

export const { useGetWbsTreeQuery, useGetWbsItemQuery, useUpdateWbsStatusNoteMutation } = wbsApi;

registerApiBehavior({
  // درخت و پنل جزئیات حالت خطای خودشان را درجا نشان می‌دهند
  getWbsTree: { showErrorToast: false },
  getWbsItem: { showErrorToast: false },
  updateWbsStatusNote: { showSuccessToast: true, successMessage: 'یادداشت وضعیت ذخیره شد.' },
});
