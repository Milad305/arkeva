import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { SearchQuery, SearchResponseDto } from '../types';

// F20 — جستجوی سریع (W43). کد دسترسی: هیچ کد جدایی ندارد؛ هر نتیجه با دسترسی
// خودِ موضوع فیلتر می‌شود (`platform.md` ۹).

export const searchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    search: build.query<SearchResponseDto, SearchQuery>({
      // پروژهٔ باز برای دستور زمینه‌ای «ثبت ریسک برای …»؛ دستورها را سرور با نقش کاربر می‌سازد (تصمیم 1405/08/22). هدف سند: پاسخ زیر ۲۵۰ms (p95)
      queryFn: serverQuery((query) => ({
        url: ENDPOINTS.SEARCH,
        params: {
          q: query.text,
          kind: query.kind,
          ...(query.projectId ? { projectId: query.projectId } : {}),
        },
      })),
      providesTags: ['WbsItem', 'Risk', 'FieldReport', 'User'],
    }),
  }),
});

export const { useSearchQuery } = searchApi;

registerApiBehavior({ search: { showErrorToast: false } });
