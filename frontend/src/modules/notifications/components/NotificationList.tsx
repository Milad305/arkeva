import { useNavigate } from 'react-router-dom';

import { IconBox } from '@/shared/components/ui/IconBox';
import { formatRelativeTime } from '@/shared/utils/date';
import { useReadNotificationMutation } from '../api/notificationsApi';
import { groupByDay, visualOf } from '../services/notificationView';
import type { NotificationDto } from '../types';

/**
 * فهرست اعلان‌ها با گروه روز (W06): آیکن و رنگ از کد، متن، پروژه و زمان، نقطهٔ آبی برای
 * خوانده‌نشده. کلیک: خواندن و رفتن به صفحهٔ موضوع (برای گزارش، W40 همان‌جا باز می‌شود).
 */
export function NotificationList({ items, onNavigate, compact }: { items: NotificationDto[]; onNavigate?: () => void; compact?: boolean }) {
  const navigate = useNavigate();
  const [read] = useReadNotificationMutation();

  return (
    <div className="col">
      {groupByDay(items).map((group) => (
        <div key={group.label} className="col">
          <div className="sect-t" style={{ padding: '10px 16px 4px' }}>
            {group.label}
          </div>
          {group.items.map((item) => {
            const visual = visualOf(item);
            const unread = !item.readAt;
            return (
              <button
                key={item.id}
                type="button"
                className="row g10 ai-st"
                style={{ padding: '10px 16px', background: unread ? '#F8FAFD' : '#FFFFFF', borderBottom: '1px solid #F4F4F5', textAlign: 'start', width: '100%' }}
                onClick={() => {
                  if (unread) void read(item.id);
                  onNavigate?.();
                  navigate(item.link);
                }}
              >
                <IconBox icon={visual.icon} tone={visual.tone} size="sm" />
                <span className="col g2 grow" style={{ minWidth: 0 }}>
                  <span className={`t-12 lh ${unread ? 'tx9 fw5' : 'tx8'}`}>{item.title}</span>
                  {!compact && item.body && <span className="t-xs tx6 lh">{item.body}</span>}
                  <span className="t-xs tx5">
                    {item.projectName ?? 'همهٔ پروژه‌ها'} · {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                {unread && <span className="dot" style={{ color: '#2563EB', marginTop: 6 }} aria-label="خوانده‌نشده" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
