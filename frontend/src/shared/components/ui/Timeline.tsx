import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import type { Tone } from '@/shared/types/tone';
import { Icon, type IconName } from './Icon';

export interface TimelineEntry {
  id: string;
  icon: IconName;
  tone?: Tone;
  /** متن رویداد؛ می‌تواند `<strong>` و نام پروژه داشته باشد. */
  text: ReactNode;
  /** زمان رویداد، از قبل قالب‌بندی‌شده. */
  time: string;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

/**
 * خط زمان فعالیت‌ها — `.feed` / `.fi` / `.fd` از kit.css.
 * خط عمودی اتصال‌دهنده با `::before` می‌آید و روی آخرین آیتم خودکار قطع می‌شود.
 */
export function Timeline({ entries, className }: TimelineProps) {
  return (
    <ul className={cn('feed', className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="fi">
          <span className={cn('fd', entry.tone)}>
            <Icon name={entry.icon} size={11} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="ft">{entry.text}</p>
            <p className="fm">{entry.time}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
