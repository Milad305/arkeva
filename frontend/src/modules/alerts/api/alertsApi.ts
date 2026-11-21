import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { MyAlertsDto } from '../types';

// F12 سمت خواندن (`04-alert-engine.md` ۸) — `GET /alerts/mine` با `alerts.view`.
// دیدن و رد کردن (`/seen`، `/dismiss`) با صفحهٔ هشدارهای پروژه می‌آید.

export const alertsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyAlerts: build.query<MyAlertsDto, { limit?: number } | void>({
      queryFn: serverQuery((arg) => ({
        url: ENDPOINTS.ALERTS_MINE,
        params: { status: 'open,seen', limit: arg?.limit ?? 5 },
      })),
      providesTags: [{ type: 'Alert', id: 'mine' }],
    }),
  }),
});

export const { useGetMyAlertsQuery } = alertsApi;

registerApiBehavior({ getMyAlerts: { showErrorToast: false } });
