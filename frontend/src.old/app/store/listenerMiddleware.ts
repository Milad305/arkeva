import { createListenerMiddleware } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import { setGlobalLoading } from './uiSlice';

// middleware گوش‌به‌گو برای رفتار سراسری API (مطابق frontend-react.md بخش ۴).
// showGlobalLoading + showSuccessToast + showErrorToast را هندل می‌کند.
//
// نکته معماری: برای جلوگیری از circular import (store ← listenerMiddleware ← store)،
// اینجا listener را بدون پارامتر تایپ می‌سازیم و تایپ‌ها را در داخل به‌صورت structural اعمال می‌کنیم.

interface ActionWithMeta {
  type: string;
  meta?: { arg?: { endpointName?: string } };
  error?: { data?: { message?: string } };
  payload?: { message?: string };
}

interface MinimalRootState {
  auth: { accessToken: string | null };
  ui: { globalLoading: { isLoading: boolean; message: string | null } };
  api?: {
    config?: Record<string, { extraOptions?: Record<string, unknown> }>;
  };
}

interface MinimalDispatch {
  (action: { type: string; payload?: unknown }): void;
}

interface MinimalListenerApi {
  getState: () => MinimalRootState;
  dispatch: MinimalDispatch;
}

// تایپ‌های ساختار state — بدون وابستگی به store instance.
export type AppListenerApi = MinimalListenerApi;

const listenerMiddleware = createListenerMiddleware();

const startAppListening = listenerMiddleware.startListening as unknown as (config: {
  predicate?: (action: unknown) => action is ActionWithMeta;
  effect: (action: ActionWithMeta, listenerApi: MinimalListenerApi) => Promise<void> | void;
}) => () => void;

// استخراج endpointName و extraOptions از state api
function getEndpointMeta(
  state: MinimalRootState,
  endpointName: string,
): {
  showGlobalLoading?: boolean;
  loadingMessage?: string;
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
} | undefined {
  const eo = state.api?.config?.[endpointName]?.extraOptions;
  return eo as
    | {
        showGlobalLoading?: boolean;
        loadingMessage?: string;
        showSuccessToast?: boolean;
        successMessage?: string;
        showErrorToast?: boolean;
      }
    | undefined;
}

// هندل خطای سراسری (query/mutation rejected)
startAppListening({
  predicate: (action): action is ActionWithMeta =>
    !!action && typeof (action as ActionWithMeta).type === 'string' &&
    /\/(query|mutation)\/rejected$/.test((action as ActionWithMeta).type),
  effect: async (action, listenerApi) => {
    const endpointName = action.meta?.arg?.endpointName;
    if (!endpointName) return;

    const extraOptions = getEndpointMeta(listenerApi.getState(), endpointName);
    if (extraOptions?.showErrorToast === false) return;

    const message = action.error?.data?.message ?? 'خطایی رخ داد. دوباره تلاش کنید.';
    toast.error(message);
  },
});

// هندل موفقیت mutation (toast موفقیت)
startAppListening({
  predicate: (action): action is ActionWithMeta =>
    !!action && /\/mutation\/fulfilled$/.test((action as ActionWithMeta).type),
  effect: async (action, listenerApi) => {
    const endpointName = action.meta?.arg?.endpointName;
    if (!endpointName) return;

    const extraOptions = getEndpointMeta(listenerApi.getState(), endpointName);
    if (!extraOptions?.showSuccessToast) return;

    const message =
      extraOptions.successMessage ?? action.payload?.message ?? 'عملیات با موفقیت انجام شد.';
    toast.success(message);
  },
});

// هندل globalLoading برای mutationها
let loadingTimer: ReturnType<typeof setTimeout> | null = null;

startAppListening({
  predicate: (action): action is ActionWithMeta =>
    !!action && /\/mutation\/pending$/.test((action as ActionWithMeta).type),
  effect: async (action, listenerApi) => {
    const endpointName = action.meta?.arg?.endpointName;
    if (!endpointName) return;

    const extraOptions = getEndpointMeta(listenerApi.getState(), endpointName);
    if (!extraOptions?.showGlobalLoading) return;

    loadingTimer = setTimeout(() => {
      listenerApi.dispatch(
        setGlobalLoading({
          isLoading: true,
          message: extraOptions.loadingMessage ?? 'در حال پردازش...',
        }),
      );
    }, 300);
  },
});

startAppListening({
  predicate: (action): action is ActionWithMeta =>
    !!action && /\/mutation\/(fulfilled|rejected)$/.test((action as ActionWithMeta).type),
  effect: async (_action, listenerApi) => {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    listenerApi.dispatch(setGlobalLoading({ isLoading: false }));
  },
});

export { listenerMiddleware };
