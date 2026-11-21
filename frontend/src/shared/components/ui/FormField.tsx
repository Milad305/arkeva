import { createContext, useContext, useId, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon } from './Icon';

interface FormFieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/** کنترل‌های درون FormField شناسه و وضعیت خطا را از همین‌جا می‌گیرند. */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

export interface FormFieldProps {
  label?: ReactNode;
  /** ستارهٔ قرمز اجباری‌بودن. */
  required?: boolean;
  /** «(اختیاری)» کنار برچسب. */
  optional?: boolean;
  /** راهنمای زیر فیلد. */
  hint?: ReactNode;
  /** پیام خطا — جای راهنما را می‌گیرد و فیلد را قرمز می‌کند. */
  error?: string;
  /** پیام موفقیت سبز — مثل «با جمع اقلام CBS برابر است». */
  success?: ReactNode;
  /** تمام عرض گرید والد (`.full`). */
  full?: boolean;
  /** نشانگر «تغییر ذخیره‌نشده» کنار برچسب (نقطهٔ نارنجی در W28). */
  dirty?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** گروه فیلد — `.fg` + `.lbl` + `.hint` در kit.css. */
export function FormField({
  label,
  required,
  optional,
  hint,
  error,
  success,
  full,
  dirty,
  id: providedId,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error ?? success ?? hint);

  return (
    <FormFieldContext.Provider
      value={{ id, invalid: Boolean(error), describedBy: hasMessage ? messageId : undefined }}
    >
      <div className={cn('fg', full && 'full', className)}>
        {label && (
          <label className="lbl row g6" htmlFor={id}>
            {label}
            {required && <span className="req">*</span>}
            {optional && <span className="opt">(اختیاری)</span>}
            {dirty && (
              <span
                title="تغییر ذخیره‌نشده"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: 'var(--accent-500)',
                  display: 'inline-block',
                }}
              />
            )}
          </label>
        )}

        {children}

        {error ? (
          <span className="hint err" id={messageId} role="alert">
            <Icon name="circle-alert" size={12} />
            {error}
          </span>
        ) : success ? (
          <span className="hint ok" id={messageId}>
            <Icon name="check-circle-2" size={12} />
            {success}
          </span>
        ) : (
          hint && (
            <span className="hint" id={messageId}>
              {hint}
            </span>
          )
        )}
      </div>
    </FormFieldContext.Provider>
  );
}
