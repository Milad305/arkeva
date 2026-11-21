import { useEffect, useState } from 'react';

import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { FormField } from '@/shared/components/ui/FormField';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import { PasswordStrengthHint } from '@/modules/auth/components/PasswordStrengthHint';
import { useRequestStepUpMutation } from '@/modules/auth/api/authApi';
import { passwordSchema } from '@/modules/auth/services/schemas';
import {
  useChangePasswordMutation,
  useDisable2faMutation,
  useEnable2faMutation,
  useRegenerateBackupCodesMutation,
} from '../api/accountApi';

/** تغییر رمز (F01 ۵.۱، AC-AC-10): سیاست رمز، ۵ رمز اخیر در سرور، خروج از دستگاه‌های دیگر پیش‌فرض روشن. */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [change, state] = useChangePasswordMutation();
  const policy = passwordSchema.safeParse(next);
  const errors = {
    current: current ? undefined : 'رمز فعلی را بنویسید',
    next: policy.success ? (next === current ? 'رمز تازه با رمز فعلی یکی است' : undefined) : policy.error.issues[0]?.message,
    repeat: repeat === next ? undefined : 'دو رمز یکسان نیست',
  };

  async function submit() {
    setTouched(true);
    setError(null);
    if (Object.values(errors).some(Boolean)) return;
    try {
      const result = await change({ current, next, signOutOthers }).unwrap();
      toast.success(result.signedOut > 0 ? `رمز عوض شد و از ${toFaDigits(result.signedOut)} دستگاه دیگر خارج شدید.` : 'رمز عبور عوض شد.');
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const eye = (
    <IconButton icon={show ? 'eye-off' : 'eye'} label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} size="sm" onClick={() => setShow((value) => !value)} />
  );
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="تغییر رمز عبور"
      description="رمز تازه نباید با ۵ رمز اخیر شما یکی باشد."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="key-round" loading={state.isLoading} onClick={() => void submit()}>
            تغییر رمز
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <FormField label="رمز فعلی" required error={touched ? errors.current : undefined}>
          <TextInput type={show ? 'text' : 'password'} autoComplete="current-password" ltr value={current} onChange={(event) => setCurrent(event.target.value)} trailing={eye} />
        </FormField>
        <FormField label="رمز تازه" required error={touched ? errors.next : undefined}>
          <TextInput type={show ? 'text' : 'password'} autoComplete="new-password" ltr value={next} onChange={(event) => setNext(event.target.value)} />
        </FormField>
        <div className="col g8">
          <PasswordStrengthHint value={next} />
        </div>
        <FormField label="تکرار رمز تازه" required error={touched ? errors.repeat : undefined} success={repeat && repeat === next ? 'دو رمز یکسان است.' : undefined}>
          <TextInput type={show ? 'text' : 'password'} autoComplete="new-password" ltr value={repeat} onChange={(event) => setRepeat(event.target.value)} />
        </FormField>
        <Checkbox checked={signOutOthers} onChange={(event) => setSignOutOthers(event.target.checked)} label="خروج از همهٔ دستگاه‌های دیگر" />
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/** نمایش یک‌بارهٔ ۸ کد پشتیبان — پس از بستن دوباره دیده نمی‌شوند. */
export function BackupCodesDialog({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const text = codes.join('\n');
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="کدهای پشتیبان"
      description="هر کد یک بار به جای کد پیامکی کار می‌کند. آن‌ها را جای امنی نگه دارید؛ پس از بستن این پنجره دوباره نشان داده نمی‌شوند."
      footer={
        <>
          <AppButton
            variant="outline"
            icon="copy"
            onClick={() =>
              void navigator.clipboard?.writeText(text).then(
                () => toast.success('کدها کپی شد.'),
                () => toast.error('کپی نشد؛ کدها را دستی یادداشت کنید.'),
              )
            }
          >
            کپی کدها
          </AppButton>
          <AppButton variant="primary" onClick={onClose}>
            یادداشت کردم
          </AppButton>
        </>
      }
    >
      <div className="grid c2" style={{ gap: 8 }}>
        {codes.map((code) => (
          <span key={code} className="mono box" dir="ltr" style={{ padding: '8px 12px', textAlign: 'center', fontSize: 14 }}>
            {code}
          </span>
        ))}
      </div>
    </Modal>
  );
}

/**
 * روشن کردن ۲FA با کد پیامکی، یا خاموش کردن با رمز (فقط وقتی سازمان اجباری نکرده). کد روشن کردن همان
 * «تأیید دوباره» است (`POST /auth/step-up`، هدف account.enable_2fa) و با باز شدن پنجره پیامک می‌شود.
 */
export function TwoFactorDialog({
  mode,
  userId,
  maskedMobile,
  onClose,
}: {
  mode: 'enable' | 'disable';
  userId: string;
  maskedMobile: string;
  onClose: (codes?: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enable, enableState] = useEnable2faMutation();
  const [disable, disableState] = useDisable2faMutation();
  const [requestCode, codeState] = useRequestStepUpMutation();
  const enabling = mode === 'enable';

  async function sendCode() {
    setError(null);
    try {
      await requestCode({ purpose: 'account.enable_2fa', subjectId: userId }).unwrap();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  useEffect(() => {
    if (enabling) void sendCode();
    // فقط یک بار با باز شدن پنجره
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setError(null);
    try {
      if (enabling) {
        const result = await enable(toEnDigits(value)).unwrap();
        toast.success('ورود دومرحله‌ای روشن شد.');
        onClose(result.backupCodes);
      } else {
        await disable(value).unwrap();
        toast.success('ورود دومرحله‌ای خاموش شد.');
        onClose();
      }
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => onClose()}
      size="sm"
      title={enabling ? 'روشن کردن ورود دومرحله‌ای' : 'خاموش کردن ورود دومرحله‌ای'}
      description={enabling ? `کد ۶ رقمی پیامک‌شده به ${maskedMobile} را بنویسید. پس از تأیید ۸ کد پشتیبان می‌گیرید.` : 'ورود فقط با رمز عبور، امنیت حساب را کم می‌کند. برای ادامه رمز عبور را بنویسید.'}
      footer={
        <>
          <AppButton variant="ghost" onClick={() => onClose()}>
            انصراف
          </AppButton>
          <AppButton
            variant={enabling ? 'primary' : 'danger'}
            icon={enabling ? 'shield-check' : 'shield-x'}
            loading={enableState.isLoading || disableState.isLoading}
            disabled={!value}
            onClick={() => void submit()}
          >
            {enabling ? 'تأیید و روشن کردن' : 'خاموش کردن'}
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <FormField label={enabling ? 'کد پیامکی' : 'رمز عبور'} required>
          <TextInput
            ltr
            type={enabling ? 'text' : 'password'}
            inputMode={enabling ? 'numeric' : undefined}
            autoComplete={enabling ? 'one-time-code' : 'current-password'}
            maxLength={enabling ? 6 : undefined}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </FormField>
        {enabling && (
          <div className="row between g8">
            <span className="hint">کد ۵ دقیقه اعتبار دارد.</span>
            <AppButton variant="ghost" size="sm" loading={codeState.isLoading} onClick={() => void sendCode()}>
              ارسال دوبارهٔ کد
            </AppButton>
          </div>
        )}
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/** ساخت کدهای پشتیبان تازه — کدهای قبلی باطل می‌شوند. */
export function useRegenerateBackupCodes(onCodes: (codes: string[]) => void) {
  const [regenerate, state] = useRegenerateBackupCodesMutation();
  return {
    loading: state.isLoading,
    run: async () => {
      try {
        onCodes((await regenerate().unwrap()).backupCodes);
      } catch (cause) {
        toast.error(getApiErrorMessage(cause));
      }
    },
  };
}
