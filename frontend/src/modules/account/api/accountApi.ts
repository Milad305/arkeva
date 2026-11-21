import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { UserPreferences } from '@/modules/auth/types';
import type { EntityId } from '@/shared/types/api';
import type { AccountDto, LoginAttemptDto, PasswordChangeInput, ProfileInput } from '../types';

// F01 ۵.۷ — حساب من (W32). همهٔ endpointها فقط احراز هویت می‌خواهند (کد دسترسی ندارند؛
// روی حساب خود کاربر). وضعیت ۲FA کاربر در W26 هم دیده می‌شود، پس `User` هم باطل می‌شود.

const ACCOUNT = [{ type: 'User' as const, id: 'ME' }];

export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccount: build.query<AccountDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.ME),
      providesTags: ACCOUNT,
    }),
    updateProfile: build.mutation<AccountDto, ProfileInput>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.ME, method: 'PATCH', body })),
      invalidatesTags: (_result, error) => (error ? [] : [...ACCOUNT, 'User']),
    }),
    updatePreferences: build.mutation<AccountDto, UserPreferences>({
      queryFn: serverQuery((preferences) => ({
        url: ENDPOINTS.ME,
        method: 'PATCH',
        body: { preferences },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    changePassword: build.mutation<{ signedOut: number }, PasswordChangeInput>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.ME_PASSWORD, method: 'PUT', body })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    enable2fa: build.mutation<{ backupCodes: string[] }, string>({
      queryFn: serverQuery((code) => ({
        url: ENDPOINTS.ME_2FA_ENABLE,
        method: 'POST',
        body: { code },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...ACCOUNT, 'User']),
    }),
    disable2fa: build.mutation<unknown, string>({
      queryFn: serverQuery((password) => ({
        url: ENDPOINTS.ME_2FA_DISABLE,
        method: 'POST',
        body: { password },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...ACCOUNT, 'User']),
    }),
    regenerateBackupCodes: build.mutation<{ backupCodes: string[] }, void>({
      queryFn: serverQuery(() => ({ url: ENDPOINTS.ME_BACKUP_CODES, method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    revokeSession: build.mutation<unknown, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.ME_SESSION(id), method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    revokeOtherSessions: build.mutation<{ signedOut: number }, void>({
      queryFn: serverQuery(() => ({ url: ENDPOINTS.ME_SESSIONS, method: 'DELETE' })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    saveNotificationPrefs: build.mutation<AccountDto, AccountDto['notifications']>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.ME_NOTIFICATION_PREFS,
        method: 'PUT',
        body,
      })),
      invalidatesTags: (_result, error) => (error ? [] : ACCOUNT),
    }),
    getLoginHistory: build.query<LoginAttemptDto[], void>({
      queryFn: serverQuery(() => ({ url: ENDPOINTS.ME_LOGIN_HISTORY, params: { days: 30 } })),
      providesTags: ACCOUNT,
    }),
  }),
});

export const {
  useGetAccountQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useChangePasswordMutation,
  useEnable2faMutation,
  useDisable2faMutation,
  useRegenerateBackupCodesMutation,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
  useSaveNotificationPrefsMutation,
  useGetLoginHistoryQuery,
} = accountApi;

registerApiBehavior({
  getAccount: { showErrorToast: false },
  getLoginHistory: { showErrorToast: false },
  updateProfile: { showSuccessToast: true, successMessage: 'پروفایل ذخیره شد.' },
  updatePreferences: { showSuccessToast: true, successMessage: 'ترجیحات نمایش ذخیره و اعمال شد.' },
  saveNotificationPrefs: { showSuccessToast: true, successMessage: 'ترجیحات اعلان ذخیره شد.' },
  revokeSession: { showSuccessToast: true, successMessage: 'از آن دستگاه خارج شدید.' },
});
