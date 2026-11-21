import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '@/app/api/baseApi';
import uiReducer from './uiSlice';
import authReducer from './authSlice';
import wbsUiReducer from '@/modules/wbs/store/wbsUiSlice';
import { listenerMiddleware } from './listenerMiddleware';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    wbsUi: wbsUiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware),
});

// ذخیره auth state در localStorage برای ماندگاری بین refresh.
// این فقط برای توسعه است؛ در production بک‌اند توکن را validate می‌کند.
store.subscribe(() => {
  try {
    const authState = store.getState().auth;
    localStorage.setItem('auth_state', JSON.stringify(authState));
  } catch {
    // ignore
  }
});

// re-export تایپ‌های state (از state-types برای جلوگیری از circular)
export type { RootState, AppDispatch } from './state-types';

// re-export hookهای تایپ‌شده
export { useAppDispatch, useAppSelector } from './hooks';
