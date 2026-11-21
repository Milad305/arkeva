import { cn } from '@/shared/utils/cn';

export type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<BrandMarkSize, string> = { sm: '', md: '', lg: 'lg', xl: 'xl' };
const GLYPH_SIZE: Record<BrandMarkSize, number> = { sm: 16, md: 18, lg: 18, xl: 28 };

export interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
}

/**
 * نشان برند — `.mark` در kit.css، با نقطهٔ نارنجی گوشه (`<i>`).
 * نقطهٔ accent بخشی از هویت است و در هیچ صفحه‌ای جا نمی‌افتد.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <span className={cn('mark', SIZE_CLASS[size], className)}>
      <svg
        width={GLYPH_SIZE[size]}
        height={GLYPH_SIZE[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 21V5a2 2 0 0 1 2-2h7l5 5v13" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
      <i />
    </span>
  );
}
