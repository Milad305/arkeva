import {
  createListenerMiddleware,
  isAnyOf,
  isRejectedWithValue,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { behaviorFor, type ApiBehaviorConfig } from '@/app/api/behavior';
import { toast } from '@/shared/components/feedback/toastStore';
import { startLoading, stopLoading } from './uiSlice';
import { setCredentials, logout, type AuthState } from './authSlice';
import { writeSession } from './authStorage';

/**
 * رفتار سراسری API.
 * کامپوننت‌ها هیچ toast یا نشانگر بارگذاری محلی برای فراخوانی API نمی‌سازند؛
 * رفتار هر endpoint در `app/api/behavior.ts` ثبت می‌شود و اینجا اجرا می‌شود.
 */
export const listenerMiddleware = createListenerMiddleware();

/** شکل اکشن‌های چرخهٔ عمر RTK Query که به آن نیاز داریم. */
interface RtkLifecycleAction extends UnknownAction {
  meta?: {
    arg?: {
      endpointName?: string;
      type?: 'query' | 'mutation';
    };
  };
  payload?: unknown;
}

function configOf(action: UnknownAction): ApiBehaviorConfig | undefined {
  return behaviorFor((action as RtkLifecycleAction).meta?.arg?.endpointName);
}

function isMutation(action: UnknownAction): boolean {
  return (action as RtkLifecycleAction).meta?.arg?.type === 'mutation';
}

const endsWith = (suffix: string) => (action: UnknownAction) =>
  typeof action.type === 'string' && action.type.endsWith(suffix);

const isPending = endsWith('/pending');
const isFulfilled = endsWith('/fulfilled');
const isRejected = endsWith('/rejected');

const isApiAction = (action: UnknownAction) =>
  typeof action.type === 'string' && action.type.startsWith('api/');

// ── نشانگر بارگذاری سراسری ──
listenerMiddleware.startListening({
  predicate: (action) =>
    isApiAction(action) &&
    isPending(action) &&
    isMutation(action) &&
    configOf(action)?.showGlobalLoading === true,
  effect: (action, api) => {
    api.dispatch(startLoading(configOf(action)?.loadingMessage));
  },
});

listenerMiddleware.startListening({
  predicate: (action) =>
    isApiAction(action) &&
    (isFulfilled(action) || isRejected(action)) &&
    isMutation(action) &&
    configOf(action)?.showGlobalLoading === true,
  effect: (_action, api) => {
    api.dispatch(stopLoading());
  },
});

// ── پیام موفقیت ──
listenerMiddleware.startListening({
  predicate: (action) =>
    isApiAction(action) && isFulfilled(action) && configOf(action)?.showSuccessToast === true,
  effect: (action) => {
    const message = configOf(action)?.successMessage;
    if (message) toast.success(message);
  },
});

// ── پیام خطا ──
// پیش‌فرض روشن است: هر خطای API دیده می‌شود، مگر صریحاً خاموش شود.
//
// فقط `isRejectedWithValue` خطای واقعی است. RTK Query برای اشتراک تکراری روی query
// در جریان (مثلاً mount دوبارهٔ StrictMode) هم اکشن `rejected` می‌فرستد، ولی با
// `meta.condition: true` و بدون مقدار — آن خطا نیست و نباید toast بسازد.
listenerMiddleware.startListening({
  predicate: (action) => isApiAction(action) && isRejectedWithValue(action),
  effect: (action) => {
    const config = configOf(action);
    if (config?.showErrorToast === false) return;

    const payload = (action as RtkLifecycleAction).payload;
    const serverMessage =
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      payload.data &&
      typeof payload.data === 'object' &&
      'message' in payload.data
        ? String((payload.data as { message: unknown }).message)
        : undefined;

    toast.error(
      config?.errorMessage ?? serverMessage ?? 'انجام نشد. چند لحظهٔ دیگر دوباره تلاش کنید.',
    );
  },
});

// ── ماندگاری نشست ──
// reducerها خالص می‌مانند؛ نوشتن در localStorage اینجا انجام می‌شود،
// فقط هنگام ورود و خروج — نه روی هر dispatch.
listenerMiddleware.startListening({
  matcher: isAnyOf(setCredentials, logout),
  effect: (_action, api) => {
    const { auth } = api.getState() as { auth: AuthState };
    if (!auth.accessToken || !auth.user) {
      writeSession(null);
      return;
    }
    writeSession({
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken ?? undefined,
      userId: auth.user.id,
    });
  },
});
