import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  AddMemberRequest,
  ApprovalRouteDto,
  AssignmentsDto,
  AssignPreviewDto,
  AssignRequest,
  AssignResultDto,
  MemberDto,
  MembersDto,
  OrgUserDto,
  RemovalImpactDto,
  RemoveMemberRequest,
  UpdateRolesRequest,
} from '../types';

// F07 — تیم و تخصیص (team-assignment.md ۱۰). کد دسترسی هر endpoint:
//   getMembers, getApprovalRoutes            team.view (موبایل فقط با team.manage، D11)
//   searchProjectCandidates, addMember, updateRoles,
//   removalImpact, removeMember, invitation  team.manage
//   getAssignments, previewAssign, assign    assignment.manage

const membersTag = (projectId: EntityId) => ({ type: 'ProjectMember' as const, id: projectId });
const assignmentTag = (projectId: EntityId) => ({ type: 'Assignment' as const, id: projectId });
/** تخصیص روی درخت WBS، اعضا، نسخهٔ کاری و سربرگ اثر دارد. */
const afterAssign = (projectId: EntityId) => [
  assignmentTag(projectId),
  membersTag(projectId),
  'WbsItem' as const,
  { type: 'PlanVersion' as const, id: `draft-tree:${projectId}` },
  { type: 'Project' as const, id: projectId },
];

export const teamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMembers: build.query<MembersDto, { projectId: EntityId; canManage: boolean }>({
      queryFn: serverQuery(({ projectId }) => ENDPOINTS.PROJECT_MEMBERS(projectId)),
      providesTags: (_result, _error, { projectId }) => [membersTag(projectId)],
    }),
    searchProjectCandidates: build.query<OrgUserDto[], { projectId: EntityId; search: string }>({
      queryFn: serverQuery(({ projectId, search }) => ({
        url: ENDPOINTS.ORG_USERS_SEARCH,
        params: { q: search, projectId },
      })),
      providesTags: (_result, _error, { projectId }) => [membersTag(projectId)],
    }),
    addMember: build.mutation<
      { userId: EntityId | null; invitationId: EntityId | null; inviteCode?: string | null },
      AddMemberRequest
    >({
      queryFn: serverQuery(({ projectId, ...body }) => ({
        url: ENDPOINTS.PROJECT_MEMBERS(projectId),
        method: 'POST',
        body,
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error
          ? []
          : [membersTag(projectId), assignmentTag(projectId), { type: 'Project', id: projectId }],
    }),
    updateMemberRoles: build.mutation<MemberDto, UpdateRolesRequest>({
      queryFn: serverQuery(({ projectId, userId, roles }) => ({
        url: ENDPOINTS.PROJECT_MEMBER_DETAILS(projectId, userId),
        method: 'PATCH',
        body: { roles },
      })),
      invalidatesTags: (_result, error, { projectId }) =>
        error ? [] : [membersTag(projectId), assignmentTag(projectId)],
    }),
    getRemovalImpact: build.query<RemovalImpactDto, { projectId: EntityId; userId: EntityId }>({
      queryFn: serverQuery(({ projectId, userId }) =>
        ENDPOINTS.PROJECT_MEMBER_REMOVAL_IMPACT(projectId, userId),
      ),
      keepUnusedDataFor: 0,
    }),
    removeMember: build.mutation<{ removed: true }, RemoveMemberRequest>({
      queryFn: serverQuery(({ projectId, userId, transferTo }) => ({
        url: ENDPOINTS.PROJECT_MEMBER_DETAILS(projectId, userId),
        method: 'DELETE',
        body: { transferTo },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : afterAssign(projectId)),
    }),
    invitationAction: build.mutation<
      // «ارسال دوباره» کد تازهٔ دعوت را یک بار برمی‌گرداند (OD-20)
      { ok: true; inviteCode?: string },
      { projectId: EntityId; invitationId: EntityId; action: 'resend' | 'revoke' }
    >({
      queryFn: serverQuery(({ invitationId, action }) =>
        action === 'resend'
          ? { url: ENDPOINTS.INVITATION_RESEND(invitationId), method: 'POST' }
          : { url: ENDPOINTS.INVITATION(invitationId), method: 'DELETE' },
      ),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : [membersTag(projectId)]),
    }),
    getApprovalRoutes: build.query<ApprovalRouteDto[], EntityId>({
      // سرور یک GET با شکل W29 می‌دهد (تصمیم کاربر 1405/08/23)؛ این endpoint فقط حوزه‌ها را می‌خواهد
      queryFn: serverQuery((projectId) => ENDPOINTS.APPROVAL_ROUTES(projectId), {
        fromServer: (data) => (data as { areas: ApprovalRouteDto[] }).areas,
      }),
      providesTags: (_result, _error, projectId) => [membersTag(projectId)],
    }),
    getAssignments: build.query<AssignmentsDto, EntityId>({
      queryFn: serverQuery((projectId) => ENDPOINTS.ASSIGNMENTS(projectId)),
      providesTags: (_result, _error, projectId) => [assignmentTag(projectId)],
    }),
    previewAssign: build.query<AssignPreviewDto, AssignRequest>({
      queryFn: serverQuery(({ projectId, wbsItemIds, supervisorUserId }) => ({
        url: ENDPOINTS.ASSIGNMENTS_PREVIEW(projectId),
        params: { supervisorUserId: supervisorUserId ?? '', wbsItemIds: wbsItemIds.join(',') },
      })),
      providesTags: (_result, _error, { projectId }) => [assignmentTag(projectId)],
    }),
    assign: build.mutation<AssignResultDto, AssignRequest>({
      queryFn: serverQuery(({ projectId, wbsItemIds, supervisorUserId }) => ({
        url: ENDPOINTS.ASSIGNMENTS(projectId),
        method: 'POST',
        body: { wbsItemIds, supervisorUserId },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })),
      invalidatesTags: (_result, error, { projectId }) => (error ? [] : afterAssign(projectId)),
    }),
  }),
});

export const {
  useGetMembersQuery,
  useSearchProjectCandidatesQuery,
  useAddMemberMutation,
  useUpdateMemberRolesMutation,
  useGetRemovalImpactQuery,
  useRemoveMemberMutation,
  useInvitationActionMutation,
  useGetApprovalRoutesQuery,
  useGetAssignmentsQuery,
  usePreviewAssignQuery,
  useAssignMutation,
} = teamApi;

registerApiBehavior({
  getMembers: { showErrorToast: false },
  searchProjectCandidates: { showErrorToast: false },
  getRemovalImpact: { showErrorToast: false },
  getAssignments: { showErrorToast: false },
  previewAssign: { showErrorToast: false },
  addMember: { showSuccessToast: true, successMessage: 'عضو به پروژه افزوده شد.' },
  updateMemberRoles: { showSuccessToast: true, successMessage: 'نقش‌ها به‌روز شد.' },
  removeMember: { showSuccessToast: true, successMessage: 'عضو از پروژه حذف شد.' },
  invitationAction: { showSuccessToast: true, successMessage: 'دعوت به‌روز شد.' },
  assign: {
    showSuccessToast: true,
    successMessage: 'تخصیص ثبت شد و به سرپرستان پیامک اطلاع داده شد.',
  },
});
