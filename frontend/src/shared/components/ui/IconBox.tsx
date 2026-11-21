import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { Tone } from '@/shared/types/tone';
import { Icon, type IconName } from './Icon';

export type IconBoxSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<IconBoxSize, string> = { sm: 'sm', md: '', lg: 'lg', xl: 'xl' };
const ICON_SIZE: Record<IconBoxSize, number> = { sm: 13, md: 15, lg: 18, xl: 22 };

export interface IconBoxProps {
  icon?: IconName;
  tone?: Tone;
  size?: IconBoxSize;
  className?: string;
  /** جای آیکن می‌تواند متن کوتاه بنشیند — مثل امتیاز ریسک در W05. */
  children?: ReactNode;
}

/** مربع رنگی آیکن‌دار — `.icb` در kit.css. سرِ کارت‌های KPI و ردیف‌های هشدار. */
export function IconBox({ icon, tone = 'neu', size = 'md', className, children }: IconBoxProps) {
  return (
    <span className={cn('icb', tone, SIZE_CLASS[size], className)}>
      {children ?? (icon && <Icon name={icon} size={ICON_SIZE[size]} />)}
    </span>
  );
}
