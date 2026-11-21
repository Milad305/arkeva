import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { AlertTone } from '@/shared/types/tone';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { dismiss, getToasts, subscribeToToasts, type ToastItem } from './toastStore';

const TONE_ICON: Record<AlertTone, IconName> = {
  ok: 'check',
  inf: 'refresh-cw',
  wrn: 'alert-triangle',
  err: 'x',
};

/** رنگ دایرهٔ آیکن — همان مقادیر توپر بوم در W46. */
const TONE_BG: Record<AlertTone, string> = {
  ok: '#15803D',
  inf: '#1D4ED8',
  wrn: '#B45813',
  err: '#B91C1C',
};

function Toast({ item }: { item: ToastItem }) {
  return (
    <div className="toast" role={item.tone === 'err' ? 'alert' : 'status'}>
      <span className="tic" style={{ background: TONE_BG[item.tone] }}>
        <Icon name={TONE_ICON[item.tone]} size={13} strokeWidth={2.6} />
      </span>

      <span className="grow" style={{ minWidth: 0 }}>
        {item.message}
      </span>

      {item.action && (
        <button
          type="button"
          className="link"
          style={{ color: 'var(--primary-300)' }}
          onClick={() => {
            item.action?.onClick();
            dismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}

      {item.sticky && (
        <IconButton
          icon="x"
          label="بستن پیام"
          size="sm"
          onClick={() => dismiss(item.id)}
          className="tx-w"
        />
      )}
    </div>
  );
}

/**
 * میزبان پیام‌های کوتاه — پایین صفحه، وسط (مطابق W46).
 * یک‌بار در AppShell و AuthShell سوار می‌شود.
 */
export function ToastHost() {
  const items = useSyncExternalStore(subscribeToToasts, getToasts, getToasts);

  if (items.length === 0) return null;

  return createPortal(
    <div
      className="pj"
      dir="rtl"
      lang="fa"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        insetInlineStart: 0,
        insetInlineEnd: 0,
        bottom: 24,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      {items.map((item) => (
        <div key={item.id} style={{ pointerEvents: 'auto', maxWidth: 'min(560px, calc(100vw - 32px))' }}>
          <Toast item={item} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
