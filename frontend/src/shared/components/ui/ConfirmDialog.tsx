import { useEffect, useState, type ReactNode } from 'react';

import { AppButton, type ButtonVariant } from './AppButton';
import { IconBox } from './IconBox';
import { Modal } from './Modal';
import { TextArea, TextInput } from './TextInput';
import type { IconName } from './Icon';
import type { Tone } from '@/shared/types/tone';

export type ConfirmTone = 'danger' | 'warning' | 'info';

const TONE: Record<ConfirmTone, { box: Tone; button: ButtonVariant; icon: IconName }> = {
  danger: { box: 'err', button: 'danger', icon: 'trash-2' },
  warning: { box: 'wrn', button: 'accent', icon: 'alert-triangle' },
  info: { box: 'inf', button: 'primary', icon: 'info' },
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  /** `reason` فقط وقتی `reasonLabel` داده شده باشد پر است. */
  onConfirm: (reason: string) => void;
  tone?: ConfirmTone;
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  confirmIcon?: IconName;
  cancelLabel?: string;
  /**
   * تأیید با تایپ — برای اقدام برگشت‌ناپذیر (W41 «حذف پروژه»).
   * تا متن واردشده دقیقاً همین نباشد، دکمهٔ تأیید غیرفعال می‌ماند.
   */
  confirmText?: string;
  confirmTextLabel?: string;
  /**
   * فیلد دلیل — مثلاً بایگانی پروژه دلیل اجباری دارد (F02 ۸.۴).
   * دلیل در لاگ ممیزی ثبت می‌شود.
   */
  reasonLabel?: string;
  reasonRequired?: boolean;
  /** محتوای اضافه زیر توضیح — مثل چک‌باکس «ارسال خلاصه به مدیر پروژه». */
  extra?: ReactNode;
  loading?: boolean;
}

/**
 * تأیید عمومی — W41.
 *
 * سه حالت بوم: خطرناک (قرمز، با تأیید تایپی)، هشدار (نارنجی) و اطلاعی (سرمه‌ای).
 * دکمهٔ انصراف همیشه «شبح» است و دکمهٔ تأیید فعلِ کار را می‌گوید، نه «تأیید».
 */
export function ConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  tone = 'info',
  icon,
  title,
  description,
  confirmLabel,
  confirmIcon,
  cancelLabel = 'انصراف',
  confirmText,
  confirmTextLabel = 'برای تأیید، نام را تایپ کنید',
  reasonLabel,
  reasonRequired = false,
  extra,
  loading = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const config = TONE[tone];

  useEffect(() => {
    if (isOpen) return;
    setTyped('');
    setReason('');
  }, [isOpen]);

  const typedMatches = confirmText === undefined || typed.trim() === confirmText;
  const reasonOk = !reasonRequired || reason.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      showClose={false}
      dismissOnBackdrop={!loading}
      footer={
        <div className="row g8" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <AppButton variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={config.button}
            icon={confirmIcon}
            loading={loading}
            disabled={!typedMatches || !reasonOk}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </AppButton>
        </div>
      }
    >
      <div className="row ai-s g12" style={{ paddingTop: 2 }}>
        <IconBox icon={icon ?? config.icon} tone={config.box} size="lg" />
        <div className="col" style={{ gap: 6, minWidth: 0 }}>
          <h3 className="t-16 fw6 tx9">{title}</h3>
          {description && <div className="t-13 tx6 lh">{description}</div>}
        </div>
      </div>

      {confirmText !== undefined && (
        <label className="fg">
          <span className="lbl t-12">{confirmTextLabel}</span>
          <TextInput
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            invalid={typed.length > 0 && !typedMatches}
            aria-label={confirmTextLabel}
          />
          <span className={typedMatches ? 'hint ok' : 'hint'}>
            {typedMatches ? 'نام درست است.' : 'هنوز با نام یکسان نیست'}
          </span>
        </label>
      )}

      {reasonLabel && (
        <label className="fg">
          <span className="lbl t-12">
            {reasonLabel}
            {reasonRequired ? <span className="req"> *</span> : <span className="opt"> (اختیاری)</span>}
          </span>
          <TextArea
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label={reasonLabel}
          />
          <span className="hint">در لاگ ممیزی پروژه ثبت می‌شود.</span>
        </label>
      )}

      {extra}
    </Modal>
  );
}
