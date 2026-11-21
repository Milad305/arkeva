import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  BudgetRevisionRequestDto,
  CbsItemDetailDto,
  CbsTreeDto,
  CreateRevisionRequest,
  DecideRevisionRequest,
} from '../types';

// F05 — دفتر CBS (`features/cbs.md` ۱۱). هر endpoint یک کد دسترسی:
//   getCbsTree, getCbsItem, getBudgetRevisions → cbs.view (حذف مبلغ بدون cbs.view_amounts، D11)
//   createBudgetRevisionRequest                → cbs.request_revision
// ویرایش اقلام، بازنگری مستقیم و تأیید درخواست با حالت ویرایش CBS می‌آیند (تصمیم 1405/08/15).

export const cbsTreeTag = (projectId: EntityId) => ({
  type: 'CbsItem' as const,
  id: `tree:${projectId}`,
});
const revisionsTag = (projectId: EntityId) => ({
  type: 'CbsItem' as const,
  id: `revisions:${projectId}`,
});

export const cbsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCbsTree: build.query<CbsTreeDto, EntityId>({
      queryFn: serverQuery((projectId) => ({
        url: ENDPOINTS.CBS_TREE(projectId),
        params: { include: 'progress' },
      })),
      providesTags: (_result, _error, projectId) => [cbsTreeTag(projectId)],
    }),

    getCbsItem: build.query<CbsItemDetailDto, { projectId: EntityId; itemId: EntityId }>({
      queryFn: serverQuery(({ projectId, itemId }) => ENDPOINTS.CBS_ITEM(projectId, itemId)),
      providesTags: (_result, _error, { itemId }) => [{ type: 'CbsItem', id: itemId }],
    }),

    getBudgetRevisions: build.query<BudgetRevisionRequestDto[], EntityId>({
      queryFn: serverQuery((projectId) => ({
        url: ENDPOINTS.BUDGET_REVISIONS(projectId),
        params: { status: 'pending' },
      })),
      providesTags: (_result, _error, projectId) => [revisionsTag(projectId)],
    }),

    createBudgetRevisionRequest: build.mutation<BudgetRevisionRequestDto, CreateRevisionRequest>({
      queryFn: serverQuery(({ projectId, reason, changes }) => ({
        url: ENDPOINTS.BUDGET_REVISIONS(projectId),
        method: 'POST',
        body: { reason, changes },
      })),
      invalidatesTags: (_result, error, { projectId, changes }) =>
        error
          ? []
          : [
              revisionsTag(projectId),
              ...changes.map((change) => ({ type: 'CbsItem' as const, id: change.cbsItemId })),
            ],
    }),

    /** تأیید (ساخت و اعمال نسخهٔ «بازنگری بودجه») یا رد — `cbs.approve_revision` (۷.۲). */
    decideBudgetRevision: build.mutation<BudgetRevisionRequestDto, DecideRevisionRequest>({
      queryFn: serverQuery(({ projectId, requestId, decision, note }) => ({
        url: ENDPOINTS.BUDGET_REVISION_DECIDE(projectId, requestId, decision),
        method: 'POST',
        body: { note },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      // تأیید جدول‌های جاری را عوض می‌کند: CBS، WBS (زیربودجهٔ اتصال‌ها)، سربرگ و نمودارها
      invalidatesTags: (_result, error, { projectId, decision }) =>
        error
          ? []
          : decision === 'reject'
            ? [revisionsTag(projectId)]
            : [
                'CbsItem',
                { type: 'WbsItem', id: `tree:${projectId}` },
                { type: 'Project', id: projectId },
                { type: 'Chart', id: projectId },
              ],
    }),
  }),
});

export const { useDecideBudgetRevisionMutation } = cbsApi;
export const {
  useGetCbsTreeQuery,
  useGetCbsItemQuery,
  useGetBudgetRevisionsQuery,
  useCreateBudgetRevisionRequestMutation,
} = cbsApi;

registerApiBehavior({
  getCbsTree: { showErrorToast: false },
  getCbsItem: { showErrorToast: false },
  getBudgetRevisions: { showErrorToast: false },
  createBudgetRevisionRequest: {
    showSuccessToast: true,
    successMessage: 'درخواست بازنگری برای مدیر پروژه فرستاده شد.',
  },
  // خطای ۴۰۹ «بازنگری کاری باز» را خود دیالوگ با راه ادامه نشان می‌دهد
  decideBudgetRevision: { showErrorToast: false },
});
