import { useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from './Icon';
import { IconBox } from './IconBox';

export interface DropzoneProps {
  /** پسوندهای مجاز، برای ویژگی accept و متن راهنما. */
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  /** متن ریز پایین — محدودیت حجم و قالب. */
  hint?: ReactNode;
  /** دکمه یا پیوند اضافه (مثل «دانلود قالب Excel»). */
  footer?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * ناحیهٔ کشیدن و رها کردن فایل — `.drop` در kit.css.
 *
 * یک `<input type="file">` واقعی درون برچسب دارد، پس با صفحه‌کلید هم باز می‌شود؛
 * کشیدن و رها کردن افزودنی است، نه تنها راه.
 */
export function Dropzone({
  accept,
  multiple,
  onFiles,
  icon = 'upload',
  title,
  description,
  hint,
  footer,
  disabled,
  className,
}: DropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      className={cn('drop', className)}
      style={{
        background: isDragging ? 'var(--dropzone-hover, #F8FAFD)' : undefined,
        borderColor: isDragging ? 'var(--primary-500)' : undefined,
        opacity: disabled ? 0.6 : undefined,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <IconBox icon={icon} tone="pri" size="xl" />

      <label htmlFor={inputId} className="h-hd" style={{ cursor: disabled ? 'default' : 'pointer' }}>
        {title}
      </label>
      {description && <p className="t-13 tx6 lh">{description}</p>}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-input"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = '';
        }}
      />

      <button
        type="button"
        className="btn btn-o btn-sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="paperclip" size={13} />
        انتخاب فایل
      </button>

      {hint && <span className="t-xs tx5">{hint}</span>}
      {footer}
    </div>
  );
}
