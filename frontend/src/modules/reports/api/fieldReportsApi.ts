import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  ApproveCleanResultDto,
  DecisionRequest,
  DecisionResultDto,
  FieldReportDto,
  FieldValuesInput,
  InboxDto,
  InboxQuery,
  LeafReportContextDto,
  ManualEntryRequest,
  RequiredActionDto,
} from '../types';

// F09 — صندوق گزارش‌ها (W20)، تأیید سریع (W40) و ثبت دستی (G10). کد دسترسی هر endpoint:
//   getInbox, getFieldReport                  report.view (دامنه: ناظر حوزهٔ خودش، بقیه کل پروژه)
//   decideItem                                report.approve.stage1 | report.approve.stage2 (بر اساس مرحله)
//   approveClean, requestReportRevision       report.approve.stage1
//   revokeAuto                                report.approve.stage1 (حوزه) یا مدیر پروژه
//   correctItem                               report.correct
//   resolveItem                               report.resolve
//   createManualReport, getLeafReportContext  report.manual_entry

/**
 * هر تصمیم: صندوق و گزارش، و چون پیشرفت برگ تغییر می‌کند W11، W05، W10، هشدارها
 * و نمودارها (D07: یک بازمحاسبه).
 */
const AFTER_DECISION = [
  'FieldReport',
  'FieldReportItem',
  'WbsItem',
  'Dashboard',
  'Project',
  'Chart',
  'Alert',
] as const;

export const fieldReportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInbox: build.query<InboxDto, InboxQuery>({
      queryFn: serverQuery((query) => ({
        url: ENDPOINTS.FIELD_INBOX,
        params: {
          tab: query.tab,
          projectId: query.projectId ?? undefined,
          supervisorId: query.supervisorId ?? undefined,
          wbsRootId: query.wbsRootId ?? query.wbsItemId ?? undefined,
          range: query.range,
          flagged: query.flagged || undefined,
          sort: query.sort,
        },
      })),
      providesTags: ['FieldReport'],
    }),
    getFieldReport: build.query<FieldReportDto, { projectId: EntityId; reportId: EntityId }>({
      queryFn: serverQuery(({ projectId, reportId }) =>
        ENDPOINTS.FIELD_REPORT(projectId, reportId),
      ),
      providesTags: (_result, _error, { reportId }) => [
        { type: 'FieldReport', id: reportId },
        'FieldReportItem',
      ],
    }),
    decideItem: build.mutation<DecisionResultDto, DecisionRequest>({
      queryFn: serverQuery(({ projectId, itemId, ...body }) => ({
        url: ENDPOINTS.FIELD_ITEM_DECISION(projectId, itemId),
        method: 'POST',
        body,
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    approveClean: build.mutation<
      ApproveCleanResultDto,
      { projectId: EntityId; reportId: EntityId }
    >({
      queryFn: serverQuery(({ projectId, reportId }) => ({
        url: ENDPOINTS.FIELD_REPORT_APPROVE_CLEAN(projectId, reportId),
        method: 'POST',
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    requestReportRevision: build.mutation<
      { count: number },
      {
        projectId: EntityId;
        reportId: EntityId;
        note: string;
        requiredActions: RequiredActionDto[];
      }
    >({
      queryFn: serverQuery(({ projectId, reportId, ...body }) => ({
        url: ENDPOINTS.FIELD_REPORT_REQUEST_REVISION(projectId, reportId),
        method: 'POST',
        body,
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    revokeAuto: build.mutation<
      DecisionResultDto,
      { projectId: EntityId; itemId: EntityId; note: string }
    >({
      queryFn: serverQuery(({ projectId, itemId, note }) => ({
        url: ENDPOINTS.FIELD_ITEM_REVOKE_AUTO(projectId, itemId),
        method: 'POST',
        body: { note },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    correctItem: build.mutation<
      DecisionResultDto,
      { projectId: EntityId; itemId: EntityId; values: FieldValuesInput; reason: string }
    >({
      queryFn: serverQuery(({ projectId, itemId, values, reason }) => ({
        url: ENDPOINTS.FIELD_ITEM_CORRECT(projectId, itemId),
        method: 'POST',
        body: { values, reason },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    resolveItem: build.mutation<
      DecisionResultDto,
      { projectId: EntityId; itemId: EntityId; accept: boolean; note: string }
    >({
      queryFn: serverQuery(({ projectId, itemId, accept, note }) => ({
        url: ENDPOINTS.FIELD_ITEM_RESOLVE(projectId, itemId),
        method: 'POST',
        body: { accept, note },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
    getLeafReportContext: build.query<
      LeafReportContextDto,
      { projectId: EntityId; wbsItemId: EntityId }
    >({
      queryFn: serverQuery(({ projectId, wbsItemId }) =>
        ENDPOINTS.WBS_REPORT_CONTEXT(projectId, wbsItemId),
      ),
      providesTags: (_result, _error, { wbsItemId }) => [{ type: 'WbsItem', id: wbsItemId }],
    }),
    createManualReport: build.mutation<FieldReportDto, ManualEntryRequest>({
      queryFn: serverQuery(({ projectId, ...body }) => ({
        url: ENDPOINTS.FIELD_REPORT_MANUAL(projectId),
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...AFTER_DECISION]),
    }),
  }),
});

export const {
  useGetInboxQuery,
  useGetFieldReportQuery,
  useDecideItemMutation,
  useApproveCleanMutation,
  useRequestReportRevisionMutation,
  useRevokeAutoMutation,
  useCorrectItemMutation,
  useResolveItemMutation,
  useGetLeafReportContextQuery,
  useCreateManualReportMutation,
} = fieldReportsApi;

registerApiBehavior({
  getInbox: { showErrorToast: false },
  getFieldReport: { showErrorToast: false },
  getLeafReportContext: { showErrorToast: false },
  decideItem: { showErrorToast: false },
  approveClean: { showErrorToast: true },
  // پیام موفقیت این سه را دیالوگ از پاسخ سرور نشان می‌دهد
  requestReportRevision: { showErrorToast: false },
  revokeAuto: { showErrorToast: false },
  correctItem: { showErrorToast: false },
  resolveItem: { showErrorToast: false },
  createManualReport: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'گزارش دستی ثبت شد و نزد تأییدکنندهٔ جایگزین رفت.',
  },
});
