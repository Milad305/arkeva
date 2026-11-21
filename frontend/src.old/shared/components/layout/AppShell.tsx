import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { useAppSelector } from '@/app/store';

// مطابق designs/Projects.html AppShell: Sidebar راست + Topbar بالا + محتوا.
// محتوا در <Outlet /> قرار می‌گیرد و با ErrorBoundary محافظت می‌شود.

export function AppShell() {
  const globalLoading = useAppSelector((state) => state.ui.globalLoading);

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      {/* سایدبار راست (در RTL) — sticky با height 100vh مطابق designs */}
      <Sidebar />

      {/* بخش اصلی: topbar + content در یک ستون قابل scroll.
          مطابق designs/Project.html: topbar sticky در top:0، proj-header sticky در top:56px،
          همه با هم scroll می‌شوند. */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TODO: عنوان topbar را از context/route dynamic کن */}
        <Topbar title="پروژه‌یار" />

        {/* overlay لودینگ سراسری — خارج از main چون fixed است */}
        {globalLoading.isLoading && (
          <div className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-[1px] flex items-start justify-center pt-20 pointer-events-none">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-5 py-3 flex items-center gap-3 pointer-events-auto">
              <svg
                className="spin"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round" />
              </svg>
              <span className="text-sm text-gray-700">{globalLoading.message}</span>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// برای صفحاتی که topbar/sidebar نمی‌خواهند (مثل login)
export function BlankLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
