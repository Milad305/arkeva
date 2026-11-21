import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '@/app/api/baseApi';
import { authReducer } from './authSlice';
import { uiReducer } from './uiSlice';
import { listenerMiddleware } from './listenerMiddleware';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export * from './hooks';
