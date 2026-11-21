import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { AuthShell, AuthFooter, BackToLogin } from '@/shared/components/layout/AuthShell';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Box } from '@/shared/components/ui/Card';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { useAppDispatch } from '@/app/store/hooks';
import { setCredentials } from '@/app/store/authSlice';
import { toCredentials } from '@/app/store/sessionCredentials';
import { useCountdown } from '@/shared/hooks/useCountdown';
import { getApiError } from '@/shared/utils/apiError';
import { expiredResetToken, type ResetLocationState } from '../services/passwordExpiry';
import { toFaDigits } from '@/shared/utils/num';
import { OtpInput } from '../components/OtpInput';
import { OTP_LENGTH } from '../services/schemas';
import { useResendOtpMutation, useVerifyOtpMutation } from '../api/authApi';

interface OtpLocationState {
  otpToken: string;
  maskedMobile: string;
  resendAfterSec: number;
}

/** W03 — کد تأیید ورود دومرحله‌ای. */
export default function OtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);

  const [verifyOtp, { error, isLoading }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const state = location.state as OtpLocationState | null;
  const countdown = useCountdown(state?.resendAfterSec ?? 60);

  // رسیدن مستقیم به این مسیر بدون گذر از صفحهٔ ورود
  if (!state?.otpToken) {
    return <Navigate to={ROUTES.login} replace />;
  }

  const apiError = getApiError(error);

  async function submit(value: string) {
    if (value.length !== OTP_LENGTH || !state) return;

    const session = await verifyOtp({
      otpToken: state.otpToken,
      code: value,
      trustDevice,
    })
      .unwrap()
      .catch((cause: unknown) => {
        const resetToken = expiredResetToken(cause);
        if (resetToken) navigate(ROUTES.resetPassword, { replace: true, state: { resetToken, expired: true } satisfies ResetLocationState });
        return null;
      });
    if (!session) return;

    dispatch(setCredentials(toCredentials(session)));

    // صفحهٔ شروع ترجیحی کاربر (W32، F01 ۵.۷)
    navigate(session.user.preferences.startPage ?? ROUTES.projects, { replace: true });
  }

  async function handleResend() {
    if (!state) return;
    const result = await resendOtp({ otpToken: state.otpToken })
      .unwrap()
      .catch(() => null);
    if (!result) return;
    countdown.restart(result.resendAfterSec);
    setCode('');
  }

  return (
    <AuthShell footer={<AuthFooter compact />}>
      <form
        className="col"
        style={{ gap: 18 }}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(code);
        }}
        noValidate
      >
        <div style={{ alignSelf: 'flex-start' }}>
          <BackToLogin />
        </div>

        <div className="col g8">
          <span className="eyebrow">مرحلهٔ ۲ از ۲ · احراز هویت دومرحله‌ای</span>
          <h1 className="h-display">کد تأیید را وارد کنید</h1>
          <p className="t-14 tx6 lh">
            {`کد ${toFaDigits(OTP_LENGTH)} رقمی به شمارهٔ `}
            <Badge tone="pri" icon="smartphone" mono style={{ fontSize: 12 }}>
              {state.maskedMobile}
            </Badge>
            {' پیامک شد.'}
          </p>
        </div>

        <div className="fg">
          <span className="lbl">{`کد ${toFaDigits(OTP_LENGTH)} رقمی`}</span>
          <OtpInput
            label={`کد ${toFaDigits(OTP_LENGTH)} رقمی`}
            value={code}
            onChange={setCode}
            onComplete={(value) => void submit(value)}
            invalid={Boolean(apiError)}
            disabled={isLoading}
          />
          {apiError && (
            <span className="hint err" role="alert">
              <Icon name="circle-alert" size={12} />
              {apiError.message}
            </span>
          )}
        </div>

        <div className="row between wrap g8 t-ui">
          <span className="tx6">
            {countdown.isFinished ? (
              'می‌توانید کد تازه بگیرید.'
            ) : (
              <>
                ارسال دوباره تا <span className="mono fw6 tx9">{countdown.formatted}</span>
              </>
            )}
          </span>
          <AppButton
            variant="ghost"
            size="sm"
            disabled={!countdown.isFinished}
            loading={isResending}
            onClick={() => void handleResend()}
          >
            ارسال دوبارهٔ کد
          </AppButton>
        </div>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={isLoading}
          disabled={code.length !== OTP_LENGTH}
          trailingIcon="arrow-left"
        >
          تأیید و ورود
        </AppButton>

        <Box className="row g10" style={{ alignItems: 'flex-start' }}>
          <IconBox icon="phone" tone="inf" size="sm" />
          <div className="col g2">
            <span className="t-13 fw6 tx8">پیامک نرسید؟</span>
            <span className="t-12 tx6 lh">
              {'بعد از پایان زمان، می‌توانید کد را با تماس صوتی دریافت کنید یا با '}
              <Link className="link" to={ROUTES.help}>
                پشتیبانی
              </Link>
              {' تماس بگیرید.'}
            </span>
          </div>
        </Box>

        <Checkbox
          label="این دستگاه را تا ۳۰ روز به خاطر بسپار"
          checked={trustDevice}
          onChange={(event) => setTrustDevice(event.target.checked)}
        />
      </form>
    </AuthShell>
  );
}
