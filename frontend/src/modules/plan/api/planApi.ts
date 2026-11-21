import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { PlanDraftValidationDto } from '../types';
import type { ApplyRequest, DraftImpactDto } from '@/modules/wbs/types/draft';

// F04 — عملیات نسخهٔ کاری (`features/plan-versions.md` ۱۲):
//   getPlanDraftValidation → plan.edit_draft
//   discardPlanDraft       → plan.discard
//   getPlanDraftImpact     → plan.edit_draft (خلاصهٔ اثر ۵.۲)
//   applyPlanDraft         → plan.apply (۵.۳؛ یادداشت اجباری)

export const planApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPlanDraftValidation: build.query<PlanDraftValidationDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.PLAN_DRAFT_VALIDATION(projectId)),
      providesTags: (_result, _error, projectId) => [
        { type: 'PlanVersion', id: `draft:${projectId}` },
      ],
    }),

    getPlanDraftImpact: build.query<DraftImpactDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.PLAN_DRAFT_IMPACT(projectId)),
      providesTags: (_result, _error, projectId) => [
        { type: 'PlanVersion', id: `draft:${projectId}` },
      ],
    }),

    /** `POST /plan-draft/apply {draftRevision, note}` — `plan.apply` (F04 ۵.۳). */
    applyPlanDraft: build.mutation<{ versionId: EntityId; number: number }, ApplyRequest>({
      queryFn: serverQuery(({ projectId, draftRevision, note }) => ({
        url: ENDPOINTS.PLAN_DRAFT_APPLY(projectId),
        method: 'POST',
        body: { draftRevision, note },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      // جدول‌های جاری، درخت، نمودارها و سربرگ همه عوض می‌شوند
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [
              { type: 'Project', id: projectId },
              { type: 'PlanVersion', id: `draft:${projectId}` },
              { type: 'PlanVersion', id: `draft-tree:${projectId}` },
              { type: 'WbsItem', id: `tree:${projectId}` },
              { type: 'Chart', id: projectId },
              // CBS همان نسخه (حالت ویرایش CBS) و تاریخچهٔ نرخ
              'CbsItem',
              'Link',
            ],
    }),

    discardPlanDraft: build.mutation<{ versionId: EntityId; status: 'discarded' }, EntityId>({
      queryFn: serverQuery((projectId) => ({
        url: ENDPOINTS.PLAN_DRAFT(projectId),
        method: 'DELETE',
      })),
      // جدول‌های جاری دست نمی‌خورند (F04 ۵.۴)؛ فقط وضعیت نسخه‌ها و سربرگ پروژه
      invalidatesTags: (_result, error, projectId) =>
        error
          ? []
          : [
              { type: 'Project', id: projectId },
              { type: 'PlanVersion', id: `draft:${projectId}` },
              { type: 'PlanVersion', id: `draft-tree:${projectId}` },
            ],
    }),
  }),
});

export const {
  useGetPlanDraftValidationQuery,
  useGetPlanDraftImpactQuery,
  useApplyPlanDraftMutation,
  useDiscardPlanDraftMutation,
} = planApi;

registerApiBehavior({
  getPlanDraftValidation: { showErrorToast: false },
  getPlanDraftImpact: { showErrorToast: false },
  applyPlanDraft: {
    showGlobalLoading: true,
    loadingMessage: 'در حال اعمال بازنگری…',
    showSuccessToast: true,
    successMessage: 'بازنگری اعمال شد. اعداد پروژه با برنامهٔ تازه دوباره محاسبه می‌شوند.',
  },
  discardPlanDraft: {
    showGlobalLoading: true,
    loadingMessage: 'در حال کنار گذاشتن نسخهٔ کاری…',
    showSuccessToast: true,
    successMessage: 'نسخهٔ کاری کنار گذاشته شد. برنامهٔ جاری بدون تغییر ماند.',
  },
});
