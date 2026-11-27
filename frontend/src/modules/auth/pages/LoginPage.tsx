import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { useAppDispatch } from '@/app/store/hooks';
import { setCredentials } from '@/app/store/authSlice';
import { toCredentials } from '@/app/store/sessionCredentials';
import { AuthShell } from '@/shared/components/layout/AuthShell';
import { AppButton } from '@/shared/components/ui/AppButton';
import { FormField } from '@/shared/components/ui/FormField';
import { TextInput } from '@/shared/components/ui/TextInput';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Box } from '@/shared/components/ui/Card';
import { getApiError, getErrorDetailNumber } from '@/shared/utils/apiError';
import { expiredResetToken, type ResetLocationState } from '../services/passwordExpiry';
import { toFaDigits } from '@/shared/utils/num';
import { LOCKOUT, loginSchema, type LoginForm } from '../services/schemas';
import { useLoginMutation } from '../api/authApi';

/**
 * W01 ورود — و W02 که حالت خطای همین صفحه است، نه صفحهٔ جدا.
 *
 * قاعدهٔ F01 ۵.۱: پیام خطا نمی‌گوید کدام بخش اشتباه است؛ فقط تعداد تلاش باقی‌مانده
 * را می‌گوید و بعد از ۵ تلاش، حساب ۱۵ دقیقه قفل می‌شود.
 */
export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { error, isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: import.meta.env.DEV ? '09123454321' : '',
      password: import.meta.env.DEV ? 'Projeyar1404' : '',
      rememberIdentifier: true,
    },
    mode: 'onBlur',
  });

  const apiError = getApiError(error);
  const remainingAttempts = getErrorDetailNumber(error, 'remainingAttempts');
  const isLocked = apiError?.code === 'ACCOUNT_LOCKED';

  async function onSubmit(values: LoginForm) {
    // خطا را خود صفحه از وضعیت mutation نشان می‌دهد؛ اینجا فقط جریان متوقف می‌شود
    let expiredToken: string | null = null;
    const result = await login(values)
      .unwrap()
      .catch((cause: unknown) => {
        expiredToken = expiredResetToken(cause);
        return null;
      });
    if (expiredToken) {
      // رمز منقضی: مستقیم به «رمز تازه» (W04 مرحلهٔ ۳)
      navigate(ROUTES.resetPassword, {
        state: { resetToken: expiredToken, expired: true } satisfies ResetLocationState,
      });
      return;
    }
    if (!result) return;

    if (result.outcome === 'otp_required') {
      navigate(ROUTES.otp, {
        state: {
          otpToken: result.otpToken,
          maskedMobile: result.maskedMobile,
          resendAfterSec: result.resendAfterSec,
        },
      });
      return;
    }

    if (result.outcome === 'success') {
      dispatch(setCredentials(toCredentials(result.session)));
      const from = (location.state as { from?: string } | null)?.from;
      const target =
        from && from !== ROUTES.login && from !== '/'
          ? from
          : (result.session.user.preferences.startPage ?? ROUTES.dashboard);
      navigate(target, { replace: true });
    }
  }

  return (
    <AuthShell>
      <form className="col g16" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="col g8" style={{ marginBottom: apiError ? 4 : 12 }}>
          <span className="eyebrow">پنل وب · پروژه‌یار</span>
          <h1 className="h-display">ورود به سیستم</h1>
          <p className="t-14 tx6 lh">
            حساب کاربری خود را وارد کنید تا به پروژه‌هایتان دسترسی داشته باشید.
          </p>
        </div>

        {apiError && (
          <div className="alert err" aria-live="assertive">
            <span style={{ display: 'inline-flex', marginTop: 2 }}>
              <Icon name="circle-alert" size={16} />
            </span>
            <div className="col g2">
              <strong>{apiError.message}</strong>
              {remainingAttempts !== null && (
                <span className="t-12">
                  {`${toFaDigits(remainingAttempts)} تلاش دیگر تا قفل موقت حساب باقی مانده است. اگر رمز را فراموش کرده‌اید، از «فراموشی رمز عبور» استفاده کنید.`}
                </span>
              )}
            </div>
          </div>
        )}

        <FormField label="نام کاربری یا شماره موبایل" error={errors.identifier?.message}>
          <TextInput
            {...register('identifier')}
            size="lg"
            autoComplete="username"
            placeholder="مثلاً a.karimi یا ۰۹۱۲۳۴۵۶۷۸۹"
            // صفحهٔ ورود تک‌هدفه است؛ فوکوس خودکار انتظار کاربر را برآورده می‌کند
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </FormField>

        <FormField label="رمز عبور" error={errors.password?.message}>
          <TextInput
            {...register('password')}
            size="lg"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••"
            invalid={Boolean(apiError)}
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

        <div className="row between wrap g8">
          <Checkbox label="مرا به خاطر بسپار" {...register('rememberIdentifier')} />
          <Link className="link" to={ROUTES.resetPassword} style={{ fontSize: 13 }}>
            فراموشی رمز عبور؟
          </Link>
        </div>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={isLoading}
          trailingIcon="arrow-left"
          style={{ marginTop: 4 }}
        >
          {isLocked ? 'تلاش دوباره' : 'ورود به سیستم'}
        </AppButton>

        {isLocked && <LockoutNotice />}

        <Box className="row between wrap g8" style={{ alignItems: 'center' }}>
          <span className="t-13 tx6">هنوز در پروژه‌یار سازمان ندارید؟</span>
          <Link className="link fw6" to={ROUTES.register} style={{ fontSize: 13 }}>
            ثبت‌نام سازمان جدید
          </Link>
        </Box>
      </form>
    </AuthShell>
  );
}

/** جعبهٔ توضیح قفل موقت — W02. */
function LockoutNotice() {
  return (
    <Box className="col g8" style={{ marginTop: 8 }}>
      <div className="row g8 t-13 fw6 tx8">
        <Icon name="lock" size={14} />
        {`بعد از ${toFaDigits(LOCKOUT.maxAttempts)} تلاش ناموفق`}
      </div>
      <p className="t-12 tx6 lh">
        {`حساب به مدت ${toFaDigits(LOCKOUT.lockMinutes)} دقیقه قفل می‌شود و یک پیامک هشدار برای صاحب حساب ارسال می‌شود. مدیر سازمان می‌تواند قفل را زودتر باز کند.`}
      </p>
      <div className="row g8 t-12 tx6 wrap">
        <Badge tone="wrn" size="sm">
          قفل موقت
        </Badge>
        باز شدن خودکار پس از {toFaDigits(LOCKOUT.lockMinutes)} دقیقه —
        <Link className="link" to={ROUTES.help}>
          تماس با پشتیبانی
        </Link>
      </div>
    </Box>
  );
}
