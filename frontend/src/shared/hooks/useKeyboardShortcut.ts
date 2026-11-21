import { useEffect } from 'react';

/** توصیف یک میانبر: `'ctrl+k'`، `'shift+a'`، `'j'`، `'?'` */
export type Shortcut = string;

function matches(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1]!;

  const needsCtrl = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('mod');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');

  // mod روی مک cmd و در غیر آن ctrl است
  const ctrlHeld = event.ctrlKey || event.metaKey;

  if (needsCtrl !== ctrlHeld) return false;
  if (needsShift !== event.shiftKey) return false;
  if (needsAlt !== event.altKey) return false;

  return event.key.toLowerCase() === key;
}

/** آیا فوکوس داخل یک فیلد متنی است؟ میانبرهای تک‌حرفی آنجا نباید عمل کنند. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
  );
}

export interface ShortcutOptions {
  /** میانبر حتی وقتی فوکوس در فیلد متنی است عمل کند (مثل Ctrl+K). */
  allowWhileTyping?: boolean;
  enabled?: boolean;
}

/**
 * ثبت یک میانبر صفحه‌کلید روی سطح سند.
 *
 * بوم میانبرهای واقعی دارد: Ctrl+K جستجو، J/K حرکت بین گزارش‌ها،
 * A تأیید، E درخواست اصلاح، R رد، Shift+A تأیید همه، ? راهنما.
 */
export function useKeyboardShortcut(
  shortcut: Shortcut,
  handler: (event: KeyboardEvent) => void,
  options?: ShortcutOptions,
): void {
  const { allowWhileTyping = false, enabled = true } = options ?? {};

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (!allowWhileTyping && isTypingTarget(event.target)) return;
      if (!matches(event, shortcut)) return;
      event.preventDefault();
      handler(event);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, handler, allowWhileTyping, enabled]);
}
