import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش forms (کلاس‌های .field).
// wrapperها برای React Hook Form — مطابق frontend-react.md بخش ۶.

// ────────── Input ──────────
const inputBaseClasses =
  'w-full h-[38px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm font-sans outline-none transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';

const inputErrorClasses = 'border-error-500 focus:border-error-500 focus:ring-error-500/10';

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  // برای فیلدهای LTR مثل email/تلفن/رمز — label فارسی می‌ماند
  ltr?: boolean;
  isFocus?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, leftIcon, ltr, className, isFocus, ...props }, ref) => {
    const inputId = props.id ?? props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-800">
            {label}
            {props.required && <span className="text-error-500 mr-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            dir={ltr ? 'ltr' : undefined}
            className={cn(
              inputBaseClasses,
              leftIcon && 'pr-9',
              error && inputErrorClasses,
              isFocus && 'border-primary-500 ring-2 ring-primary-500/15',
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-error-700 flex items-center gap-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';

// ────────── Textarea ──────────
export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, showCount, className, value, maxLength, ...props }, ref) => {
    const inputId = props.id ?? props.name;
    const currentLength = typeof value === 'string' ? value.length : 0;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-800">
            {label}
            {props.required && <span className="text-error-500 mr-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={cn(
            inputBaseClasses,
            'h-auto py-2.5 leading-7 resize-none',
            error && inputErrorClasses,
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-error-700">{error}</p>
        ) : showCount && maxLength ? (
          <p className="text-xs text-gray-500 flex justify-between">
            <span>حداکثر {maxLength} کاراکتر</span>
            <span className="mono">{currentLength.toLocaleString('fa-IR')} / {maxLength.toLocaleString('fa-IR')}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
FormTextarea.displayName = 'FormTextarea';
