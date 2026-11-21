import { cn } from '@/shared/utils/cn';

export interface SpinnerProps {
  size?: number;
  /** روی پس‌زمینهٔ تیره (دکمهٔ primary) یا روشن (دکمهٔ outline و متن). */
  on?: 'dark' | 'light';
  className?: string;
}

/**
 * اسپینر — عیناً همان SVG بوم (W46).
 * انیمیشن از کلاس `pj-spin` در app.css می‌آید و با prefers-reduced-motion متوقف می‌شود.
 */
export function Spinner({ size = 16, on = 'light', className }: SpinnerProps) {
  const track = on === 'dark' ? 'rgba(255,255,255,0.35)' : '#E4E4E7';
  const head = on === 'dark' ? '#FFFFFF' : 'currentColor';

  return (
    <svg
      className={cn('pj-spin', className)}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="7" stroke={track} strokeWidth="2.4" fill="none" />
      <path
        d="M9 2a7 7 0 0 1 7 7"
        stroke={head}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
