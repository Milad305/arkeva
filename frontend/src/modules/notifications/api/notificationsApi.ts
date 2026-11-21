import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { EntityId } from '@/shared/types/api';
import type { NotificationListDto, NotificationQuery, NotificationTab } from '../types';

// F13 — اعلان‌های من (notifications.md ۹). همه با `notifications.view_own` (همهٔ کاربران).

/**
 * اعلان‌ها با هر نوشتن دیگری ممکن است عوض شوند (رویداد F09، F14…)، پس به برچسب‌های
 * همان موجودیت‌ها هم وابسته‌اند تا پس از هر اقدام شمارنده تازه شود.
 */
const SOURCES = [
  'Notification',
  'FieldReport',
  'Risk',
  'PlanVersion',
  'CbsItem',
  'Assignment',
] as const;

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationListDto, NotificationQuery>({
      queryFn: serverQuery((query) => ({
        url: ENDPOINTS.NOTIFICATIONS,
        params: {
          type: query.tab === 'all' ? undefined : query.tab,
          status: query.unreadOnly ? 'unread' : undefined,
          cursor: query.cursor ?? undefined,
          limit: query.limit,
        },
      })),
      providesTags: [...SOURCES],
    }),
    getUnreadCount: build.query<{ count: number }, void>({
      queryFn: serverQuery(() => ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT),
      providesTags: [...SOURCES],
    }),
    readNotification: build.mutation<{ id: EntityId }, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.NOTIFICATION_READ(id), method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : ['Notification']),
    }),
    readAllNotifications: build.mutation<{ count: number }, NotificationTab>({
      queryFn: serverQuery((tab) => ({
        url: ENDPOINTS.NOTIFICATIONS_READ_ALL,
        method: 'POST',
        body: { type: tab === 'all' ? undefined : tab },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['Notification']),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useReadNotificationMutation,
  useReadAllNotificationsMutation,
} = notificationsApi;

registerApiBehavior({
  getNotifications: { showErrorToast: false },
  getUnreadCount: { showErrorToast: false },
  readNotification: { showErrorToast: false },
  readAllNotifications: { showErrorToast: true },
});
