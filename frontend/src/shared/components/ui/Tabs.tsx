import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { Icon, type IconName } from './Icon';

/** شمارندهٔ کنار عنوان زبانه — tone خنثی، هشدار یا خطا. */
export type TabCountTone = 'neu' | 'w' | 'e';

export interface TabItem {
  key: string;
  label: string;
  icon?: IconName;
  /** مسیر — اگر بیاید زبانه یک `NavLink` واقعی است. */
  to?: string;
  count?: number;
  countTone?: TabCountTone;
}

export interface TabsProps {
  items: TabItem[];
  /** برای زبانه‌های بدون مسیر (کنترل‌شده). */
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * نوار زبانه — `.tabs` در kit.css.
 * `overflow-x:auto` دارد، پس در عرض کم اسکرول افقی می‌گیرد و هیچ زبانه‌ای حذف نمی‌شود.
 */
export function Tabs({ items, activeKey, onChange, className, style }: TabsProps) {
  return (
    <nav className={cn('tabs', className)} style={style} aria-label="بخش‌ها">
      {items.map((item) =>
        item.to ? (
          <NavLink
            key={item.key}
            to={item.to}
            end
            className={({ isActive }) => cn('tab', isActive && 'on')}
          >
            <TabInner item={item} />
          </NavLink>
        ) : (
          <button
            key={item.key}
            type="button"
            className={cn('tab', activeKey === item.key && 'on')}
            aria-current={activeKey === item.key ? 'page' : undefined}
            onClick={() => onChange?.(item.key)}
          >
            <TabInner item={item} />
          </button>
        ),
      )}
    </nav>
  );
}

function TabInner({ item }: { item: TabItem }) {
  return (
    <>
      {item.icon && <Icon name={item.icon} size={14} />}
      {item.label}
      {item.count !== undefined && (
        <span className={cn('n', item.countTone && item.countTone !== 'neu' && item.countTone)}>
          {toFaDigits(item.count)}
        </span>
      )}
    </>
  );
}

export interface SegmentedItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  to?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  items: SegmentedItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  /** `.seg.pri` — حالت انتخاب‌شده سرمه‌ای تو‌پر می‌شود. */
  emphasis?: boolean;
  /** هر گزینه عرض مساوی بگیرد — بوم در پنل فیلتر WBS این‌طور دارد. */
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** کنترل بخش‌بندی‌شده — `.seg` در kit.css. */
export function SegmentedControl({
  items,
  activeKey,
  onChange,
  emphasis,
  fill,
  className,
  style,
}: SegmentedControlProps) {
  const itemStyle = fill ? { flex: '1 1 0', justifyContent: 'center' } : undefined;

  return (
    <div
      className={cn('seg', emphasis && 'pri', className)}
      style={style}
      role="group"
      aria-label="نما"
    >
      {items.map((item) =>
        item.to ? (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) => cn(isActive && 'on')}
            style={itemStyle}
          >
            {item.icon && <Icon name={item.icon} size={13} />}
            {item.label}
          </NavLink>
        ) : (
          <button
            key={item.key}
            type="button"
            className={cn(activeKey === item.key && 'on')}
            style={itemStyle}
            aria-pressed={activeKey === item.key}
            disabled={item.disabled}
            onClick={() => onChange?.(item.key)}
          >
            {item.icon && <Icon name={item.icon} size={13} />}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
