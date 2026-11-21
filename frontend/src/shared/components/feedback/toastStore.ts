import { TOAST_DURATION_MS } from '@/config/constants';
import type { AlertTone } from '@/shared/types/tone';

// فروشگاه کوچک پیام‌های کوتاه، بیرون از Redux.
// دلیل: هر toast می‌تواند یک اقدام (callback) داشته باشد — «بازگردانی»، «تلاش دوباره» —
// و تابع در state ردیفِ Redux سریالایز نمی‌شود.
//
// رفتار مطابق بوم (W46): پایین صفحه وسط · ۵ ثانیه · پیام خطا تا بستن دستی می‌ماند.

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  tone: AlertTone;
  message: string;
  action?: ToastAction;
  /** اگر true، خودکار بسته نمی‌شود. پیش‌فرضِ خطاها. */
  sticky: boolean;
}

export interface ToastOptions {
  action?: ToastAction;
  sticky?: boolean;
  durationMs?: number;
}

type Listener = () => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let counter = 0;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function push(tone: AlertTone, message: string, options?: ToastOptions): string {
  const id = `toast-${++counter}`;
  const sticky = options?.sticky ?? tone === 'err';

  items = [...items, { id, tone, message, action: options?.action, sticky }];
  emit();

  if (!sticky) {
    const duration = options?.durationMs ?? TOAST_DURATION_MS;
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
  }

  return id;
}

export function dismiss(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function dismissAll(): void {
  timers.forEach(clearTimeout);
  timers.clear();
  if (items.length === 0) return;
  items = [];
  emit();
}

export const toast = {
  success: (message: string, options?: ToastOptions) => push('ok', message, options),
  error: (message: string, options?: ToastOptions) => push('err', message, options),
  info: (message: string, options?: ToastOptions) => push('inf', message, options),
  warning: (message: string, options?: ToastOptions) => push('wrn', message, options),
  dismiss,
  dismissAll,
};

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return items;
}
