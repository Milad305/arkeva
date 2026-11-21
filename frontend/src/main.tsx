import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

// ترتیب بارگذاری مهم است و عمدی:
//   base   — لایه‌های Tailwind (preflight و utilityها)
//   tokens — توکن‌های دیزاین سیستم، export شده از بوم
//   kit    — کیت کامپوننت بوم؛ بعد از Tailwind می‌آید تا بر preflight غالب باشد
//   app    — تنظیمات سطح سند که در kit نیستند
import '@/shared/styles/base.css';
import '@/shared/styles/tokens.css';
import '@/shared/styles/kit.css';
import '@/shared/styles/app.css';

import { store } from '@/app/store';
import { router } from '@/app/router/routes';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { registerTopbarBell } from '@/shared/components/layout/topbarSlots';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';

// زنگ اعلان F13 در نوار بالا (W06)
registerTopbarBell(NotificationBell);

const container = document.getElementById('root');
if (!container) {
  throw new Error('عنصر #root در index.html پیدا نشد.');
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <ToastHost />
    </Provider>
  </StrictMode>,
);
