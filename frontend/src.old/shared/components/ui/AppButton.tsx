import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

// ابعاد/رنگ از designs/Design System.html بخش buttons (کلاس‌های .btn-*)
const appButtonVariants = cva(
  // base — مطابق .btn-primary ... در Design System
  // نکته: items-center + [&>svg]:shrink-0 تضمین می‌کند که آیکن در محور عمود وسط دکمه بماند
  // (در غیر این صورت baseline متن آیکن را به بالا هل می‌دهد).
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium leading-none whitespace-nowrap cursor-pointer border border-transparent transition-colors duration-150 disabled:cursor-not-allowed [&>svg]:shrink-0 [&>svg]:self-center',
  {
    variants: {
      variant: {
        primary: 'bg-primary-700 text-white hover:bg-primary-900 active:bg-primary-900 disabled:bg-gray-300 disabled:text-gray-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400',
        outline: 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:border-gray-400 disabled:text-gray-400 disabled:border-gray-200 disabled:bg-white',
        ghost: 'bg-transparent text-gray-800 hover:bg-gray-100 disabled:text-gray-400',
        destructive: 'bg-error-500 text-white hover:bg-error-700 disabled:bg-red-300 disabled:text-white',
        accent: 'bg-accent-500 text-white hover:bg-accent-700 disabled:bg-gray-300 disabled:text-gray-500',
      },
      size: {
        sm: 'h-7 px-2.5 text-[12.5px] rounded-md',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-4.5 text-[15px] rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

// آیکن‌باتن (مطابق .btn-icon در Design System)
const appIconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md bg-transparent border border-transparent text-gray-600 transition-colors cursor-pointer hover:bg-gray-100 hover:text-gray-900',
  {
    variants: {
      size: {
        sm: 'w-[26px] h-[26px] rounded-md',
        md: 'w-8 h-8',
        lg: 'w-10 h-10 rounded-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appButtonVariants> {
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ variant, size, isLoading, leftIcon, rightIcon, children, disabled, className, ...props }, ref) => {
    // children می‌تواند شامل آیکن (React element) و متن باشد.
    // آیکن‌ها (و سایر elementها) را از text nodeها جدا می‌کنیم تا هرکدام به‌صورت flex item
    // مستقل در محور عمود center شوند. در غیر این صورت، baseline متن باعث می‌شود آیکن
    // به سمت بالا هل داده شود.
    const childArray = Array.isArray(children) ? children : [children];
    const iconElements: ReactNode[] = [];
    const textParts: ReactNode[] = [];
    for (const child of childArray) {
      if (child == null || child === false || child === true) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        textParts.push(child);
      } else {
        iconElements.push(child);
      }
    }
    const hasText = textParts.length > 0;

    return (
      <button
        ref={ref}
        className={cn(appButtonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Spinner size={size === 'lg' ? 18 : size === 'sm' ? 14 : 16} />}
        {!isLoading && leftIcon}
        {!isLoading && iconElements}
        {hasText && <span>{textParts}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  },
);
AppButton.displayName = 'AppButton';

export interface AppIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appIconButtonVariants> {
  'aria-label': string;
}

export const AppIconButton = forwardRef<HTMLButtonElement, AppIconButtonProps>(
  ({ size, className, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(appIconButtonVariants({ size }), className)} {...props} />
    );
  },
);
AppIconButton.displayName = 'AppIconButton';

// Spinner داخلی برای دکمه
function Spinner({ size }: { size: number }) {
  return (
    <svg
      className="spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round" />
    </svg>
  );
}
