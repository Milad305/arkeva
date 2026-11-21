import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId, IsoDate } from '@/shared/types/api';
import type {
  CreateRiskRequest,
  RiskActionStatus,
  RiskDetailDto,
  RiskInput,
  RiskPeopleDto,
  RiskRegisterDto,
  RiskStatusRequest,
} from '../types';

// F14 — ریسک (risk.md ۱۰). کد دسترسی هر endpoint:
//   getRiskRegister, getRisk, addNote, follow   risk.view (مبالغ با risk.view_amounts = cbs.view_amounts)
//   createRisk                                  risk.create
//   updateRisk, saveAction                      risk.edit
//   changeRiskStatus, merge                     risk.change_status_owner (پیشنهاد ادغام: risk.view)
//   allocateContingency                         risk.allocate_contingency

const registerTag = (projectId: EntityId | null) => ({
  type: 'Risk' as const,
  id: `register:${projectId ?? 'all'}`,
});
const riskTag = (riskId: EntityId) => ({ type: 'Risk' as const, id: riskId });
/** هر نوشتن روی یک ریسک: خودش، دفترها، سربرگ پروژه (شمار ریسک باز) و کارت‌های W05/W10. */
const afterWrite = (riskId: EntityId) => [
  riskTag(riskId),
  'Risk' as const,
  'Project' as const,
  'Dashboard' as const,
  'Chart' as const,
];

export const risksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRiskRegister: build.query<
      RiskRegisterDto,
      { projectId: EntityId | null; canViewAmounts: boolean }
    >({
      queryFn: serverQuery(({ projectId }) =>
        projectId ? ENDPOINTS.PROJECT_RISKS(projectId) : ENDPOINTS.RISKS,
      ),
      providesTags: (_result, _error, { projectId }) => [registerTag(projectId), 'Risk'],
    }),
    getRisk: build.query<RiskDetailDto, { riskId: EntityId; canViewAmounts: boolean }>({
      queryFn: serverQuery(({ riskId }) => ENDPOINTS.RISK(riskId)),
      providesTags: (_result, _error, { riskId }) => [riskTag(riskId)],
    }),
    getRiskPeople: build.query<RiskPeopleDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.RISK_PEOPLE(projectId)),
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectMember', id: projectId }],
    }),
    createRisk: build.mutation<RiskDetailDto, CreateRiskRequest>({
      queryFn: serverQuery(({ projectId, ...body }) => ({
        url: ENDPOINTS.PROJECT_RISKS(projectId),
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (result, error) => (error || !result ? [] : afterWrite(result.id)),
    }),
    updateRisk: build.mutation<RiskDetailDto, { riskId: EntityId; input: RiskInput }>({
      queryFn: serverQuery(({ riskId, input }) => ({
        url: ENDPOINTS.RISK(riskId),
        method: 'PATCH',
        body: input,
      })),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : afterWrite(riskId)),
    }),
    changeRiskStatus: build.mutation<RiskDetailDto, RiskStatusRequest>({
      queryFn: serverQuery(({ riskId, ...body }) => ({
        url: ENDPOINTS.RISK_STATUS(riskId),
        method: 'POST',
        body,
      })),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : afterWrite(riskId)),
    }),
    saveRiskAction: build.mutation<
      RiskDetailDto,
      {
        riskId: EntityId;
        actionId: EntityId | null;
        title?: string;
        ownerUserId?: EntityId;
        dueDate?: IsoDate | null;
        status?: RiskActionStatus;
        completionNote?: string | null;
      }
    >({
      queryFn: serverQuery(({ riskId, actionId, ...body }) =>
        actionId
          ? { url: ENDPOINTS.RISK_ACTION(actionId), method: 'PATCH', body }
          : { url: ENDPOINTS.RISK_ACTIONS(riskId), method: 'POST', body },
      ),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : afterWrite(riskId)),
    }),
    addRiskNote: build.mutation<RiskDetailDto, { riskId: EntityId; text: string }>({
      queryFn: serverQuery(({ riskId, text }) => ({
        url: ENDPOINTS.RISK_NOTES(riskId),
        method: 'POST',
        body: { text },
      })),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : [riskTag(riskId)]),
    }),
    followRisk: build.mutation<RiskDetailDto, { riskId: EntityId; follow: boolean }>({
      queryFn: serverQuery(({ riskId, follow }) => ({
        url: ENDPOINTS.RISK_FOLLOW(riskId),
        method: follow ? 'POST' : 'DELETE',
      })),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : [riskTag(riskId)]),
    }),
    allocateContingency: build.mutation<RiskDetailDto, { riskId: EntityId; amount: string }>({
      queryFn: serverQuery(({ riskId, amount }) => ({
        url: ENDPOINTS.RISK_CONTINGENCY(riskId),
        method: 'PUT',
        body: { amount },
      })),
      invalidatesTags: (_result, error, { riskId }) => (error ? [] : [riskTag(riskId), 'Risk']),
    }),
    mergeRisk: build.mutation<
      RiskDetailDto,
      { riskId: EntityId; intoRiskId: EntityId; propose: boolean }
    >({
      queryFn: serverQuery(({ riskId, intoRiskId, propose }) => ({
        url: ENDPOINTS.RISK_MERGE(riskId),
        method: 'POST',
        body: { intoRiskId, propose },
      })),
      invalidatesTags: (_result, error, { riskId, intoRiskId }) =>
        error ? [] : [...afterWrite(riskId), riskTag(intoRiskId)],
    }),
  }),
});

export const {
  useGetRiskRegisterQuery,
  useGetRiskQuery,
  useGetRiskPeopleQuery,
  useCreateRiskMutation,
  useUpdateRiskMutation,
  useChangeRiskStatusMutation,
  useSaveRiskActionMutation,
  useAddRiskNoteMutation,
  useFollowRiskMutation,
  useAllocateContingencyMutation,
  useMergeRiskMutation,
} = risksApi;

registerApiBehavior({
  getRiskRegister: { showErrorToast: false },
  getRisk: { showErrorToast: false },
  getRiskPeople: { showErrorToast: false },
  createRisk: { showSuccessToast: true, successMessage: 'ریسک ثبت شد.' },
  updateRisk: { showSuccessToast: true, successMessage: 'ریسک به‌روز شد.' },
  changeRiskStatus: { showSuccessToast: true, successMessage: 'وضعیت ریسک ثبت شد.' },
  saveRiskAction: { showSuccessToast: false },
  addRiskNote: { showSuccessToast: false },
  allocateContingency: {
    showErrorToast: false,
    showSuccessToast: true,
    successMessage: 'تخصیص ذخیره ثبت شد.',
  },
  mergeRisk: { showSuccessToast: true, successMessage: 'ثبت شد.' },
});
