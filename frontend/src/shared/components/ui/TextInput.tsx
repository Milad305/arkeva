import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';
import { useFormField } from './FormField';

export type FieldSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<FieldSize, string> = { sm: 'sm', md: '', lg: 'lg' };
const ICON_SIZE: Record<FieldSize, number> = { sm: 13, md: 15, lg: 16 };

interface FieldChromeProps {
  size?: FieldSize;
  /** آیکن ابتدای فیلد. */
  icon?: IconName;
  /** واحد انتهای فیلد با خط جداکننده — «میلیارد ریال» در W28. */
  suffix?: ReactNode;
  /** چیزی که انتهای فیلد می‌نشیند، مثل دکمهٔ نمایش رمز. */
  trailing?: ReactNode;
  /** فقط‌خواندنی با پس‌زمینهٔ خاکستری و قفل. */
  readOnlyLook?: boolean;
  /** قاب سبز تأیید. */
  valid?: boolean;
  invalid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function fieldClass(
  { size = 'md', readOnlyLook, valid, invalid, className }: FieldChromeProps,
  contextInvalid: boolean,
): string {
  return cn(
    'fld',
    SIZE_CLASS[size],
    readOnlyLook && 'ro',
    (invalid ?? contextInvalid) && 'err',
    valid && 'okb',
    className,
  );
}

export interface TextInputProps
  extends FieldChromeProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'style'> {
  /** ایمیل، موبایل، کد و رمز در بوم LTR نمایش داده می‌شوند با برچسب فارسی. */
  ltr?: boolean;
}

/**
 * ورودی متنی — `.fld` در kit.css.
 *
 * `.fld` خودش یک ظرف flex است و `<input>` درونش بی‌قاب می‌نشیند؛ همان ساختار بوم.
 * قابل استفاده با `register` از react-hook-form چون ref را عبور می‌دهد.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { size = 'md', icon, suffix, trailing, readOnlyLook, valid, invalid, className, style, ltr, ...rest },
  ref,
) {
  const field = useFormField();

  return (
    <span
      className={fieldClass(
        { size, readOnlyLook, valid, invalid, className },
        field?.invalid ?? false,
      )}
      style={style}
    >
      {icon && (
        <span className="tx5" style={{ display: 'inline-flex' }}>
          <Icon name={icon} size={ICON_SIZE[size]} />
        </span>
      )}
      <input
        {...rest}
        ref={ref}
        id={rest.id ?? field?.id}
        aria-describedby={rest['aria-describedby'] ?? field?.describedBy}
        aria-invalid={invalid ?? field?.invalid ?? undefined}
        dir={ltr ? 'ltr' : undefined}
        style={ltr ? { textAlign: 'right' } : undefined}
      />
      {trailing}
      {suffix && <span className="sfx">{suffix}</span>}
    </span>
  );
});

export interface TextAreaProps
  extends Omit<FieldChromeProps, 'icon' | 'suffix' | 'trailing'>,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'style'> {}

/** ناحیهٔ متن — `textarea.fld` در kit.css، ارتفاع خودکار با حداقل ۷۶px. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { size = 'md', readOnlyLook, valid, invalid, className, style, rows = 3, ...rest },
  ref,
) {
  const field = useFormField();

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      id={rest.id ?? field?.id}
      aria-describedby={rest['aria-describedby'] ?? field?.describedBy}
      aria-invalid={invalid ?? field?.invalid ?? undefined}
      className={fieldClass(
        { size, readOnlyLook, valid, invalid, className },
        field?.invalid ?? false,
      )}
      style={style}
    />
  );
});

export interface ReadOnlyFieldProps extends FieldChromeProps {
  value: ReactNode;
  /** مقدار مونواسپیس LTR — مثل کد پروژه. */
  mono?: boolean;
  /** آیکن قفل انتهای فیلد. */
  locked?: boolean;
}

/** فیلد قفل‌شده — مثل «کد پروژه» در W28 که بعد از ایجاد تغییر نمی‌کند. */
export function ReadOnlyField({
  value,
  mono,
  locked = true,
  size = 'md',
  className,
  style,
}: ReadOnlyFieldProps) {
  return (
    <span className={cn('fld', 'ro', SIZE_CLASS[size], className)} style={style}>
      <span className={cn('grow', mono && 'mono')} style={{ textAlign: 'right' }}>
        {value}
      </span>
      {locked && <Icon name="lock" size={14} />}
    </span>
  );
}
