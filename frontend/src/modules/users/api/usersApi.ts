import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type {
  BulkResultDto,
  BulkUsersRequest,
  DisableImpactDto,
  ImportResultDto,
  ImportRowInput,
  InviteUserRequest,
  OrgUsersDto,
  RoleAuditDto,
  RoleChange,
  RoleDto,
  RolesDto,
  RolesImpactDto,
} from '../types';

// F01 — کاربران سازمان (W26) و نقش‌ها (W27). کد دسترسی هر endpoint:
//   getOrgUsers                                       users.manage (مدیر پروژه: users.invite با own_projects)
//   inviteUser, importUsers, bulkUsers                users.invite
//   unlockUser, disableImpact, disableUser,
//   enableUser, setOrgAdmin                           users.manage
//   setRequire2fa                                     org.settings
//   getRoles, rolesImpact, saveRolePermissions,
//   createRole, deleteRole, getRolesAudit             roles.edit

/** عضویت و دعوت مال F07 است؛ تغییر W26 فهرست اعضای پروژه‌ها و نقش‌ها را هم کهنه می‌کند. */
const USERS_AFTER = ['User', 'ProjectMember', 'Role', 'Assignment', 'Organization'] as const;

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrgUsers: build.query<OrgUsersDto, { canManage: boolean }>({
      queryFn: serverQuery(() => ENDPOINTS.USERS),
      providesTags: ['User', 'ProjectMember'],
    }),
    inviteUser: build.mutation<{ invitationId: EntityId; inviteCode?: string }, InviteUserRequest>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.INVITATIONS, method: 'POST', body })),
      invalidatesTags: (_result, error) => (error ? [] : [...USERS_AFTER]),
    }),
    bulkUsers: build.mutation<BulkResultDto, BulkUsersRequest>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.USERS_BULK, method: 'POST', body })),
      invalidatesTags: (_result, error) => (error ? [] : [...USERS_AFTER]),
    }),
    importUsers: build.mutation<ImportResultDto, { rows: ImportRowInput[]; commit: boolean }>({
      queryFn: serverQuery(({ rows, commit }) => ({
        url: ENDPOINTS.USERS_IMPORT,
        method: 'POST',
        body: { rows },
        params: { commit },
      })),
      invalidatesTags: (_result, error, { commit }) => (error || !commit ? [] : [...USERS_AFTER]),
    }),
    unlockUser: build.mutation<unknown, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.USER_UNLOCK(id), method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : ['User']),
    }),
    getDisableImpact: build.query<DisableImpactDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.USER_DISABLE_IMPACT(id)),
      providesTags: ['User', 'ProjectMember'],
    }),
    disableUser: build.mutation<
      unknown,
      { userId: EntityId; transfers: Record<EntityId, EntityId | null>; reason: string }
    >({
      queryFn: serverQuery(({ userId, transfers, reason }) => ({
        url: ENDPOINTS.USER_DISABLE(userId),
        method: 'POST',
        body: { transfers, reason },
      })),
      invalidatesTags: (_result, error) =>
        error ? [] : [...USERS_AFTER, 'WbsItem', 'FieldReport'],
    }),
    enableUser: build.mutation<unknown, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.USER_ENABLE(id), method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : [...USERS_AFTER]),
    }),
    setOrgAdmin: build.mutation<unknown, { userId: EntityId; isOrgAdmin: boolean }>({
      queryFn: serverQuery(({ userId, isOrgAdmin }) => ({
        url: ENDPOINTS.USER_DETAILS(userId),
        method: 'PATCH',
        body: { isOrgAdmin },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['User', 'Role']),
    }),
    setRequire2fa: build.mutation<{ require2fa: boolean }, boolean>({
      queryFn: serverQuery((value) => ({
        url: ENDPOINTS.ORG_SECURITY,
        method: 'PATCH',
        body: { require2fa: value },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['User', 'Organization']),
    }),

    getRoles: build.query<RolesDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.ROLES),
      providesTags: ['Role', 'Permission'],
    }),
    rolesImpact: build.query<RolesImpactDto, RoleChange[]>({
      queryFn: serverQuery((changes) => ({
        url: ENDPOINTS.ROLES_IMPACT,
        method: 'POST',
        body: { changes },
      })),
      providesTags: ['Role'],
    }),
    saveRolePermissions: build.mutation<RoleDto, { change: RoleChange; reason: string | null }>({
      queryFn: serverQuery(({ change, reason }) => ({
        url: ENDPOINTS.ROLE_PERMISSIONS(change.roleId),
        method: 'PUT',
        body: { grants: change.grants, reason },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['Role', 'Permission']),
    }),
    createRole: build.mutation<RoleDto, { name: string; copyFromId: EntityId | null }>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.ROLES, method: 'POST', body })),
      invalidatesTags: (_result, error) => (error ? [] : ['Role']),
    }),
    deleteRole: build.mutation<unknown, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.ROLE_DETAILS(id), method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : ['Role']),
    }),
    getRolesAudit: build.query<RoleAuditDto[], void>({
      queryFn: serverQuery(() => ENDPOINTS.ROLES_AUDIT),
      providesTags: ['Role'],
    }),
  }),
});

export const {
  useGetOrgUsersQuery,
  useInviteUserMutation,
  useBulkUsersMutation,
  useImportUsersMutation,
  useUnlockUserMutation,
  useGetDisableImpactQuery,
  useDisableUserMutation,
  useEnableUserMutation,
  useSetOrgAdminMutation,
  useSetRequire2faMutation,
  useGetRolesQuery,
  useRolesImpactQuery,
  useSaveRolePermissionsMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetRolesAuditQuery,
} = usersApi;

registerApiBehavior({
  getOrgUsers: { showErrorToast: false },
  getDisableImpact: { showErrorToast: false },
  getRoles: { showErrorToast: false },
  rolesImpact: { showErrorToast: false },
  getRolesAudit: { showErrorToast: false },
  importUsers: { showErrorToast: true },
  inviteUser: { showSuccessToast: true, successMessage: 'دعوت فرستاده شد؛ ۷ روز اعتبار دارد.' },
  unlockUser: { showSuccessToast: true, successMessage: 'قفل حساب باز شد.' },
  disableUser: {
    showSuccessToast: true,
    successMessage: 'حساب غیرفعال شد و از همهٔ پروژه‌ها خارج شد.',
  },
  enableUser: { showSuccessToast: true, successMessage: 'حساب دوباره فعال شد.' },
  setOrgAdmin: { showSuccessToast: true, successMessage: 'نقش مدیر سازمان به‌روز شد.' },
  createRole: { showSuccessToast: true, successMessage: 'نقش تازه ساخته شد.' },
  deleteRole: { showSuccessToast: true, successMessage: 'نقش حذف شد.' },
});
