// تایپ‌های state — بدون وابستگی به store instance (جلوگیری از circular import).
// این تایپ‌ها ساختار state را بر اساس reducerهای ثبت‌شده تعریف می‌کنند.

import type { UiState } from './uiSlice';
import type { AuthState } from './authSlice';
import type { WbsUiState } from '@/modules/wbs/store/wbsUiSlice';

// state api reducer از RTK Query می‌آید. تایپ کامل آن در baseApi است،
// ولی برای جلوگیری از circular، اینجا یک نمای ساده تعریف می‌کنیم.
interface ApiReducerState {
  config?: Record<string, { extraOptions?: Record<string, unknown> }>;
  // سایر فیلدهای RTK Query state (queries, mutations, etc.) به‌صورت structural توسط RTK مدیریت می‌شوند
  [key: string]: unknown;
}

export interface RootState {
  ui: UiState;
  auth: AuthState;
  wbsUi: WbsUiState;
  api: ApiReducerState;
}

// AppDispatch تایپ dispatch از configureStore است.
// چون configureStore در index.ts است و type-only import مجاز است، از آنجا می‌آید
// ولی برای جلوگیری از circular، آن را مستقیماً در index تعریف می‌کنیم و اینجا re-export می‌کنیم.
export type AppDispatch = typeof import('./index').store.dispatch;
