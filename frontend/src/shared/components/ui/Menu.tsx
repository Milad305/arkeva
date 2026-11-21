import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { useOutsideDismiss } from '@/shared/hooks/useOutsideDismiss';
import { Icon, type IconName } from './Icon';

export type MenuItemTone = 'default' | 'danger' | 'warn' | 'good';

export interface MenuItemSpec {
  key: string;
  label: ReactNode;
  icon?: IconName;
  /** توضیح ریز زیر عنوان — `.mi .ms` در بوم. */
  note?: string;
  /** چیزی که سمت مقابل می‌نشیند: میانبر، شمارنده، فلش زیرمنو. */
  trailing?: ReactNode;
  tone?: MenuItemTone;
  disabled?: boolean;
  /** دلیل غیرفعال‌بودن — روی tooltip بومی. */
  disabledReason?: string;
  to?: string;
  onSelect?: () => void;
  /**
   * گزینهٔ تیک‌خوردنی (`menuitemcheckbox`) — مثل انتخاب ستون‌های جدول.
   * تیک را خودِ منو در جای `trailing` می‌گذارد.
   */
  checked?: boolean;
  /** با انتخاب بسته نشود — برای چند انتخاب پشت‌سرهم. */
  keepOpen?: boolean;
}

export type MenuEntry = MenuItemSpec | { key: string; separator: true } | { key: string; group: string };

const TONE_CLASS: Record<MenuItemTone, string> = {
  default: '',
  danger: 'danger',
  warn: 'warn',
  good: 'good',
};

export interface MenuListProps {
  entries: MenuEntry[];
  onClose?: () => void;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** بدنهٔ منو — `.menu` / `.mi` / `.msep` / `.mgl` از kit.css. */
export function MenuList({ entries, onClose, width = 248, className, style }: MenuListProps) {
  return (
    <div className={cn('menu', className)} style={{ width, ...style }} role="menu">
      {entries.map((entry) => {
        if ('separator' in entry) {
          return <span key={entry.key} className="msep" role="separator" />;
        }
        if ('group' in entry) {
          return (
            <span key={entry.key} className="mgl">
              {entry.group}
            </span>
          );
        }

        const classes = cn('mi', TONE_CLASS[entry.tone ?? 'default'], entry.disabled && 'dis');
        const inner = (
          <>
            {entry.icon && (
              <span className="ico">
                <Icon name={entry.icon} size={15} />
              </span>
            )}
            <span className="col grow" style={{ minWidth: 0 }}>
              <span className="trunc">{entry.label}</span>
              {entry.note && <span className="ms">{entry.note}</span>}
            </span>
            {entry.checked !== undefined ? (
              <span className="mx" style={{ display: 'inline-flex', color: 'var(--primary-700)' }}>
                {entry.checked && <Icon name="check" size={14} />}
              </span>
            ) : (
              entry.trailing && <span className="mx">{entry.trailing}</span>
            )}
          </>
        );

        if (entry.to && !entry.disabled) {
          return (
            <Link key={entry.key} to={entry.to} className={classes} role="menuitem" onClick={onClose}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={entry.key}
            type="button"
            role={entry.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={entry.checked}
            className={classes}
            disabled={entry.disabled}
            title={entry.disabled ? entry.disabledReason : undefined}
            onClick={() => {
              entry.onSelect?.();
              if (!entry.keepOpen) onClose?.();
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export interface MenuProps {
  /** دکمهٔ بازکننده. `props` را روی عنصر خودت بگذار. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
  }) => ReactNode;
  entries: MenuEntry[];
  width?: number;
  /** سمت باز شدن منو نسبت به دکمه. */
  align?: 'start' | 'end';
}

/** منوی بازشوی موضعی — برای منوی سه‌نقطه و منوی کاربر. */
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

/**
 * منوی بازشو.
 *
 * در پورتال با موقعیت ثابت رندر می‌شود، چون منوی سه‌نقطهٔ ردیف‌ها درون
 * `.tbl-wrap` (اسکرول افقی) و `.card` (overflow:hidden) می‌نشیند و موقعیت
 * موضعی بریده می‌شد. اگر پایین جا نباشد، بالای دکمه باز می‌شود.
 * با اسکرول یا تغییر اندازهٔ پنجره بسته می‌شود تا از دکمه جدا نماند.
 */
export function Menu({ trigger, entries, width = 248, align = 'end' }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    setPosition(null);
  };

  useOutsideDismiss(isOpen, close, menuRef, triggerRef);

  // اندازه‌گیری پس از رندر اول منو — تا ارتفاع واقعی‌اش معلوم باشد
  useEffect(() => {
    if (!isOpen) return;
    const anchor = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const height = menu.offsetHeight;
    const menuWidth = menu.offsetWidth || width;
    const fitsBelow = anchor.bottom + MENU_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;

    // در RTL «انتها» سمت چپ است: لبهٔ چپ منو با لبهٔ چپ دکمه هم‌تراز می‌شود
    const rawLeft = align === 'end' ? anchor.left : anchor.right - menuWidth;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rawLeft),
      window.innerWidth - menuWidth - VIEWPORT_MARGIN,
    );

    setPosition({
      top: fitsBelow ? anchor.bottom + MENU_GAP : Math.max(VIEWPORT_MARGIN, anchor.top - MENU_GAP - height),
      left,
    });
  }, [isOpen, align, width]);

  useEffect(() => {
    if (!isOpen) return;
    // capture: اسکرول هر ظرف داخلی (مثل .tbl-wrap) هم منو را می‌بندد
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => (isOpen ? close() : setIsOpen(true)),
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
      })}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="pj"
            dir="rtl"
            lang="fa"
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              zIndex: 40,
              background: 'transparent',
              // تا اندازه‌گیری انجام نشده، منو دیده نشود و نپرد
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            <MenuList entries={entries} width={width} onClose={close} />
          </div>,
          document.body,
        )}
    </>
  );
}

export interface ContextMenuProps {
  /** مختصات کلیک راست؛ `null` یعنی بسته. */
  position: { x: number; y: number } | null;
  onClose: () => void;
  entries: MenuEntry[];
  width?: number;
}

/**
 * منوی کلیک‌راست — در پورتال، با برگرداندن موضع هنگام رسیدن به لبهٔ پنجره
 * (ایرادی که پیاده‌سازی قبلی داشت و منو بیرون صفحه می‌افتاد).
 */
export function ContextMenu({ position, onClose, entries, width = 248 }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<{ top: number; left: number } | null>(null);

  useOutsideDismiss(position !== null, onClose, menuRef);

  useEffect(() => {
    if (!position) {
      setAdjusted(null);
      return;
    }

    const element = menuRef.current;
    const height = element?.offsetHeight ?? 0;
    const menuWidth = element?.offsetWidth ?? width;

    const maxTop = window.innerHeight - height - 8;
    const maxLeft = window.innerWidth - menuWidth - 8;

    setAdjusted({
      top: Math.max(8, Math.min(position.y, maxTop)),
      left: Math.max(8, Math.min(position.x, maxLeft)),
    });
  }, [position, width]);

  if (!position) return null;

  return createPortal(
    <div
      className="pj"
      dir="rtl"
      lang="fa"
      style={{
        position: 'fixed',
        top: adjusted?.top ?? position.y,
        left: adjusted?.left ?? position.x,
        zIndex: 40,
        // تا اندازه‌گیری انجام نشده، منو دیده نشود و نپرد
        visibility: adjusted ? 'visible' : 'hidden',
      }}
    >
      <div ref={menuRef}>
        <MenuList entries={entries} width={width} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
