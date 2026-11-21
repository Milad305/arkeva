import { useEffect, useState } from 'react';

import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Card } from '@/shared/components/ui/Card';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { Tabs } from '@/shared/components/ui/Tabs';
import { toFaDigits } from '@/shared/utils/num';
import { useGetNotificationsQuery, useReadAllNotificationsMutation } from '../api/notificationsApi';
import { NotificationList } from '../components/NotificationList';
import { NOTIFICATION_TABS } from '../services/notificationView';
import type { NotificationDto, NotificationTab } from '../types';

const PAGE = 100;

/**
 * W06 صفحهٔ کامل — `/notifications`: همان زبانه‌ها، «فقط خوانده‌نشده»، «همه خوانده شد» و
 * ۱۰۰ اعلان آخر با «بارگذاری بیشتر» (notifications.md ۷). نگه‌داری ۱۸۰ روز در سرور.
 */
export default function NotificationsPage() {
  const [tab, setTab] = useState<NotificationTab>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<NotificationDto[]>([]);
  const query = useGetNotificationsQuery({ tab, unreadOnly, cursor, limit: PAGE });
  const [readAll, readAllState] = useReadAllNotificationsMutation();

  useEffect(() => {
    setCursor(null);
    setLoaded([]);
  }, [tab, unreadOnly]);

  // صفحه‌های قبلی + صفحهٔ جاری (هر صفحه با ابطال کش تازه می‌شود)
  const current = query.data?.items ?? [];
  const items = cursor ? [...loaded, ...current.filter((item) => !loaded.some((entry) => entry.id === item.id))] : current;
  const data = query.data;

  return (
    <>
      <Topbar title="اعلان‌ها" icon="bell" />
      <Content>
        <PageHead
          title="اعلان‌ها"
          subtitle={data ? `${toFaDigits(data.unreadCount)} اعلان خوانده‌نشده` : undefined}
          actions={
            <AppButton variant="outline" size="sm" icon="check-check" disabled={!data || data.unreadCount === 0} loading={readAllState.isLoading} onClick={() => void readAll(tab)}>
              همه خوانده شد
            </AppButton>
          }
        />
        <Card style={{ maxWidth: 820 }}>
          <div className="row wrap between g8" style={{ padding: '8px 16px 0', borderBottom: '1px solid #E4E4E7' }}>
            <Tabs
              items={NOTIFICATION_TABS.map((entry) => ({ key: entry.key, label: entry.label, count: data?.counts[entry.key] }))}
              activeKey={tab}
              onChange={(key) => setTab(key as NotificationTab)}
              style={{ padding: 0, borderBottom: 0 }}
            />
            <Switch checked={unreadOnly} onChange={setUnreadOnly} label="فقط خوانده‌نشده" />
          </div>
          {query.isLoading && !cursor ? (
            <div style={{ padding: 16 }}>
              <SkeletonTable rows={6} />
            </div>
          ) : query.isError ? (
            <EmptyState
              icon="server"
              title="اعلان‌ها بارگذاری نشد"
              description="چند لحظهٔ دیگر دوباره امتحان کنید."
              actions={
                <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
                  تلاش دوباره
                </AppButton>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState icon="bell-off" title={unreadOnly ? 'اعلان خوانده‌نشده‌ای نیست' : 'اعلانی در این دسته نیست'} description="اعلان‌های تازه اینجا و روی زنگ نوار بالا دیده می‌شوند." />
          ) : (
            <>
              <NotificationList items={items} />
              {data?.nextCursor && (
                <div className="row" style={{ justifyContent: 'center', padding: 12 }}>
                  <AppButton
                    variant="outline"
                    size="sm"
                    loading={query.isFetching}
                    onClick={() => {
                      setLoaded(items);
                      setCursor(data.nextCursor);
                    }}
                  >
                    بارگذاری بیشتر
                  </AppButton>
                </div>
              )}
            </>
          )}
        </Card>
      </Content>
    </>
  );
}
