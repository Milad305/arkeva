import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { AuthFooter, AuthShell, BackToLogin } from '@/shared/components/layout/AuthShell';
import { AppButton } from '@/shared/components/ui/AppButton';
import { FormField } from '@/shared/components/ui/FormField';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Stepper } from '@/shared/components/ui/Stepper';
import { TextInput } from '@/shared/components/ui/TextInput';
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
  signupCompleteSchema,
  signupMobileSchema,
  type SignupCompleteForm,
  type SignupMobileForm,
} from '../services/schemas';
import {
  useCompleteSignupMutation,
  useRequestSignupCodeMutation,
  useResendSignupCodeMutation,
  useVerifySignupCodeMutation,
} from '../api/authApi';

const STEPS = [
  { key: 'mobile', label: 'شمارهٔ موبایل' },
  { key: 'code', label: 'کد تأیید' },
  { key: 'organization', label: 'مشخصات سازمان' },
];

/** ثبت‌نام خودکار سازمان جدید در سه مرحله و ورود مستقیم مدیر سازمان به پنل. */
export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [signupToken, setSignupToken] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [resendAfterSec, setResendAfterSec] = useState(OTP_RESEND_AFTER_SECONDS);
  const [code, setCode] = useState('');

  return (
    <AuthShell formWidth={420} headerAside={<BackToLogin />} footer={<AuthFooter compact />}>
      <div className="col g16">
        <div className="col g8">
          <span className="eyebrow">شروع کار با پروژه‌یار</span>
          <h1 className="h-display">{step === 3 ? 'مشخصات سازمان خود را وارد کنید' : 'ثبت‌نام سازمان جدید'}</h1>
          <p className="t-14 tx6 lh">
            {step === 1 && 'شمارهٔ موبایل خود را وارد کنید تا کد تأیید پیامکی برایتان ارسال شود.'}
            {step === 2 && `کد ${toFaDigits(OTP_LENGTH)} رقمی به ${maskedMobile} پیامک شد.`}
            {step === 3 && 'شمارهٔ موبایل تأیید شد. نام شرکت و رمز عبور حساب مدیر سازمان را تعیین کنید.'}
          </p>
        </div>

        <Stepper steps={STEPS} current={step} />

        {step === 1 && (
          <MobileStep
            onDone={(token, masked, resendSec) => {
              setSignupToken(token);
              setMaskedMobile(masked);
              setResendAfterSec(resendSec);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <CodeStep
            signupToken={signupToken}
            maskedMobile={maskedMobile}
            initialResendSec={resendAfterSec}
            onDone={(verifiedCode) => {
              setCode(verifiedCode);
              setStep(3);
            }}
          />
        )}

        {step === 3 && <OrganizationStep signupToken={signupToken} code={code} />}
      </div>
    </AuthShell>
  );
}

function MobileStep({
  onDone,
}: {
  onDone: (signupToken: string, maskedMobile: string, resendAfterSec: number) => void;
}) {
  const [requestCode, { error, isLoading }] = useRequestSignupCodeMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupMobileForm>({
    resolver: zodResolver(signupMobileSchema),
    defaultValues: { mobile: '' },
    mode: 'onBlur',
  });

  const apiError = getApiError(error);
  const mobileTaken = apiError?.code === 'SIGNUP_MOBILE_TAKEN';

  return (
    <form
      className="col g16"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await requestCode(values)
          .unwrap()
          .catch(() => null);
        if (result) onDone(result.signupToken, result.maskedMobile, result.resendAfterSec);
      })}
    >
      {apiError && (
        <div className="alert err" role="alert">
          <span style={{ display: 'inline-flex', marginTop: 2 }}>
            <Icon name="circle-alert" size={16} />
          </span>
          <div className="col g4">
            <strong>{apiError.message}</strong>
            {mobileTaken && (
              <div className="row g12 wrap t-12">
                <Link className="link fw6" to={ROUTES.login}>
                  رفتن به صفحهٔ ورود
                </Link>
                <Link className="link" to={ROUTES.resetPassword}>
                  فراموشی رمز عبور
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <FormField
        label="شمارهٔ موبایل مدیر سازمان"
        error={errors.mobile?.message}
        hint="ورود دومرحله‌ای و اعلان‌های امنیتی حساب روی همین شماره فعال می‌شود."
      >
        <TextInput
          {...register('mobile')}
          size="lg"
          ltr
          icon="smartphone"
          inputMode="numeric"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          autoComplete="tel"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </FormField>

      <AppButton type="submit" variant="primary" size="lg" block loading={isLoading} trailingIcon="arrow-left">
        ارسال کد تأیید
      </AppButton>

      <p className="t-12 tx6" style={{ textAlign: 'center' }}>
        {'همکارانتان شما را به پروژه‌ای دعوت کرده‌اند؟ از '}
        <Link className="link fw6" to={ROUTES.resetPassword}>
          ساخت رمز برای دعوت‌شده‌ها
        </Link>
        {' وارد شوید.'}
      </p>
    </form>
  );
}

function CodeStep({
  signupToken,
  maskedMobile,
  initialResendSec,
  onDone,
}: {
  signupToken: string;
  maskedMobile: string;
  initialResendSec: number;
  onDone: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const countdown = useCountdown(initialResendSec);
  const [verify, verifyState] = useVerifySignupCodeMutation();
  const [resend, { isLoading: isResending }] = useResendSignupCodeMutation();
  const apiError = getApiError(verifyState.error);

  async function submit(value: string) {
    if (value.length !== OTP_LENGTH) return;
    const ok = await verify({ signupToken, code: value })
      .unwrap()
      .catch(() => null);
    if (ok) onDone(value);
  }

  async function handleResend() {
    const result = await resend({ signupToken })
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
          invalid={Boolean(apiError)}
          disabled={verifyState.isLoading}
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
        <AppButton variant="ghost" size="sm" disabled={!countdown.isFinished} loading={isResending} onClick={() => void handleResend()}>
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
        تأیید کد و ادامه
      </AppButton>
    </form>
  );
}

function OrganizationStep({ signupToken, code }: { signupToken: string; code: string }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [completeSignup, { error, isLoading }] = useCompleteSignupMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupCompleteForm>({
    resolver: zodResolver(signupCompleteSchema),
    defaultValues: { organizationName: '', fullName: '', email: '', password: '', repeatPassword: '' },
    mode: 'onChange',
  });

  const password = watch('password');
  const repeatPassword = watch('repeatPassword');
  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const apiError = getApiError(error);

  return (
    <form
      className="col g16"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const session = await completeSignup({
          signupToken,
          code,
          organizationName: values.organizationName,
          fullName: values.fullName,
          email: values.email.trim() || null,
          password: values.password,
        })
          .unwrap()
          .catch(() => null);
        if (!session) return;
        dispatch(setCredentials(toCredentials(session)));
        navigate(ROUTES.projects, { replace: true });
      })}
    >
      {apiError && (
        <div className="alert err" role="alert">
          <span style={{ display: 'inline-flex', marginTop: 2 }}>
            <Icon name="circle-alert" size={16} />
          </span>
          <strong>{apiError.message}</strong>
        </div>
      )}

      <FormField label="نام شرکت یا سازمان" error={errors.organizationName?.message}>
        <TextInput
          {...register('organizationName')}
          size="lg"
          placeholder="مثلاً شرکت مهندسی و ساختمانی آرمان"
          autoComplete="organization"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </FormField>

      <FormField label="نام و نام خانوادگی شما (مدیر سازمان)" error={errors.fullName?.message}>
        <TextInput {...register('fullName')} size="lg" placeholder="مثلاً علی رضایی" autoComplete="name" />
      </FormField>

      <FormField label="ایمیل کاری (اختیاری)" error={errors.email?.message}>
        <TextInput {...register('email')} size="lg" ltr type="email" placeholder="info@company.ir" autoComplete="email" />
      </FormField>

      <FormField label="رمز عبور" error={errors.password?.message}>
        <TextInput
          {...register('password')}
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
        <PasswordStrengthHint value={password} />
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

      <AppButton type="submit" variant="primary" size="lg" block loading={isLoading} trailingIcon="arrow-left">
        ساخت سازمان و ورود به پنل
      </AppButton>
    </form>
  );
}
