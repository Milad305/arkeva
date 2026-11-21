import { cn } from '@/shared/utils/cn';

export interface KbdProps {
  children: string;
  /** روی پس‌زمینهٔ تیره (داخل دکمهٔ primary) — مطابق W20. */
  onDark?: boolean;
  className?: string;
}

/** کلید میانبر — `.kbd` در kit.css. همیشه LTR و مونواسپیس. */
export function Kbd({ children, onDark, className }: KbdProps) {
  return (
    <span
      className={cn('kbd', className)}
      style={
        onDark
          ? { background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.4)' }
          : undefined
      }
    >
      {children}
    </span>
  );
}
