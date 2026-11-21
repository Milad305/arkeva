import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { useHasPermission } from '@/shared/hooks/useHasAccess';

/**
 * زنجیرهٔ «برو به» — G و بعد یک حرف (W33 و بوم W43: `G W`، `G R`).
 *
 * دو ضربه حداکثر ۱٫۲ ثانیه فاصله دارند و وقتی فوکوس در فیلد متنی است کار نمی‌کنند.
 * هر مقصد پشت همان کد دسترسی صفحه است.
 */
const CHORD_WINDOW_MS = 1_200;

export function useGoToShortcuts(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canViewRisks = useHasPermission('risk.view');
  const canViewReports = useHasPermission('report.view');
  const canViewManagementReports = useHasPermission('reports.view');
  const canViewTemplates = useHasPermission('templates.view');
  const canInviteUsers = useHasPermission('users.invite');

  useEffect(() => {
    let armedAt = 0;

    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();

      if (Date.now() - armedAt > CHORD_WINDOW_MS) armedAt = 0;

      if (armedAt === 0) {
        if (key === 'g') armedAt = Date.now();
        return;
      }

      const destinations: Record<string, { to: string; allowed: boolean }> = {
        d: { to: ROUTES.dashboard, allowed: true },
        p: { to: ROUTES.projects, allowed: true },
        // G W: اگر پروژه‌ای باز است، WBS همان؛ وگرنه فهرست پروژه‌ها
        w: (() => {
          const match = /\/projects\/([^/?]+)/.exec(pathname);
          return { to: match ? ROUTES.wbs(match[1]!) : ROUTES.projects, allowed: true };
        })(),
        r: { to: ROUTES.risks, allowed: canViewRisks },
        f: { to: ROUTES.reports, allowed: canViewReports },
        m: { to: ROUTES.managementReports, allowed: canViewManagementReports },
        t: { to: ROUTES.templates, allowed: canViewTemplates },
        u: { to: ROUTES.users, allowed: canInviteUsers },
      };

      armedAt = 0;
      const destination = destinations[key];
      if (!destination?.allowed) return;
      event.preventDefault();
      navigate(destination.to);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, pathname, canViewRisks, canViewReports, canViewManagementReports, canViewTemplates, canInviteUsers]);
}
