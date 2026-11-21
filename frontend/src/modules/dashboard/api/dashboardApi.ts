import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { ActivityEventDto } from '@/modules/charts/types';
import type { DashboardDto } from '../types';

// W05 — `GET /dashboard` (تجمیعی، `[پیش‌فرض فنی]`) و `GET /activity` (فعالیت‌های اخیر
// همهٔ پروژه‌های کاربر). هر دو با دامنهٔ دادهٔ کاربر در سرور فیلتر می‌شوند (D11)؛
// بخش‌های بی‌دسترسی (`pendingApprovals`، `risks`) `null` برمی‌گردند.

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboard: build.query<DashboardDto, void>({
      queryFn: serverQuery(() => ENDPOINTS.DASHBOARD),
      providesTags: [{ type: 'Dashboard', id: 'org' }],
    }),

    getMyActivity: build.query<ActivityEventDto[], { limit?: number } | void>({
      queryFn: serverQuery((arg) => ({
        url: ENDPOINTS.ACTIVITY_MINE,
        params: { limit: arg?.limit ?? 10 },
      })),
      providesTags: [{ type: 'ActivityLog', id: 'mine' }],
    }),
  }),
});

export const { useGetDashboardQuery, useGetMyActivityQuery } = dashboardApi;

registerApiBehavior({
  getDashboard: { showErrorToast: false },
  getMyActivity: { showErrorToast: false },
});
