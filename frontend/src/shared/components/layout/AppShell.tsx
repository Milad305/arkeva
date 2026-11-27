import { useSyncExternalStore } from 'react';
import { Outlet } from 'react-router-dom';

import { useGetDashboardQuery } from '@/modules/dashboard/api/dashboardApi';
import { CommandPalette } from '@/modules/search/components/CommandPalette';
import { useGoToShortcuts } from '@/modules/search/hooks/useGoToShortcuts';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { useHasAccess } from '@/shared/hooks/useHasAccess';
import { displayPrefsVersion, subscribeDisplayPrefs } from '@/shared/utils/displayPrefs';
import { Sidebar, type SidebarCounts } from './Sidebar';
import { useShellIdentity } from './useShellIdentity';

/**
 * پوستهٔ اپ — `.app` + `.sb-slot` + `.main` از kit.css.
 *
 * **قرارداد واکنش‌گرایی:**
 * `.app` یک flex با `flex-wrap:wrap` است؛ `.sb-slot` پایهٔ ۲۲۴px و `.main`
 * با `flex: 999 1 560px` و `min-width:0`. یعنی در عرض کم نوار کناری
 * wrap می‌کند، نه اینکه محتوا را بیرون بزند. هیچ عرض ثابتی اینجا نیست.
 */
export function AppShell() {
  const { user, organization } = useShellIdentity();
  const canViewDashboard = useHasAccess(['dashboard.view']);
  const { data: dashboard } = useGetDashboardQuery(undefined, { skip: !canViewDashboard });
  useGoToShortcuts();
  // تغییر ترجیح نمایش (W32) قالب همهٔ عددها و تاریخ‌ها را عوض می‌کند: صفحه از نو ساخته می‌شود
  const prefsVersion = useSyncExternalStore(subscribeDisplayPrefs, displayPrefsVersion);

  const sidebarOrganization =
    dashboard?.kpis.activeCount !== undefined
      ? { ...organization, activeProjectCount: dashboard.kpis.activeCount }
      : organization;

  const sidebarCounts: SidebarCounts = {
    projects: dashboard?.kpis.totalCount,
    reports: dashboard?.pendingApprovals?.total,
    risks: dashboard?.risks?.totalOpen,
  };

  return (
    <div className="pj app" dir="rtl" lang="fa">
      <aside className="sb-slot" key={`sb-${prefsVersion}`}>
        <Sidebar organization={sidebarOrganization} user={user} counts={sidebarCounts} />
      </aside>

      <main className="main">
        <ErrorBoundary key={prefsVersion}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* W43 — جستجوی سریع؛ Ctrl+K همه‌جای اپ */}
      <CommandPalette />
    </div>
  );
}

export interface ContentProps {
  /** پانویس بیشتر برای صفحه‌هایی که جدول بلند دارند. */
  paddingBottom?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * ظرف محتوای صفحه — `.content` در kit.css.
 *
 * **تنها حد عرض مجاز در کل اپ**: `max-width: 1480px`.
 * هیچ صفحه‌ای `max-w` دیگری نمی‌گذارد و هیچ‌جا عرض px ثابت نمی‌آید.
 */
export function Content({ paddingBottom, className, children }: ContentProps) {
  return (
    <div className={className ? `content ${className}` : 'content'} style={{ paddingBottom }}>
      {children}
    </div>
  );
}
