import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '@/shared/utils/cn';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import { OTP_LENGTH } from '../services/schemas';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** وقتی هر شش رقم پر شد. */
  onComplete?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  label: string;
}

/**
 * ورودی کد تأیید — W03.
 *
 * شش خانهٔ جدا با `dir="ltr"`؛ کد لاتین و مونواسپیس است (`CLAUDE.md` بخش ۵).
 * ورودی فارسی هم پذیرفته می‌شود و به لاتین تبدیل می‌شود.
 * چسباندن کد شش‌رقمی همهٔ خانه‌ها را پر می‌کند.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  label,
}: OtpInputProps) {
  const groupId = useId();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '');

  function commit(next: string) {
    onChange(next);
    if (next.length === OTP_LENGTH) onComplete?.(next);
  }

  function setDigit(index: number, digit: string) {
    const chars = digits.slice();
    chars[index] = digit;
    commit(chars.join('').slice(0, OTP_LENGTH));
  }

  function handleInput(index: number, raw: string) {
    const normalized = toEnDigits(raw).replace(/\D/g, '');
    if (normalized.length === 0) {
      setDigit(index, '');
      return;
    }

    // چند رقم یکجا (چسباندن یا تایپ سریع) از همین خانه به بعد پخش می‌شود
    const chars = digits.slice();
    for (let offset = 0; offset < normalized.length && index + offset < OTP_LENGTH; offset += 1) {
      chars[index + offset] = normalized[offset]!;
    }
    commit(chars.join(''));

    const nextIndex = Math.min(index + normalized.length, OTP_LENGTH - 1);
    inputs.current[nextIndex]?.focus();
    inputs.current[nextIndex]?.select();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      setDigit(index - 1, '');
      inputs.current[index - 1]?.focus();
      return;
    }
    // در RTL هم جهت خانه‌ها LTR است، پس فلش‌ها همان معنای بصری را دارند
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = toEnDigits(event.clipboardData.getData('text')).replace(/\D/g, '');
    if (pasted.length === 0) return;
    event.preventDefault();
    commit(pasted.slice(0, OTP_LENGTH));
    inputs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  }

  return (
    <fieldset
      aria-labelledby={groupId}
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))`,
        gap: 8,
        direction: 'ltr',
      }}
    >
      <legend className="sr-input" id={groupId}>
        {label}
      </legend>

      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          className={cn('fld mono', invalid && 'err')}
          style={{
            height: 54,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 600,
            justifyContent: 'center',
            padding: 0,
            ...(digit
              ? { borderColor: '#1A3354', background: '#E5EBF3', color: '#0E1E38' }
              : null),
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={OTP_LENGTH}
          disabled={disabled}
          aria-label={`رقم ${toFaDigits(index + 1)}`}
          value={digit}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </fieldset>
  );
}
