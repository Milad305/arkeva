import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonKpiRow, SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { ActivationPanel } from '@/modules/projects/components/ActivationPanel';
import { ProjectStatusBanner } from '@/modules/projects/components/ProjectStatusBanner';
import { versionLabel } from '@/modules/projects/services/planVersion';
import { useGetProjectActivityQuery, useGetProjectOverviewQuery } from '../api/chartsApi';
import { OverviewKpis } from '../components/OverviewKpis';
import {
  CriticalItemsCard,
  FieldTeamCard,
  MilestonesCard,
  OpenRisksCard,
  RecentActivityCard,
  SCurveCard,
  TopCbsCard,
} from '../components/OverviewSections';

/**
 * W10 — نمای کلی پروژه (`features/charts.md` ۶.۲).
 *
 * لایهٔ خواندن: همهٔ اعداد از `GET /projects/:pid/overview` می‌آیند و هیچ‌کدام
 * اینجا ساخته نمی‌شود (AC-CH-09). هر بخش با کد دسترسی ماژول خودش دیده می‌شود.
 */
export default function ProjectOverviewPage() {
  const { project, can, actions } = useProjectContext();
  const isDraft = project.status === 'draft';

  const overview = useGetProjectOverviewQuery(project.id, { skip: isDraft });
  const activity = useGetProjectActivityQuery({ projectId: project.id, limit: 6 }, { skip: isDraft });

  const showAmounts = useHasPermission('cbs.view_amounts');
  const showIndices = useHasPermission('charts.view');
  const canCbs = useHasPermission('cbs.view');
  const canRisks = useHasPermission('risk.view');
  const canReports = useHasPermission('report.view');

  if (isDraft) {
    return (
      <Content>
        <ActivationPanel project={project} />
      </Content>
    );
  }

  const data = overview.data;

  return (
    <Content>
      <ProjectStatusBanner project={project} can={can} actions={actions} />

      {data?.computeState === 'updating' && (
        <Alert tone="inf" icon="refresh-cw" className="mb16">
          اعداد در حال به‌روزرسانی‌اند؛ تا پایان محاسبه، مقدارهای قبلی نشان داده می‌شود.
        </Alert>
      )}
      {data?.stale && (
        <Alert tone="wrn" icon="clock" className="mb16">
          اعداد ممکن است قدیمی باشند. آخرین محاسبه {formatJalaliDateTime(data.computedAt)} انجام شده است.
        </Alert>
      )}

      {overview.isLoading ? (
        <>
          <SkeletonKpiRow count={4} columns={4} />
          <Card style={{ marginTop: 16 }}>
            <CardBody>
              <SkeletonTable rows={6} />
            </CardBody>
          </Card>
        </>
      ) : overview.isError || !data ? (
        <EmptyState
          inCard
          icon="server"
          iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
          title="نمای کلی بارگذاری نشد"
          description="مشکل از سمت ماست و داده‌های پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={() => void overview.refetch()}>
              تلاش دوباره
            </AppButton>
          }
        />
      ) : (
        <>
          <div className="row between wrap g8 mb12 t-sm tx5">
            <span>
              تاریخ داده {formatJalaliDate(data.dataDate)}
              {data.pvReference && <> · مقایسه با {versionLabel(data.pvReference)}</>}
            </span>
            <span>محاسبه {formatJalaliDateTime(data.computedAt)}</span>
          </div>

          <OverviewKpis
            projectId={project.id}
            overview={data}
            showAmounts={showAmounts}
            showIndices={showIndices}
          />

          <SCurveCard projectId={project.id} overview={data} />

          <div className="grid c2" style={{ marginBottom: 16 }}>
            <CriticalItemsCard projectId={project.id} items={data.criticalItems} />
            {canCbs && (
              <TopCbsCard projectId={project.id} items={data.topCbsItems} showAmounts={showAmounts} />
            )}
          </div>

          <div className="grid c3" style={{ marginBottom: 16 }}>
            <MilestonesCard projectId={project.id} items={data.milestones} />
            {canRisks && (
              <OpenRisksCard projectId={project.id} total={data.openRisks.total} items={data.openRisks.items} />
            )}
            {canReports && <FieldTeamCard team={data.fieldTeam} />}
          </div>

          <RecentActivityCard events={activity.data ?? []} isLoading={activity.isLoading} />
        </>
      )}
    </Content>
  );
}
