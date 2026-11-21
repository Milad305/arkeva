import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon } from './Icon';

type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'children'>;

export interface CheckboxProps extends NativeInput {
  label?: ReactNode;
  /** حالت میانی برای انتخاب آبشاری درخت — `.cb.part` در kit.css. */
  indeterminate?: boolean;
  className?: string;
}

/**
 * چک‌باکس — ورودی بومی مخفی به‌علاوهٔ `span.cb` بصری.
 * ورودی واقعی می‌ماند تا فوکوس، Space و فرم‌ها طبیعی کار کنند.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, indeterminate, checked, className, ...rest },
  ref,
) {
  const visual = cn('cb', indeterminate ? 'part' : checked && 'on');

  return (
    <label className={cn('row g8 t-ui tx7', className)} style={{ cursor: 'pointer' }}>
      <input
        {...rest}
        ref={ref}
        type="checkbox"
        className="sr-input"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
      />
      <span className={visual} aria-hidden="true">
        {checked && !indeterminate && <Icon name="check" size={11} strokeWidth={3.5} />}
      </span>
      {label}
    </label>
  );
});

export interface RadioProps extends NativeInput {
  label?: ReactNode;
  className?: string;
}

/** رادیو — `span.rd` بصری روی ورودی بومی. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, checked, className, ...rest },
  ref,
) {
  return (
    <label className={cn('row g8 t-ui tx7', className)} style={{ cursor: 'pointer' }}>
      <input {...rest} ref={ref} type="radio" className="sr-input" checked={checked} />
      <span className={cn('rd', checked && 'on')} aria-hidden="true" />
      {label}
    </label>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** برچسب دسترس‌پذیری — اجباری چون کلید معنای بصری تنها دارد. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** کلید روشن/خاموش — `.sw` در kit.css. از نظر معنایی یک دکمهٔ دوحالته است. */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('sw', checked && 'on', className)}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    />
  );
}

export interface OptionCardProps {
  title: ReactNode;
  description?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  /** رادیو یا چک‌باکس ابتدای کارت. */
  control?: 'radio' | 'checkbox' | 'none';
  name?: string;
  className?: string;
}

/**
 * کارت گزینه — `.opt-card` در kit.css.
 * در ویزارد پروژهٔ جدید و تنظیمات روش محاسبهٔ پیشرفت استفاده می‌شود.
 */
export function OptionCard({
  title,
  description,
  selected,
  onSelect,
  control = 'radio',
  name,
  className,
}: OptionCardProps) {
  return (
    <label className={cn('opt-card', selected && 'on', className)} style={{ cursor: 'pointer' }}>
      {control !== 'none' && (
        <>
          <input
            type={control}
            name={name}
            className="sr-input"
            checked={selected}
            onChange={onSelect}
          />
          {control === 'radio' ? (
            <span className={cn('rd', selected && 'on')} aria-hidden="true" />
          ) : (
            <span className={cn('cb', selected && 'on')} aria-hidden="true">
              {selected && <Icon name="check" size={11} strokeWidth={3.5} />}
            </span>
          )}
        </>
      )}
      <span className="col grow" style={{ minWidth: 0 }}>
        <span className="t">{title}</span>
        {description && <span className="d">{description}</span>}
      </span>
    </label>
  );
}
