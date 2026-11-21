import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';

/** هشت رنگ آواتار kit.css (`.a1` تا `.a8`). */
export type AvatarTone = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8';

const AVATAR_TONES: AvatarTone[] = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];

/** رنگ آواتار از API رشته است؛ اگر یکی از هشت رنگ kit نبود، رنگ پایدار از نام ساخته می‌شود. */
export function isAvatarTone(value: string | undefined): value is AvatarTone {
  return value !== undefined && (AVATAR_TONES as string[]).includes(value);
}

export type AvatarSize = 's' | 'md' | 'm' | 'l' | 'xl';

const SIZE_CLASS: Record<AvatarSize, string> = {
  s: 's',
  md: '',
  m: 'm',
  l: 'l',
  xl: 'xl',
};

/**
 * رنگ پایدار بر اساس نام — تا یک شخص همیشه یک رنگ بگیرد.
 * اگر داده `tone` صریح داشت (مثل آرت‌بوردهای بوم)، آن اولویت دارد.
 */
export function avatarToneFor(name: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1_000_003;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

/** حرف اول نام و نام خانوادگی با نقطه: «مهندس احمدی» → «م.ا» */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}.${parts[parts.length - 1]![0]}`;
}

/** واژه‌هایی که در نام سازمان معنا ندارند و در حروف اختصار نمی‌آیند. */
const ORG_PREFIXES = new Set(['شرکت', 'مؤسسه', 'موسسه', 'گروه', 'سازمان', 'بنیاد', 'هلدینگ']);

/**
 * حروف اختصار سازمان: «شرکت آبادگران ایران» → «ا.آ»
 * واژهٔ نوع سازمان کنار گذاشته می‌شود، چون در همهٔ شرکت‌ها تکرار می‌شود
 * و حروف اختصار را بی‌خاصیت می‌کند.
 */
export function orgInitialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part && !ORG_PREFIXES.has(part));

  if (parts.length === 0) return initialsFor(name);
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[parts.length - 1]![0]}.${parts[0]![0]}`;
}

export interface AvatarProps {
  /** نام کامل — برای برچسب و رنگ پایدار. */
  name: string;
  /** حرف‌های نمایشی؛ اگر نیاید از نام ساخته می‌شود. */
  initials?: string;
  /** یکی از `a1`…`a8`؛ مقدار ناشناخته نادیده گرفته می‌شود. */
  tone?: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, initials, tone, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn('av', SIZE_CLASS[size], isAvatarTone(tone) ? tone : avatarToneFor(name), className)}
      title={name}
    >
      {initials ?? initialsFor(name)}
    </span>
  );
}

export interface AvatarGroupProps {
  people: Array<{ name: string; initials?: string; tone?: string }>;
  /** بیش از این تعداد به شکل «+N» جمع می‌شود. */
  max?: number;
  /**
   * شمار کل افراد، وقتی API فقط چند نفر اول را فرستاده است
   * (مثل `memberPreview` + `memberCount` در فهرست پروژه‌ها).
   */
  total?: number;
  size?: AvatarSize;
  className?: string;
}

/** `.avs` — آواتارهای روی‌هم‌افتاده با حاشیهٔ سفید. */
export function AvatarGroup({ people, max = 4, total, size = 's', className }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const overflow = Math.max(0, (total ?? people.length) - shown.length);
  const hiddenNames = people.slice(max).map((person) => person.name);

  return (
    <span className={cn('avs', className)}>
      {shown.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          initials={person.initials}
          tone={person.tone}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn('av', SIZE_CLASS[size], 'a7')}
          title={
            hiddenNames.length > 0
              ? hiddenNames.join('، ')
              : `${toFaDigits(overflow)} عضو دیگر`
          }
        >
          {`+${toFaDigits(overflow)}`}
        </span>
      )}
    </span>
  );
}
