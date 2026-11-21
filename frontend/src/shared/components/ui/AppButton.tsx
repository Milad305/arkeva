import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

/** واریانت‌ها دقیقاً نگاشت کلاس‌های `.btn-*` در kit.css هستند. */
export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'dangerOutline'
  | 'success'
  | 'accent'
  | 'ghostOnDark';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-p',
  outline: 'btn-o',
  ghost: 'btn-g',
  danger: 'btn-d',
  dangerOutline: 'btn-do',
  success: 'btn-s',
  accent: 'btn-w',
  ghostOnDark: 'btn-gw',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/** اندازهٔ آیکن متناسب با ارتفاع دکمه — مطابق مقادیر بوم. */
const ICON_SIZE: Record<ButtonSize, number> = { xs: 12, sm: 13, md: 14, lg: 16 };

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** آیکن ابتدای دکمه (سمت راست در RTL). */
  icon?: IconName;
  /** آیکن انتهای دکمه — مثل `chevron-down` در دکمه‌های بازکننده. */
  trailingIcon?: IconName;
  /** تمام عرض والد. */
  block?: boolean;
  className?: string;
  children?: ReactNode;
}

function buttonClass(
  { variant = 'outline', size = 'md', block, className }: SharedProps,
  disabled?: boolean,
): string {
  return cn(
    'btn',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    block && 'btn-blk',
    disabled && 'dis',
    className,
  );
}

function buttonContent(
  { icon, trailingIcon, size = 'md', children }: SharedProps,
  loading: boolean,
  variant: ButtonVariant,
) {
  const iconSize = ICON_SIZE[size];
  const spinnerOn =
    variant === 'primary' || variant === 'danger' || variant === 'success' || variant === 'accent'
      ? 'dark'
      : 'light';

  return (
    <>
      {loading ? (
        <Spinner size={iconSize} on={spinnerOn} />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
      {trailingIcon && !loading && <Icon name={trailingIcon} size={iconSize} />}
    </>
  );
}

export interface AppButtonProps
  extends SharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  /**
   * در حال انجام. دکمه غیرفعال می‌شود تا دو بار ثبت نشود و متن آن
   * کارِ در جریان را می‌گوید (قاعدهٔ W46).
   */
  loading?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { loading = false, disabled, type = 'button', variant = 'outline', ...props },
  ref,
) {
  const { icon, trailingIcon, size, block, className, children, ...rest } = props;
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className }, isDisabled)}
    >
      {buttonContent({ icon, trailingIcon, size, children }, loading, variant)}
    </button>
  );
});

export interface LinkButtonProps extends SharedProps, Omit<LinkProps, 'className' | 'children'> {}

/**
 * همان دکمه، ولی یک پیوند واقعی.
 * بوم برای هر دکمه‌ای که جابه‌جا می‌کند `<a class="btn …">` دارد؛ اینجا `<Link>` می‌شود
 * تا هیچ‌جا `href="#"` نماند.
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = 'outline', ...props },
  ref,
) {
  const { icon, trailingIcon, size, block, className, children, ...rest } = props;

  return (
    <Link {...rest} ref={ref} className={buttonClass({ variant, size, block, className })}>
      {buttonContent({ icon, trailingIcon, size, children }, false, variant)}
    </Link>
  );
});
