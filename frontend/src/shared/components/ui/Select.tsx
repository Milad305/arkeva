import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { useOutsideDismiss } from '@/shared/hooks/useOutsideDismiss';
import { Icon, type IconName } from './Icon';
import { useFormField } from './FormField';
import type { FieldSize } from './TextInput';

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: ReactNode;
  /** متنی که در دکمهٔ بسته نشان داده می‌شود؛ اگر label یک ReactNode است لازم می‌شود. */
  text?: string;
  icon?: IconName;
  disabled?: boolean;
}

export interface SelectProps<V extends string | number = string> {
  options: Array<SelectOption<V>>;
  value: V | null;
  onChange: (value: V) => void;
  /** متن دکمه وقتی چیزی انتخاب نشده. */
  placeholder?: string;
  /** پیشوند ثابت متن دکمه — بوم «وضعیت: همه» می‌نویسد. */
  prefix?: string;
  size?: FieldSize;
  icon?: IconName;
  /** عرض ثابت دکمه؛ بوم در نوار فیلتر عرض‌های ۱۳۰ تا ۱۶۰ می‌دهد. */
  width?: number | string;
  disabled?: boolean;
  invalid?: boolean;
  /** برچسب دسترس‌پذیری وقتی FormField والد وجود ندارد. */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<FieldSize, string> = { sm: 'sm', md: '', lg: 'lg' };
const ICON_SIZE: Record<FieldSize, number> = { sm: 13, md: 15, lg: 16 };

/**
 * فهرست بازشو — دکمهٔ `.fld.sel` به‌علاوهٔ پاپ‌آپ `.menu` از kit.css.
 *
 * الگوی listbox استاندارد: فلش‌ها حرکت، Enter انتخاب، Escape بستن، Home/End ابتدا و انتها.
 * جایگزین سه `<select>` دست‌ساز پیاده‌سازی قبلی.
 *
 * نکته: پاپ‌آپ موضعی است، پس کارت والد باید `overflowVisible` داشته باشد
 * (همان کاری که بوم در نوار فیلتر W07 با `overflow: visible` می‌کند).
 */
export function Select<V extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید',
  prefix,
  size = 'md',
  icon,
  width,
  disabled,
  invalid,
  label,
  className,
}: SelectProps<V>) {
  const field = useFormField();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  useOutsideDismiss(isOpen, close, popupRef, triggerRef);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (isOpen) setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, selectedIndex]);

  // فوکوس به دکمه برمی‌گردد تا پیمایش با صفحه‌کلید نشکند
  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    return () => trigger?.focus({ preventScroll: true });
  }, [isOpen]);

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  }

  function moveActive(step: number) {
    setActiveIndex((current) => {
      let next = current;
      for (let i = 0; i < options.length; i += 1) {
        next = (next + step + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        else moveActive(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) commit(activeIndex);
        else setIsOpen(true);
        break;
      case 'Tab':
        if (isOpen) setIsOpen(false);
        break;
      default:
        break;
    }
  }

  const buttonText = selected ? (selected.text ?? selected.label) : placeholder;

  return (
    <div style={{ position: 'relative', width, minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        id={field?.id}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleKeyDown}
        // الگوی combobox استاندارد WAI-ARIA: دکمه‌ای که یک listbox را باز می‌کند
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={label}
        aria-describedby={field?.describedBy}
        aria-invalid={invalid ?? field?.invalid ?? undefined}
        className={cn(
          'fld',
          'sel',
          SIZE_CLASS[size],
          (invalid ?? field?.invalid) && 'err',
          className,
        )}
        style={{ width: width === undefined ? undefined : '100%' }}
      >
        <span className="row g8 trunc">
          {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
          {selected?.icon && <Icon name={selected.icon} size={ICON_SIZE[size]} />}
          <span className="trunc">
            {prefix ? `${prefix}: ` : ''}
            {buttonText}
          </span>
        </span>
        <Icon name="chevron-down" size={ICON_SIZE[size] - 2} />
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="menu"
          id={listboxId}
          role="listbox"
          aria-label={label ?? placeholder}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            insetInlineStart: 0,
            width: '100%',
            minWidth: 160,
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={cn('mi', index === activeIndex && 'hov', option.disabled && 'dis')}
              onClick={() => commit(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.icon && (
                <span className="ico">
                  <Icon name={option.icon} size={15} />
                </span>
              )}
              <span className="grow trunc">{option.label}</span>
              {option.value === value && (
                <span className="mx tx-pri">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
