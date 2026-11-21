import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton, IconLink } from '@/shared/components/ui/IconButton';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { toFaDigits } from '@/shared/utils/num';
import { useGetNotificationsQuery, useGetUnreadCountQuery, useReadAllNotificationsMutation } from '../api/notificationsApi';
import { NOTIFICATION_TABS } from '../services/notificationView';
import type { NotificationTab } from '../types';
import { NotificationList } from './NotificationList';

/**
 * زنگ نوار بالا و پنل W06 (تصمیم 1405/08/15: پنل + صفحهٔ کامل). پنل ۲۰ اعلان آخر هر زبانه
 * را نشان می‌دهد؛ پانویس به `/notifications` می‌رود.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useGetUnreadCountQuery(undefined, { pollingInterval: 60_000 });
  const count = unread.data?.count ?? 0;
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} style={{ position: 'relative' }}>
      <IconButton
        ref={trigger}
        icon="bell"
        ping={count > 0}
        aria-expanded={open}
        aria-haspopup="dialog"
        label={count > 0 ? `اعلان‌ها، ${toFaDigits(count)} مورد خوانده‌نشده` : 'اعلان‌ها'}
        onClick={() => setOpen((value) => !value)}
      />
      {open && <NotificationPanel unread={count} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NotificationPanel({ unread, onClose }: { unread: number; onClose: () => void }) {
  const [tab, setTab] = useState<NotificationTab>('all');
  const query = useGetNotificationsQuery({ tab, unreadOnly: false, cursor: null, limit: 20 });
  const [readAll, readAllState] = useReadAllNotificationsMutation();
  const panel = useRef<HTMLElement>(null);
  const counts = query.data?.counts;

  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <section
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label="اعلان‌ها"
      className="card"
      style={{
        position: 'fixed',
        top: 56,
        insetInlineEnd: 12,
        width: 'min(420px, calc(100vw - 24px))',
        maxHeight: 'min(720px, calc(100vh - 72px))',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        boxShadow: '0 10px 20px -5px rgba(24,24,27,0.10), 0 4px 8px -4px rgba(24,24,27,0.05)',
        outline: 'none',
      }}
    >
      <div className="row between" style={{ padding: '14px 16px 10px' }}>
        <h2 className="h-hd row g8" style={{ margin: 0 }}>
          اعلان‌ها
          {unread > 0 && (
            <Badge size="sm" tone="err" pill>
              {`${toFaDigits(unread)} جدید`}
            </Badge>
          )}
        </h2>
        <div className="row g4">
          <button type="button" className="link" style={{ fontSize: 12 }} disabled={unread === 0 || readAllState.isLoading} onClick={() => void readAll(tab)}>
            همه خوانده شد
          </button>
          <IconLink icon="settings" to={ROUTES.account} label="تنظیمات اعلان‌ها" size="sm" onClick={onClose} />
        </div>
      </div>
      <div style={{ padding: '0 16px 10px', borderBottom: '1px solid #F4F4F5' }}>
        <SegmentedControl
          fill
          activeKey={tab}
          onChange={(key) => setTab(key as NotificationTab)}
          items={NOTIFICATION_TABS.map((entry) => ({
            key: entry.key,
            label: counts && entry.key !== 'system' ? `${entry.label} (${toFaDigits(counts[entry.key])})` : entry.label,
          }))}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 120 }}>
        {query.isLoading ? (
          <div style={{ padding: 16 }}>
            <SkeletonTable rows={4} />
          </div>
        ) : !query.data || query.data.items.length === 0 ? (
          <div className="col g6" style={{ alignItems: 'center', padding: '36px 16px' }}>
            <Icon name="bell-off" size={22} className="tx5" />
            <span className="t-13 tx6">{query.isError ? 'اعلان‌ها بارگذاری نشد؛ دوباره باز کنید.' : 'اعلانی در این دسته نیست.'}</span>
          </div>
        ) : (
          <NotificationList items={query.data.items} onNavigate={onClose} compact />
        )}
      </div>
      <div className="card-f" style={{ justifyContent: 'center' }}>
        <Link className="link row g4" to={ROUTES.notifications} onClick={onClose}>
          مشاهدهٔ همهٔ اعلان‌ها
          <Icon name="chevron-left" size={12} />
        </Link>
      </div>
    </section>
  );
}
