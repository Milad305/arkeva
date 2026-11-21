import { useState, type ReactNode } from 'react';

import { Icon } from '@/shared/components/ui/Icon';
import { TextInput } from '@/shared/components/ui/TextInput';

// اجزای فرم ویرایش نسخهٔ کاری — مشترک W12 (WBS) و حالت ویرایش CBS.

/**
 * برچسب دیدنی برای هر ورودی (قاعدهٔ labels). کنترل‌هایی که خودشان دکمه‌اند (Segmented)
 * یا متن فقط‌خواندنی‌اند `asLabel={false}` می‌گیرند تا کلیک روی برچسب گزینهٔ اول را نزند.
 */
export function Field({
  label,
  hint,
  error,
  asLabel = true,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  asLabel?: boolean;
  children: ReactNode;
}) {
  const Tag = asLabel ? 'label' : 'div';
  return (
    <Tag className="fg">
      <span className="lbl">{label}</span>
      {children}
      {error ? (
        <span className="hint err row g4 ai-s">
          <Icon name="alert-circle" size={12} />
          {error}
        </span>
      ) : (
        hint && <span className="hint">{hint}</span>
      )}
    </Tag>
  );
}

export function Lock({ reason }: { reason: string }) {
  return (
    <span className="hint row g4 ai-s">
      <Icon name="lock" size={12} />
      {reason}
    </span>
  );
}


/** ورودی متنی که با ترک فیلد یا Enter ثبت می‌شود. */
export function CommitInput({
  value,
  onCommit,
  ltr,
  suffix,
  invalid,
  disabled,
  list,
}: {
  value: string;
  onCommit: (value: string) => void;
  ltr?: boolean;
  suffix?: string;
  invalid?: boolean;
  disabled?: boolean;
  list?: string;
}) {
  const [text, setText] = useState(value);
  return (
    <TextInput
      size="sm"
      value={text}
      ltr={ltr}
      suffix={suffix}
      invalid={invalid}
      disabled={disabled}
      list={list}
      className={ltr ? 'mono' : undefined}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        if (event.key === 'Escape') setText(value);
      }}
    />
  );
}

