import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { Tone } from '@/shared/types/tone';
import { Icon, type IconName } from './Icon';

export interface BadgeProps {
  tone?: Tone;
  /** `.bdg.sm` — ارتفاع ۱۸px برای داخل ردیف جدول و درخت. */
  size?: 'sm' | 'md';
  /** گوشهٔ کامل گرد (`.bdg.pill`). */
  pill?: boolean;
  /** نقطهٔ رنگی ابتدای نشان — برای وضعیت‌ها («فعال»، «در خطر»). */
  dot?: boolean;
  icon?: IconName;
  /** متن مونواسپیس LTR — برای کد پروژه و شمارهٔ گزارش. */
  mono?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

/**
 * نشان وضعیت — `.bdg` در kit.css.
 * tone پیش‌فرض `neu` است؛ همان خاکستری بی‌طرف بوم.
 */
export function Badge({
  tone = 'neu',
  size = 'md',
  pill,
  dot,
  icon,
  mono,
  title,
  className,
  style,
  children,
}: BadgeProps) {
  return (
    <span
      title={title}
      style={style}
      className={cn('bdg', tone, size === 'sm' && 'sm', pill && 'pill', mono && 'mono', className)}
    >
      {dot && <span className="dot" />}
      {icon && <Icon name={icon} size={size === 'sm' ? 10 : 11} />}
      {children}
    </span>
  );
}

export interface DeltaProps {
  tone?: Tone;
  /** جهت فلش: بالا برای افزایش، پایین برای کاهش. */
  direction?: 'up' | 'down' | 'none';
  className?: string;
  children: ReactNode;
}

/** تغییر نسبت به دورهٔ قبل — `.delta` در بوم، همیشه کنار یک عدد KPI. */
export function Delta({ tone = 'neu', direction = 'up', className, children }: DeltaProps) {
  return (
    <span className={cn('delta', tone, className)}>
      {direction !== 'none' && <Icon name={direction === 'up' ? 'arrow-up' : 'arrow-down'} size={11} />}
      {children}
    </span>
  );
}
