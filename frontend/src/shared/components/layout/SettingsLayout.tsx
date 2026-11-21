import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { Icon, type IconName } from '@/shared/components/ui/Icon';

export interface SettingsNavEntry {
  key: string;
  label: string;
  icon: IconName;
  to: string;
  /** چند بخش به یک مسیر می‌روند و با لنگر از هم جدا می‌شوند. */
  hash?: string;
}

export interface SettingsLayoutProps {
  entries: SettingsNavEntry[];
  navTitle?: string;
  /** نوار «تغییرات ذخیره‌نشده» بالای ستون محتوا. */
  banner?: ReactNode;
  children: ReactNode;
}

/**
 * چیدمان تنظیمات — ناوبری کنار و یک ستون محتوای باریک (W28 / W29 / W30).
 *
 * بوم `width: 220px; flex-shrink: 0` روی ناوبری دارد که در عرض کم سرریز می‌کند.
 * اینجا همان الگوی کیت به‌کار می‌رود: `flex: 1 1 220px` برای ناوبری و
 * `flex: 999 1 420px` برای ستون محتوا، با `wrap` — پس در عرض کم ناوبری
 * به بالای محتوا می‌رود و هیچ چیزی بریده نمی‌شود.
 *
 * ستون محتوا `max-width: 760px` دارد؛ همان مقدار آرت‌بورد، چون فرم بلند
 * در عرض زیاد خوانا نمی‌ماند.
 */
export function SettingsLayout({
  entries,
  navTitle = 'تنظیمات پروژه',
  banner,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="row ai-st wrap" style={{ gap: 28, alignItems: 'flex-start' }}>
      <nav
        className="col"
        aria-label={navTitle}
        style={{ flex: '1 1 220px', maxWidth: 240, gap: 2 }}
      >
        <span className="t-xs fw6 tx5" style={{ padding: '0 10px 8px' }}>
          {navTitle}
        </span>
        {entries.map((entry) => (
          <NavLink
            key={entry.key}
            to={entry.hash ? `${entry.to}${entry.hash}` : entry.to}
            end
            className={({ isActive }) => cn('nav-a', isActive && 'on')}
            style={{ fontSize: 13 }}
          >
            <Icon name={entry.icon} size={16} />
            <span className="trunc">{entry.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="col g16" style={{ flex: '999 1 420px', maxWidth: 760, minWidth: 0 }}>
        {banner}
        {children}
      </div>
    </div>
  );
}

export interface UnsavedBannerProps {
  /** چه چیزی تغییر کرده — در بوم نام فیلد کنار پیام می‌آید. */
  changedField?: string;
  onDiscard: () => void;
  onSave: () => void;
  saving?: boolean;
}

/** نوار «تغییرات ذخیره‌نشده دارید» — دقیقاً مطابق W28. */
export function UnsavedBanner({ changedField, onDiscard, onSave, saving }: UnsavedBannerProps) {
  return (
    <div
      className="row g12 wrap"
      style={{
        padding: '10px 14px',
        background: '#FFFFFF',
        border: '1px solid var(--accent-300)',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(14, 30, 56, 0.06)',
      }}
      role="status"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: 'var(--accent-500)',
          flexShrink: 0,
        }}
      />
      <span className="t-13 fw5 tx9 grow" style={{ minWidth: 0 }}>
        تغییرات ذخیره‌نشده دارید
        {changedField && <span className="tx5"> · {changedField}</span>}
      </span>
      <button type="button" className="btn btn-g btn-sm" onClick={onDiscard}>
        صرف‌نظر
      </button>
      <button type="button" className="btn btn-p btn-sm" onClick={onSave} disabled={saving}>
        <Icon name="save" size={14} />
        ذخیرهٔ تغییرات
      </button>
    </div>
  );
}
