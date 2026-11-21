import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { useShellIdentity } from '@/shared/components/layout/useShellIdentity';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonKpiRow, SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { PageHead } from '@/shared/components/ui/PageHead';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDateWithWeekday } from '@/shared/utils/date';
import { AttentionCard } from '@/modules/alerts/components/AttentionCard';
import { RecentActivityCard } from '@/modules/charts/components/OverviewSections';
import { useGetDashboardQuery, useGetMyActivityQuery } from '../api/dashboardApi';
import {
  ActiveProjectsCard,
  DashboardKpis,
  PendingApprovalsCard,
  ProgressComparisonCard,
  RisksCard,
  TrendCard,
} from '../components/DashboardSections';

/**
 * W05 — داشبورد سازمان (`features/charts.md` ۶.۱): «مدیر صبح که پنل را باز می‌کند
 * باید در ۳۰ ثانیه بفهمد کجا باید نگاه کند.»
 *
 * هر بخش با کد دسترسی ماژول خودش دیده می‌شود؛ سرور هم بخش بی‌دسترسی را `null`
 * برمی‌گرداند (D11). دکمهٔ «این ماه» بوم حذف شد (تصمیم 1405/08/15): همهٔ کارت‌ها
 * وضعیت امروزند.
 */
export default function DashboardPage() {
  const { user } = useShellIdentity();
  const dashboard = useGetDashboardQuery();
  const activity = useGetMyActivityQuery({ limit: 10 });

  const canCreate = useHasPermission('project.create');
  const approvesStage1 = useHasPermission('report.approve.stage1');
  const approvesStage2 = useHasPermission('report.approve.stage2');
  const isApprover = approvesStage1 || approvesStage2;
  const canAlerts = useHasPermission('alerts.view');
  const canRisks = useHasPermission('risk.view');
  const canChartsFull = useHasPermission('charts.view');
  const canChartsSummary = useHasPermission('charts.view_summary');
  const canCharts = canChartsFull || canChartsSummary;

  const data = dashboard.data;

  return (
    <>
      <Topbar title="داشبورد" icon="layout-dashboard" showSearch />
      <Content>
        <PageHead
          title={`خوش آمدید، ${user.fullName}`}
          subtitle={`خلاصهٔ پروژه‌های شما — ${formatJalaliDateWithWeekday(new Date())}`}
          actions={
            canCreate ? (
              <LinkButton to={ROUTES.newProject} variant="primary" icon="plus">
                پروژهٔ جدید
              </LinkButton>
            ) : undefined
          }
        />

        {dashboard.isLoading ? (
          <>
            <SkeletonKpiRow count={4} columns={4} />
            <Card style={{ marginTop: 16 }}>
              <CardBody>
                <SkeletonTable rows={6} />
              </CardBody>
            </Card>
          </>
        ) : dashboard.isError || !data ? (
          <EmptyState
            inCard
            icon="server"
            iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
            title="داشبورد بارگذاری نشد"
            description="مشکل از سمت ماست و داده‌های پروژه‌ها سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
            actions={
              <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={() => void dashboard.refetch()}>
                تلاش دوباره
              </AppButton>
            }
          />
        ) : data.kpis.totalCount === 0 ? (
          <EmptyState
            inCard
            icon="folder-plus"
            title="هنوز پروژه‌ای ندارید"
            description="اولین پروژه را بسازید یا منتظر بمانید تا شما را به پروژه‌ای اضافه کنند."
            actions={
              canCreate ? (
                <LinkButton to={ROUTES.newProject} variant="primary" size="sm" icon="plus">
                  پروژهٔ جدید
                </LinkButton>
              ) : (
                <LinkButton to={ROUTES.projects} variant="outline" size="sm" icon="folder-kanban">
                  فهرست پروژه‌ها
                </LinkButton>
              )
            }
          />
        ) : (
          <>
            <DashboardKpis kpis={data.kpis} pending={data.pendingApprovals} showPending={isApprover} />

            <div className="grid rsp c2" style={{ marginBottom: 18 }}>
              <ActiveProjectsCard projects={data.projects} />
              <ProgressComparisonCard projects={data.projects} />
            </div>

            <div className="grid rsp c3" style={{ marginBottom: 18 }}>
              {isApprover && data.pendingApprovals && <PendingApprovalsCard pending={data.pendingApprovals} />}
              <RecentActivityCard
                events={activity.data ?? []}
                isLoading={activity.isLoading}
                subtitle="آخرین رویدادهای پروژه‌های شما"
              />
              {canAlerts && <AttentionCard limit={5} />}
            </div>

            <div className="grid rsp c3">
              {canCharts && <TrendCard trend={data.trend} dataDate={data.dataDate} />}
              {canRisks && data.risks && <RisksCard risks={data.risks} />}
            </div>
          </>
        )}
      </Content>
    </>
  );
}
