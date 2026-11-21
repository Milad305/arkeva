import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { AuthShell, AuthFooter, BackToLogin } from '@/shared/components/layout/AuthShell';
import { AppButton } from '@/shared/components/ui/AppButton';
import { FormField } from '@/shared/components/ui/FormField';
import { TextInput } from '@/shared/components/ui/TextInput';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { Icon } from '@/shared/components/ui/Icon';
import { Stepper } from '@/shared/components/ui/Stepper';
import { useAppDispatch } from '@/app/store/hooks';
import { setCredentials } from '@/app/store/authSlice';
import { toCredentials } from '@/app/store/sessionCredentials';
import { useCountdown } from '@/shared/hooks/useCountdown';
import { getApiError } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import { OtpInput } from '../components/OtpInput';
import { PasswordStrengthHint } from '../components/PasswordStrengthHint';
import {
  OTP_LENGTH,
  OTP_RESEND_AFTER_SECONDS,
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordForm,
  type ResetPasswordForm,
} from '../services/schemas';
import {
  useForgotPasswordMutation,
  useResendResetCodeMutation,
  useResetPasswordMutation,
  useVerifyResetCodeMutation,
} from '../api/authApi';
import type { ResetLocationState } from '../services/passwordExpiry';

const STEPS = [
  { key: 'mobile', label: 'شمارهٔ موبایل' },
  { key: 'code', label: 'کد تأیید' },
  { key: 'password', label: 'رمز جدید' },
];

/**
 * W04 — بازیابی رمز عبور در سه مرحله.
 *
 * آرت‌بورد فقط مرحلهٔ سوم را نشان می‌دهد؛ دو مرحلهٔ اول طبق
 * `features/access-control.md` ۵.۱ و با همان سبک ساخته شده‌اند.
 */
export default function ResetPasswordPage() {
  // رمز منقضی از ورود با توکن آماده می‌آید و یک‌راست به مرحلهٔ ۳ می‌رود (تصمیم کاربر 1405/08/22)
  const expired = (useLocation().state as ResetLocationState | null) ?? null;
  const [step, setStep] = useState(expired ? 3 : 1);
  const [resetToken, setResetToken] = useState(expired?.resetToken ?? '');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [code, setCode] = useState<string | undefined>(undefined);

  return (
    <AuthShell formWidth={420} headerAside={<BackToLogin />} footer={<AuthFooter compact />}>
      <div className="col g16">
        <div className="col g8">
          <span className="eyebrow">بازیابی حساب</span>
          <h1 className="h-display">
            {step === 3 ? 'رمز عبور جدید بسازید' : 'بازیابی رمز عبور'}
          </h1>
          <p className="t-14 tx6 lh">
            {step === 1 && 'شمارهٔ موبایل حساب خود را وارد کنید تا کد تأیید برایتان بفرستیم.'}
            {step === 2 && `کد ${toFaDigits(OTP_LENGTH)} رقمی به ${maskedMobile} پیامک شد.`}
            {step === 3 &&
              (expired
                ? 'مدت اعتبار رمز شما تمام شده است. یک رمز تازه انتخاب کنید که پیش‌تر استفاده نکرده‌اید.'
                : 'شمارهٔ موبایل شما تأیید شد. یک رمز تازه انتخاب کنید که پیش‌تر استفاده نکرده‌اید.')}
          </p>
        </div>

        <Stepper steps={STEPS} current={step} />

        {step === 1 && (
          <MobileStep
            onDone={(token, masked) => {
              setResetToken(token);
              setMaskedMobile(masked);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <CodeStep
            resetToken={resetToken}
            maskedMobile={maskedMobile}
            onDone={(verified) => {
              setCode(verified);
              setStep(3);
            }}
          />
        )}

        {step === 3 && <PasswordStep resetToken={resetToken} code={code} />}
      </div>
    </AuthShell>
  );
}

function MobileStep({ onDone }: { onDone: (resetToken: string, maskedMobile: string) => void }) {
  const [forgotPassword, { error, isLoading }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { mobile: '' },
    mode: 'onBlur',
  });

  const apiError = getApiError(error);

  return (
    <form
      className="col g16"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await forgotPassword(values).unwrap();
        onDone(result.resetToken, result.maskedMobile);
      })}
    >
      <FormField
        label="شمارهٔ موبایل"
        error={errors.mobile?.message ?? apiError?.message}
        hint="همان شماره‌ای که با آن در پروژه‌یار ثبت شده‌اید."
      >
        <TextInput
          {...register('mobile')}
          size="lg"
          ltr
          icon="smartphone"
          inputMode="numeric"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          autoComplete="tel"
          // صفحهٔ ورود تک‌هدفه است؛ فوکوس خودکار انتظار کاربر را برآورده می‌کند
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </FormField>

      <AppButton type="submit" variant="primary" size="lg" block loading={isLoading} trailingIcon="arrow-left">
        ارسال کد تأیید
      </AppButton>
    </form>
  );
}

function CodeStep({ resetToken, maskedMobile, onDone }: { resetToken: string; maskedMobile: string; onDone: (code: string) => void }) {
  const [code, setCode] = useState('');
  const countdown = useCountdown(OTP_RESEND_AFTER_SECONDS);
  const [verify, verifyState] = useVerifyResetCodeMutation();
  const [resend] = useResendResetCodeMutation();
  const apiError = getApiError(verifyState.error);

  // کد در سرور سنجیده می‌شود (بی مصرف) تا خطا همین‌جا دیده شود؛ مرحلهٔ ۳ همان کد را دوباره می‌فرستد
  async function submit(value: string) {
    if (value.length !== OTP_LENGTH) return;
    const ok = await verify({ resetToken, code: value })
      .unwrap()
      .catch(() => null);
    if (ok) onDone(value);
  }

  async function handleResend() {
    const result = await resend({ resetToken })
      .unwrap()
      .catch(() => null);
    if (!result) return;
    countdown.restart(result.resendAfterSec);
    setCode('');
  }

  return (
    <form
      className="col g16"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
    >
      <div className="fg">
        <span className="lbl">{`کد ${toFaDigits(OTP_LENGTH)} رقمی`}</span>
        <OtpInput
          label={`کد پیامک‌شده به ${maskedMobile}`}
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
        />
        {apiError && <span className="hint err">{apiError.message}</span>}
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
        disabled={code.length !== OTP_LENGTH}
        loading={verifyState.isLoading}
        trailingIcon="arrow-left"
      >
        تأیید کد
      </AppButton>
    </form>
  );
}

function PasswordStep({ resetToken, code }: { resetToken: string; code: string | undefined }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [resetPassword, { error, isLoading }] = useResetPasswordMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', repeatPassword: '', revokeOtherSessions: true },
    mode: 'onChange',
  });

  const newPassword = watch('newPassword');
  const repeatPassword = watch('repeatPassword');
  const passwordsMatch = newPassword.length > 0 && newPassword === repeatPassword;
  const apiError = getApiError(error);

  return (
    <form
      className="col g16"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const session = await resetPassword({
          resetToken,
          code,
          newPassword: values.newPassword,
          revokeOtherSessions: values.revokeOtherSessions,
        }).unwrap();

        dispatch(setCredentials(toCredentials(session)));

        navigate(ROUTES.projects, { replace: true });
      })}
    >
      <FormField label="رمز عبور جدید" error={errors.newPassword?.message ?? apiError?.message}>
        <TextInput
          {...register('newPassword')}
          size="lg"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          trailing={
            <IconButton
              icon={showPassword ? 'eye-off' : 'eye'}
              label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              size="sm"
              onClick={() => setShowPassword((value) => !value)}
            />
          }
        />
      </FormField>

      <div className="col g8" style={{ marginTop: -8 }}>
        <PasswordStrengthHint value={newPassword} />
      </div>

      <FormField
        label="تکرار رمز عبور"
        error={errors.repeatPassword?.message}
        success={passwordsMatch ? 'دو رمز یکسان است.' : undefined}
      >
        <TextInput
          {...register('repeatPassword')}
          size="lg"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          valid={passwordsMatch}
          trailing={
            passwordsMatch ? (
              <span className="tx-ok" style={{ display: 'inline-flex' }}>
                <Icon name="check" size={16} />
              </span>
            ) : undefined
          }
        />
      </FormField>

      <Checkbox
        className="ai-s"
        label="خروج از همهٔ دستگاه‌های دیگر (اپ اندروید و مرورگرها)"
        {...register('revokeOtherSessions')}
      />

      <AppButton type="submit" variant="primary" size="lg" block loading={isLoading} icon="key-round">
        ذخیرهٔ رمز جدید و ورود
      </AppButton>
    </form>
  );
}
