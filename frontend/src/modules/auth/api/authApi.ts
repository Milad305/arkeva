import { baseApi } from '@/app/api/baseApi';
import { serverQuery } from '@/app/api/serverQuery';
import { registerApiBehavior } from '@/app/api/behavior';
import { ENDPOINTS } from '@/config/endpoints';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResult,
  ResetPasswordRequest,
  SessionDto,
  SignupCompleteRequest,
  SignupRequestCodeRequest,
  SignupRequestCodeResponse,
  StepUpRequest,
  StepUpResponse,
  VerifyOtpRequest,
} from '../types';

/**
 * endpointهای ورود — مسیرها از `design/features/access-control.md` بخش ۸.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResult, LoginRequest>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.AUTH_LOGIN, method: 'POST', body })),
    }),

    verifyOtp: build.mutation<SessionDto, VerifyOtpRequest>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.AUTH_VERIFY_OTP, method: 'POST', body })),
      invalidatesTags: ['Auth'],
    }),

    resendOtp: build.mutation<{ resendAfterSec: number }, { otpToken: string }>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.AUTH_RESEND_OTP, method: 'POST', body })),
    }),

    /** بازگشت نشست از کوکی تازه‌سازی پس از تازه‌کردن صفحه (فقط سرور واقعی؛ docs/backend/07 ۲). */
    refreshSession: build.mutation<SessionDto, void>({
      queryFn: serverQuery(() => ({ url: ENDPOINTS.AUTH_REFRESH, method: 'POST' })),
    }),

    /** خروج از همین دستگاه: نشست سرور باطل و کوکی پاک می‌شود. */
    logout: build.mutation<void, void>({
      queryFn: serverQuery(() => ({ url: ENDPOINTS.AUTH_LOGOUT, method: 'POST' })),
    }),

    forgotPassword: build.mutation<
      { resetToken: string; maskedMobile: string },
      ForgotPasswordRequest
    >({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_FORGOT_PASSWORD,
        method: 'POST',
        body,
      })),
    }),

    verifyResetCode: build.mutation<{ ok: true }, { resetToken: string; code: string }>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_RESET_VERIFY_CODE,
        method: 'POST',
        body,
      })),
    }),

    resendResetCode: build.mutation<{ resendAfterSec: number }, { resetToken: string }>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.AUTH_RESET_RESEND, method: 'POST', body })),
    }),

    requestStepUp: build.mutation<StepUpResponse, StepUpRequest>({
      queryFn: serverQuery((body) => ({ url: ENDPOINTS.AUTH_STEP_UP, method: 'POST', body })),
    }),

    resetPassword: build.mutation<SessionDto, ResetPasswordRequest>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_RESET_PASSWORD,
        method: 'POST',
        body,
      })),
      invalidatesTags: ['Auth'],
    }),

    requestSignupCode: build.mutation<SignupRequestCodeResponse, SignupRequestCodeRequest>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_REGISTER_REQUEST_CODE,
        method: 'POST',
        body,
      })),
    }),

    verifySignupCode: build.mutation<{ ok: true }, { signupToken: string; code: string }>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_REGISTER_VERIFY_CODE,
        method: 'POST',
        body,
      })),
    }),

    resendSignupCode: build.mutation<{ resendAfterSec: number }, { signupToken: string }>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_REGISTER_RESEND,
        method: 'POST',
        body,
      })),
    }),

    completeSignup: build.mutation<SessionDto, SignupCompleteRequest>({
      queryFn: serverQuery((body) => ({
        url: ENDPOINTS.AUTH_REGISTER_COMPLETE,
        method: 'POST',
        body,
      })),
      invalidatesTags: ['Auth'],
    }),
  }),
});

// رفتار سراسری هر endpoint. خطاهای ورود را خود صفحه به شکل `.alert` نشان می‌دهد،
// پس toast خطا برایشان خاموش است (W02).
registerApiBehavior({
  login: {
    showGlobalLoading: true,
    loadingMessage: 'در حال بررسی اطلاعات…',
    showErrorToast: false,
  },
  verifyOtp: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ورود…',
    showErrorToast: false,
  },
  resendOtp: {
    showSuccessToast: true,
    successMessage: 'کد تازه پیامک شد.',
  },
  forgotPassword: {
    showGlobalLoading: true,
    showErrorToast: false,
  },
  refreshSession: { showErrorToast: false },
  verifyResetCode: { showErrorToast: false },
  resendResetCode: { showSuccessToast: true, successMessage: 'کد تازه پیامک شد.' },
  requestStepUp: { showErrorToast: false },
  logout: { showErrorToast: false },
  resetPassword: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ذخیرهٔ رمز تازه…',
    showErrorToast: false,
  },
  requestSignupCode: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ارسال کد تأیید…',
    showErrorToast: false,
  },
  verifySignupCode: { showErrorToast: false },
  resendSignupCode: { showSuccessToast: true, successMessage: 'کد تازه پیامک شد.' },
  completeSignup: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ساخت سازمان و ورود…',
    showErrorToast: false,
  },
});

export const {
  useLoginMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyResetCodeMutation,
  useResendResetCodeMutation,
  useRequestSignupCodeMutation,
  useVerifySignupCodeMutation,
  useResendSignupCodeMutation,
  useCompleteSignupMutation,
  useRequestStepUpMutation,
  useRefreshSessionMutation,
  useLogoutMutation,
} = authApi;
