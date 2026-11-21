import { Icon } from '@/shared/components/ui/Icon';
import {
  PASSWORD_STRENGTH_LABELS,
  PASSWORD_STRENGTH_METER,
  passwordRuleState,
  passwordStrength,
} from '../services/schemas';

/**
 * نوار چهارخانهٔ قدرت رمز و فهرست قواعد (F01 ۵.۱) — W04 و W32 مشترک.
 * فقط بازخورد نمایشی است؛ داوری نهایی و «۵ رمز اخیر» در سرور.
 */
export function PasswordStrengthHint({ value }: { value: string }) {
  const rules = passwordRuleState(value);
  const strength = passwordStrength(value);
  const meter = PASSWORD_STRENGTH_METER[strength];
  return (
    <>
      <div className="row g6">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="pbar thin" aria-hidden="true">
            <i style={{ width: value && index < meter.filled ? '100%' : '0%', background: meter.color }} />
          </span>
        ))}
        <span className="t-sm fw6 nowrap" style={{ color: value ? meter.color : undefined }}>
          {value ? PASSWORD_STRENGTH_LABELS[strength] : ''}
        </span>
      </div>
      <ul className="col g4" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        <PasswordRule met={rules.minLength}>حداقل ۸ نویسه</PasswordRule>
        <PasswordRule met={rules.digit}>دست‌کم یک عدد</PasswordRule>
        <PasswordRule met={rules.uppercase}>یک حرف بزرگ لاتین</PasswordRule>
        <PasswordRule met={rules.symbol}>
          {'یک نماد مثل '}
          <span className="mono">! @ #</span>
          {' (برای رمز قوی)'}
        </PasswordRule>
      </ul>
    </>
  );
}

function PasswordRule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={met ? 'hint ok' : 'hint'}>
      <Icon name={met ? 'check-circle-2' : 'circle'} size={13} />
      {children}
    </li>
  );
}
