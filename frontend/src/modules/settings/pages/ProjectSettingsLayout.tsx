import { useCallback, useEffect, useState } from 'react';
import { Outlet, useBlocker, useLocation, useOutletContext } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { SettingsLayout, type SettingsNavEntry } from '@/shared/components/layout/SettingsLayout';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { useProjectContext, type ProjectOutletContext } from '@/modules/projects/layout/ProjectShell';
import { useGetProjectSettingsQuery } from '../api/settingsApi';
import { DirtyProvider } from '../components/SettingsKit';
import type { ProjectSettingsDto } from '../types';

export interface SettingsContext extends ProjectOutletContext {
  settings: ProjectSettingsDto;
  canEdit: boolean;
  canViewAmounts: boolean;
}

export const useSettingsContext = () => useOutletContext<SettingsContext>();

/**
 * پوستهٔ تنظیمات پروژه (W28، W29، W30؛ F02 ۷): ناوبری بخش‌ها و نگهبان ترک صفحه با تغییر
 * ذخیره‌نشده. همه با `project.settings.edit`؛ بخش‌های دیگر مجوز خودشان را دارند.
 */
export default function ProjectSettingsLayout() {
  const context = useProjectContext();
  const { project } = context;
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const canEdit = useHasPermission('project.settings.edit') && project.status !== 'archived';
  const query = useGetProjectSettingsQuery({ projectId: project.id, canViewAmounts });
  const [dirty, setDirty] = useState<string[]>([]);
  const onDirty = useCallback((keys: string[]) => setDirty(keys), []);
  const { hash, pathname } = useLocation();
  // پیوندهای بخش (#calendar، #routes…) پس از بارگذاری به همان کارت می‌روند
  useEffect(() => {
    if (!query.data) return;
    const id = hash.replace('#', '');
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [hash, pathname, query.data]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty.length > 0 && currentLocation.pathname !== nextLocation.pathname);

  const general = ROUTES.projectSettings(project.id);
  const workflow = ROUTES.settingsWorkflow(project.id);
  const integrations = ROUTES.settingsIntegrations(project.id);
  const entries: SettingsNavEntry[] = [
    { key: 'general', label: 'اطلاعات عمومی', icon: 'info', to: general },
    { key: 'calendar', label: 'تقویم و روزهای کاری', icon: 'calendar-days', to: general, hash: '#calendar' },
    { key: 'progress', label: 'پیشرفت و محاسبات', icon: 'percent', to: workflow },
    { key: 'field', label: 'قواعد گزارش کارگاه', icon: 'smartphone', to: workflow, hash: '#field' },
    { key: 'workflow', label: 'گردش‌کار تأیید', icon: 'git-merge', to: workflow, hash: '#workflow' },
    { key: 'periods', label: 'دوره‌های گزارش', icon: 'calendar-check', to: workflow, hash: '#periods' },
    { key: 'notifications', label: 'اعلان‌ها', icon: 'bell', to: integrations },
    { key: 'alerts', label: 'قواعد هشدار', icon: 'alert-triangle', to: integrations, hash: '#alerts' },
    { key: 'integrations', label: 'یکپارچه‌سازی', icon: 'plug', to: integrations, hash: '#integrations' },
    { key: 'backups', label: 'پشتیبان و خروجی', icon: 'database-backup', to: integrations, hash: '#backups' },
    { key: 'danger', label: 'منطقهٔ خطر', icon: 'alert-octagon', to: integrations, hash: '#danger' },
  ];

  return (
    <Content>
      <SettingsLayout entries={entries}>
        {query.isLoading ? (
          <SkeletonTable rows={10} />
        ) : query.isError || !query.data ? (
          <EmptyState
            inCard
            icon="server"
            title="تنظیمات بارگذاری نشد"
            description="چند لحظهٔ دیگر دوباره امتحان کنید."
            actions={
              <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
                تلاش دوباره
              </AppButton>
            }
          />
        ) : (
          <DirtyProvider onChange={onDirty}>
            <Outlet context={{ ...context, settings: query.data, canEdit, canViewAmounts } satisfies SettingsContext} />
          </DirtyProvider>
        )}
      </SettingsLayout>
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        tone="warning"
        icon="alert-triangle"
        title="تغییرات ذخیره‌نشده"
        description="اگر این صفحه را ترک کنید، تغییرهای ذخیره‌نشده از بین می‌رود."
        confirmLabel="ترک صفحه"
        cancelLabel="ماندن و ذخیره"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </Content>
  );
}
