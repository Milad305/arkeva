import { useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { useShellIdentity } from '@/shared/components/layout/useShellIdentity';
import { Guard } from '@/shared/components/rbac/Guard';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Breadcrumbs, PageHead } from '@/shared/components/ui/PageHead';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toFaDigits } from '@/shared/utils/num';
import { useGetPortfolioSummaryQuery, useGetProjectsQuery } from '../api/projectsApi';
import { parseStatusFilter, useProjectListView } from '../hooks/useProjectListView';
import { useProjectActions, useProjectPermissions } from '../hooks/useProjectActions';
import { exportProjectsCsv } from '../services/exportProjects';
import { PortfolioStrip } from '../components/PortfolioStrip';
import { ProjectFilterBar, type ProjectsViewMode } from '../components/ProjectFilterBar';
import { ProjectsTable } from '../components/ProjectsTable';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectsOnboarding } from '../components/ProjectsOnboarding';

/**
 * پرتفوی پروژه‌ها — W07 (جدول)، W08 (کارت) و W09 (سازمان بدون پروژه).
 *
 * نما در نشانی نگه داشته می‌شود (`?view=cards`) تا قابل اشتراک و دکمهٔ بازگشت
 * مرورگر درست کار کند. فیلترها بین دو نما مشترک‌اند.
 */
export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: ProjectsViewMode = searchParams.get('view') === 'cards' ? 'cards' : 'table';

  const { data: projects = [], isLoading, isError, refetch } = useGetProjectsQuery();
  const summary = useGetPortfolioSummaryQuery();
  const view = useProjectListView(projects, parseStatusFilter(searchParams.get('status')));
  const can = useProjectPermissions();
  const actions = useProjectActions();
  const { organization } = useShellIdentity();

  function setMode(next: ProjectsViewMode) {
    setSearchParams(
      (params) => {
        if (next === 'cards') params.set('view', 'cards');
        else params.delete('view');
        return params;
      },
      { replace: true },
    );
  }

  const isEmptyOrg = !isLoading && !isError && projects.length === 0;

  return (
    <>
      <Topbar title="پروژه‌ها" icon="folder-kanban" showSearch />

      <Content>
        {isEmptyOrg ? (
          <ProjectsOnboarding />
        ) : (
          <>
            {mode === 'table' && (
              <Breadcrumbs
                items={[{ label: 'خانه', to: ROUTES.dashboard, home: true }, { label: 'پروژه‌ها' }]}
              />
            )}

            <PageHead
              style={mode === 'table' ? { marginTop: 8 } : undefined}
              title="پروژه‌ها"
              subtitle={
                mode === 'table'
                  ? `پایش پروژه‌های فعال، متوقف، پیش‌نویس و تمام‌شدهٔ ${organization.name}`
                  : `${toFaDigits(view.visible.length)} پروژه از ${toFaDigits(projects.length)} با فیلترهای فعلی`
              }
              actions={
                <>
                  <Guard permissions={['msp.import']}>
                    <LinkButton to={ROUTES.mspImport} icon="upload">
                      ورود از MSP
                    </LinkButton>
                  </Guard>
                  {mode === 'table' && (
                    <AppButton
                      icon="file-spreadsheet"
                      disabled={view.visible.length === 0}
                      onClick={() =>
                        exportProjectsCsv(view.visible, { includeAmounts: can.viewAmounts })
                      }
                    >
                      خروجی Excel
                    </AppButton>
                  )}
                  <Guard permissions={['project.create']}>
                    <LinkButton to={ROUTES.newProject} variant="primary" icon="plus">
                      پروژهٔ جدید
                    </LinkButton>
                  </Guard>
                </>
              }
            />

            {mode === 'table' && (
              <PortfolioStrip
                summary={summary.data}
                isLoading={summary.isLoading}
                showAmounts={can.viewAmounts}
              />
            )}

            <ProjectFilterBar view={view} mode={mode} onModeChange={setMode} />

            {isLoading ? (
              <Card>
                <CardBody>
                  <SkeletonTable rows={8} />
                </CardBody>
              </Card>
            ) : isError ? (
              <EmptyState
                inCard
                icon="server"
                iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
                title="فهرست پروژه‌ها بارگذاری نشد"
                description="مشکل از سمت ماست و داده‌های شما سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
                actions={
                  <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={() => void refetch()}>
                    تلاش دوباره
                  </AppButton>
                }
              />
            ) : view.visible.length === 0 ? (
              <EmptyState
                inCard
                icon="file-search"
                iconStyle={{ background: '#F4F4F5', color: '#52525B' }}
                title="پروژه‌ای با این فیلترها پیدا نشد"
                description="املای دیگری را امتحان کنید یا فیلترها را بردارید."
                actions={
                  <AppButton variant="outline" size="sm" icon="x" onClick={view.clearFilters}>
                    پاک کردن فیلترها
                  </AppButton>
                }
              />
            ) : mode === 'table' ? (
              <ProjectsTable view={view} can={can} actions={actions} />
            ) : (
              <div className="grid c3" style={{ gap: 14 }}>
                {view.visible.map((project) => (
                  <ProjectCard key={project.id} project={project} can={can} actions={actions} />
                ))}
              </div>
            )}
          </>
        )}
      </Content>

      {actions.dialogs}
    </>
  );
}
