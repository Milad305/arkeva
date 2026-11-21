import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Skeleton } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import type { Crumb } from '@/shared/components/ui/PageHead';
import { useGetProjectQuery } from '../api/projectsApi';
import { useProjectActions, useProjectPermissions, type ProjectActions, type ProjectPermissions } from '../hooks/useProjectActions';
import type { ProjectDetailDto } from '../types';
import { ProjectHeader } from './ProjectHeader';

/** آنچه پوسته به هر زبانهٔ پروژه می‌دهد. */
export interface ProjectOutletContext {
  project: ProjectDetailDto;
  can: ProjectPermissions;
  actions: ProjectActions;
}

/** خواندن پروژهٔ جاری در هر صفحهٔ زیر `/projects/:projectId`. */
export function useProjectContext(): ProjectOutletContext {
  return useOutletContext<ProjectOutletContext>();
}

/** برچسب بخش برای مسیر بالا — فقط زبانه‌هایی که سربرگ دارند. */
const SECTION_LABELS: [segment: string, label: string][] = [
  ['/wbs/edit', 'WBS — ویرایش'],
  ['/wbs/import', 'WBS — ورود از Excel'],
  ['/wbs', 'WBS'],
  ['/cbs', 'CBS'],
  ['/links', 'اتصالات'],
  ['/reports', 'گزارش‌ها'],
  ['/risks', 'ریسک‌ها'],
  ['/members', 'اعضا'],
  ['/assignment', 'تخصیص فعالیت'],
  ['/charts', 'نمودارها'],
  ['/settings', 'تنظیمات'],
  ['/msp', 'همگام‌سازی MSP'],
];

/**
 * پوستهٔ پروژه — سربرگ، زبانه‌ها و مسیر بالا برای همهٔ صفحه‌های W10 تا W30.
 * پروژه یک‌بار اینجا خوانده می‌شود و با `useProjectContext` به زبانه‌ها می‌رسد.
 */
export default function ProjectShell() {
  const { projectId = '' } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error, refetch } = useGetProjectQuery(projectId);
  const can = useProjectPermissions();
  const actions = useProjectActions({
    onDeleted: () => navigate(ROUTES.projects, { replace: true }),
  });

  const base = ROUTES.project(projectId);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const section = SECTION_LABELS.find(([segment]) => rest.startsWith(segment))?.[1];
  const isOverview = rest === '' || rest === '/';

  const crumbs: Crumb[] = [
    { label: 'خانه', to: ROUTES.dashboard, home: true },
    { label: 'پروژه‌ها', to: ROUTES.projects },
    ...(project
      ? section
        ? [{ label: project.name, to: base }, { label: section }]
        : [{ label: project.name }]
      : []),
  ];

  if (isLoading) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <section className="ph">
          <div className="ph-in" style={{ paddingBottom: 18 }}>
            <div className="row g14">
              <Skeleton width={52} height={52} />
              <div className="col g8" style={{ flex: 1 }}>
                <Skeleton width="40%" height={20} />
                <Skeleton width="70%" height={10} />
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (isError || !project) {
    const notFound =
      typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
    return (
      <>
        <Topbar crumbs={crumbs} />
        <Content>
          <EmptyState
            inCard
            icon={notFound ? 'file-search' : 'server'}
            title={notFound ? 'این پروژه پیدا نشد' : 'پروژه بارگذاری نشد'}
            description={
              notFound
                ? 'ممکن است حذف شده باشد یا شما عضو آن نباشید. از فهرست پروژه‌ها دوباره انتخاب کنید.'
                : 'مشکل از سمت ماست و داده‌های پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید.'
            }
            actions={
              notFound ? (
                <LinkButton to={ROUTES.projects} variant="primary" size="sm" icon="folder-kanban">
                  فهرست پروژه‌ها
                </LinkButton>
              ) : (
                <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={() => void refetch()}>
                  تلاش دوباره
                </AppButton>
              )
            }
          />
        </Content>
      </>
    );
  }

  const context: ProjectOutletContext = { project, can, actions };

  return (
    <>
      <Topbar crumbs={crumbs} />
      <ProjectHeader project={project} variant={isOverview ? 'full' : 'mini'} can={can} actions={actions} />
      <Outlet context={context} />
      {actions.dialogs}
    </>
  );
}
