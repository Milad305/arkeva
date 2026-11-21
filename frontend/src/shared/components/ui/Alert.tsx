import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { AlertTone } from '@/shared/types/tone';
import { Icon, type IconName } from './Icon';

const TONE_ICON: Record<AlertTone, IconName> = {
  ok: 'check-circle-2',
  inf: 'info',
  wrn: 'alert-triangle',
  err: 'circle-alert',
};

const TONE_TEXT: Record<AlertTone, string> = {
  ok: 'tx-ok',
  inf: 'tx-inf',
  wrn: 'tx-wrn',
  err: 'tx-err',
};

export interface AlertProps {
  tone?: AlertTone;
  icon?: IconName;
  /** دکمه یا پیوند انتهای هشدار. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * هشدار درون‌صفحه‌ای — `.alert` در kit.css.
 * پیام‌ها بدون سرزنش کاربر نوشته می‌شوند و همیشه یک راه ادامه دارند (قاعدهٔ W46).
 */
export function Alert({ tone = 'inf', icon, action, className, children }: AlertProps) {
  return (
    <div
      className={cn('alert', tone, className)}
      role={tone === 'err' ? 'alert' : 'status'}
    >
      <span className={TONE_TEXT[tone]} style={{ display: 'inline-flex', marginTop: 2 }}>
        <Icon name={icon ?? TONE_ICON[tone]} size={16} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        {children}
      </div>
      {action}
    </div>
  );
}
