import { useId } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/shared/utils';

// مطابق designs/Design System.html بخش selection.

// ────────── Checkbox ──────────
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean; // حالت نیمه‌تیک (مطابق cascade تخصیص)
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  indeterminate,
  className,
}: CheckboxProps) {
  const id = useId();
  const isActive = checked || indeterminate;
  return (
    <label
      htmlFor={id}
      className={cn('inline-flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      <span
        className={cn(
          'w-[18px] h-[18px] border border-gray-300 rounded-[4px] inline-flex items-center justify-center bg-white transition-all flex-shrink-0',
          isActive && 'bg-primary-500 border-primary-500',
        )}
      >
        {indeterminate && !checked && (
          <span className="w-2 h-0.5 bg-white rounded-full" />
        )}
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

// ────────── Radio ──────────
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function RadioGroup({
  name,
  value,
  options,
  onChange,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  return (
    <div className={cn(orientation === 'vertical' ? 'space-y-3' : 'flex gap-6', className)}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              'inline-flex items-start gap-2.5 cursor-pointer',
              option.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span
              className={cn(
                'w-[18px] h-[18px] border border-gray-300 rounded-full inline-flex items-center justify-center bg-white transition-all mt-0.5 flex-shrink-0',
                isSelected && 'border-[5px] border-primary-500',
              )}
            />
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span>
              <span className="text-sm block">{option.label}</span>
              {option.description && (
                <span className="text-xs text-gray-500 block mt-0.5">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ────────── Switch ──────────
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0',
        checked ? 'bg-primary-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          // در RTL، روشن بودن به سمت چپ حرکت می‌کند
          checked ? 'left-0.5' : 'right-0.5',
        )}
      />
    </button>
  );
}
