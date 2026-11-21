import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';

export type IconButtonSize = 'sm' | 'md';

interface SharedProps {
  icon: IconName;
  /** اجباری — دکمهٔ بدون متن باید برچسب دسترس‌پذیری داشته باشد. */
  label: string;
  size?: IconButtonSize;
  /** قاب دور دکمه (`.ibtn.bd` در بوم). */
  bordered?: boolean;
  /** نقطهٔ قرمز اعلان‌های خوانده‌نشده. */
  ping?: boolean;
  className?: string;
}

const ICON_SIZE: Record<IconButtonSize, number> = { sm: 14, md: 16 };

function iconButtonClass({ size = 'md', bordered, className }: SharedProps): string {
  return cn('ibtn', size === 'sm' && 'sm', bordered && 'bd', className);
}

export interface IconButtonProps
  extends SharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-label'> {}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'md', bordered, ping, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      className={iconButtonClass({ icon, label, size, bordered, className })}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
      {ping && <span className="ping" />}
    </button>
  );
});

export interface IconLinkProps
  extends SharedProps,
    // `ping` در HTML یک ویژگی رشته‌ای روی <a> است و با prop بولیِ ما تعارض دارد
    Omit<LinkProps, 'className' | 'children' | 'aria-label' | 'ping'> {}

export const IconLink = forwardRef<HTMLAnchorElement, IconLinkProps>(function IconLink(
  { icon, label, size = 'md', bordered, ping, className, ...rest },
  ref,
) {
  return (
    <Link
      {...rest}
      ref={ref}
      aria-label={label}
      className={iconButtonClass({ icon, label, size, bordered, className })}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
      {ping && <span className="ping" />}
    </Link>
  );
});
