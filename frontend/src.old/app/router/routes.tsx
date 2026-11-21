import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell, BlankLayout } from '@/shared/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { PlaceholderPage } from '@/shared/components/PlaceholderPage';
import { ProjectLayout } from '@/modules/projects/layout/ProjectLayout';

// مطابق frontend-react.md بخش ۷:
// - همه pageها lazy-loaded
// - همه routeها اینجا تعریف می‌شوند (نه در App.tsx)
// - نقشه هر صفحه به ماژول مربوطه در docs/rules/frontend-react.md بخش ۱۰

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const ProjectsPage = lazy(() => import('@/modules/projects/pages/ProjectsPage'));
const ProjectOverviewPage = lazy(
  () => import('@/modules/projects/pages/ProjectOverviewPage'),
);
const WbsPage = lazy(() => import('@/modules/wbs/pages/WbsPage'));

// Suspense wrapper
const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<div className="p-8 text-sm text-gray-500">در حال بارگذاری...</div>}>
    {element}
  </Suspense>
);

export const router = createBrowserRouter([
  // ── صفحات عمومی (بدون AppShell) ──
  {
    path: '/login',
    element: (
      <BlankLayout>
        {withSuspense(<LoginPage />)}
      </BlankLayout>
    ),
  },

  // ── صفحات محافظت‌شده (با AppShell) ──
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: withSuspense(<PlaceholderPage title="داشبورد" />),
      },
      {
        path: '/projects',
        element: withSuspense(<ProjectsPage />),
      },

      // ── جزئیات پروژه: همهٔ تب‌ها با layout مشترک ProjectLayout ──
      // ProjectLayout شامل header sticky + tabs است و محتوای تب در <Outlet/> رندر می‌شود.
      {
        path: '/projects/:projectId',
        element: <ProjectLayout />,
        children: [
          {
            index: true,
            element: withSuspense(<ProjectOverviewPage />),
          },
          {
            path: 'wbs',
            element: withSuspense(<WbsPage />),
          },
          {
            path: 'cbs',
            element: withSuspense(<PlaceholderPage title="مدیریت CBS" />),
          },
          {
            path: 'links',
            element: withSuspense(<PlaceholderPage title="اتصالات WBS ↔ CBS" />),
          },
          {
            path: 'reports',
            element: withSuspense(<PlaceholderPage title="گزارش‌های فیلد" />),
          },
          {
            path: 'members',
            element: withSuspense(<PlaceholderPage title="اعضای پروژه" />),
          },
          {
            path: 'charts',
            element: withSuspense(<PlaceholderPage title="نمودارها" />),
          },
          {
            path: 'settings',
            element: withSuspense(<PlaceholderPage title="تنظیمات پروژه" />),
          },
        ],
      },

      {
        path: '/reports',
        element: withSuspense(<PlaceholderPage title="گزارش‌های فیلد" />),
      },
      {
        path: '/wbs',
        element: withSuspense(<PlaceholderPage title="WBS / CBS" />),
      },
      {
        path: '/links',
        element: withSuspense(<PlaceholderPage title="اتصالات" />),
      },
      {
        path: '/members',
        element: withSuspense(<PlaceholderPage title="کاربران" />),
      },
      {
        path: '/charts',
        element: withSuspense(<PlaceholderPage title="گزارش‌های مدیریتی" />),
      },
      {
        path: '/settings',
        element: withSuspense(<PlaceholderPage title="تنظیمات" />),
      },
    ],
  },

  // ── 404 ──
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

