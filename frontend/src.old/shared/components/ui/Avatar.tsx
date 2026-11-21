import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش breadcrumb/avatar.

type AvatarColor = 'primary' | 'accent' | 'success' | 'info' | 'gray';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  color?: AvatarColor;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const colorClasses: Record<AvatarColor, string> = {
  primary: 'bg-primary-100 text-primary-700',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-success-50 text-success-700',
  info: 'bg-info-50 text-info-700',
  gray: 'bg-gray-200 text-gray-700',
};

export function Avatar({ initials, size = 'sm', color = 'gray', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0',
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
    >
      {initials}
    </span>
  );
}

// گروه آواتار (مطابق designs/Design System.html AVATAR GROUP)
interface AvatarGroupProps {
  avatars: Array<{ initials: string; color?: AvatarColor }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2 space-x-reverse', className)}>
      {visible.map((avatar, idx) => (
        <span
          key={idx}
          className="rounded-full ring-2 ring-white"
        >
          <Avatar initials={avatar.initials} size={size} color={avatar.color ?? 'gray'} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-medium ring-2 ring-white',
            size === 'sm' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]',
          )}
        >
          +{overflow.toLocaleString('fa-IR')}
        </span>
      )}
    </div>
  );
}
