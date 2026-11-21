import { Link } from 'react-router-dom';

import { PROJECT_STATUS, PROJECT_STATUS_TONES } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { Badge } from '@/shared/components/ui/Badge';
import { LinkButton } from '@/shared/components/ui/AppButton';
import { Icon } from '@/shared/components/ui/Icon';
import { Menu } from '@/shared/components/ui/Menu';
import { Tabs, type TabItem } from '@/shared/components/ui/Tabs';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { versionLabel, versionShortLabel } from '../services/planVersion';
import type { ProjectDetailDto } from '../types';
import { buildProjectMenu } from '../components/ProjectActionsMenu';
import { projectVisual } from '../services/visuals';
import type { ProjectActions, ProjectPermissions } from '../hooks/useProjectActions';

export interface ProjectHeaderProps {
  project: ProjectDetailDto;
  /** نمای کلی سربرگ کامل دارد؛ باقی زبانه‌ها نسخهٔ فشرده (آرت‌بورد ProjectHeader). */
  variant: 'full' | 'mini';
  can: ProjectPermissions;
  actions: ProjectActions;
}

/**
 * سربرگ پروژه — `.ph` در kit.css، مشترک همهٔ زبانه‌های پروژه.
 *
 * تفاوت با بوم:
 *   • «اشتراک‌گذاری» حذف شد (تصمیم 1405/08/14 — رفتارش در هیچ فایل ویژگی نیست).
 *   • وضعیت نسخهٔ برنامه (D05) اضافه شد — بوم آن را نداشت (code-mapping ۴.۶).
 */
export function ProjectHeader({ project, variant, can, actions }: ProjectHeaderProps) {
  const visual = projectVisual(project.projectTypeId);
  const progress = project.progress;
  const isReadOnly = project.status === 'archived' || project.status === 'completed';

  const statusBadge = (
    <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
      {PROJECT_STATUS[project.status]}
    </Badge>
  );

  const editButton = can.editSettings && !isReadOnly && (
    <LinkButton
      to={ROUTES.projectSettings(project.id)}
      variant="primary"
      icon="pencil"
      size={variant === 'mini' ? 'sm' : 'md'}
    >
      ویرایش پروژه
    </LinkButton>
  );

  const moreMenu = (
    <Menu
      entries={buildProjectMenu(project, can, actions, { includeView: false })}
      trigger={(props) => (
        <button {...props} type="button" className="ibtn bd" aria-label="اقدامات بیشتر">
          <Icon name="more-vertical" size={16} />
        </button>
      )}
    />
  );

  return (
    <section className="ph">
      {variant === 'full' ? (
        <div className="ph-in">
          <div className="row between ai-s wrap g16">
            <div className="row g14 ai-s" style={{ minWidth: 0, flex: '1 1 420px' }}>
              <span className="thumb lg" style={{ background: visual.tint }}>
                <Icon name={visual.icon} size={24} />
              </span>
              <div className="col g6" style={{ minWidth: 0 }}>
                <h1 className="h-t1">{project.name}</h1>
                <div className="meta">
                  <span>
                    <Icon name="briefcase" size={13} />
                    کارفرما: <strong>{project.clientName}</strong>
                  </span>
                  <span className="d">·</span>
                  <span>
                    <Icon name="hash" size={13} />
                    کد: <strong className="mono">{project.code}</strong>
                  </span>
                  <span className="d">·</span>
                  <span>
                    <Icon name="play" size={13} />
                    شروع: <strong>{formatJalaliDate(project.plannedStart)}</strong>
                  </span>
                  <span>
                    <Icon name="flag" size={13} />
                    پایان: <strong>{formatJalaliDate(project.plannedFinish)}</strong>
                  </span>
                  <span className="d">·</span>
                  <span>
                    <Icon name="user" size={13} />
                    مدیر پروژه: <strong>{project.manager.fullName}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="row g8 wrap">
              <PlanStateChip project={project} />
              {statusBadge}
              {editButton}
              {moreMenu}
            </div>
          </div>
        </div>
      ) : (
        <div className="ph-mini">
          <div className="row g12" style={{ minWidth: 0 }}>
            <span className="thumb" style={{ background: visual.tint }}>
              <Icon name={visual.icon} size={18} />
            </span>
            <div className="col g2" style={{ minWidth: 0 }}>
              <h1 className="h-hd trunc">{project.name}</h1>
              <div className="meta t-sm">
                <span>
                  کد: <strong className="mono">{project.code}</strong>
                </span>
                <span className="d">·</span>
                <span>
                  مدیر: <strong>{project.manager.fullName}</strong>
                </span>
                {progress && (
                  <>
                    <span className="d">·</span>
                    <span>
                      پیشرفت: <strong>{formatPercentAuto(progress.actualPercent)}</strong> از{' '}
                      {formatPercentAuto(progress.plannedPercent)} برنامه
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="row g8 wrap">
            <PlanStateChip project={project} />
            {statusBadge}
            {editButton}
            {moreMenu}
          </div>
        </div>
      )}

      <ProjectTabs project={project} padding={variant === 'mini' ? 20 : 28} />
    </section>
  );
}

/**
 * وضعیت نسخهٔ برنامه (D05، `features/plan-versions.md` ۲).
 * فقط برای دارندگان `plan.view_versions`؛ نسخهٔ کاری باز به WBS می‌برد،
 * چون همهٔ ویرایش برنامه آنجا روی همان نسخه انجام می‌شود.
 */
function PlanStateChip({ project }: { project: ProjectDetailDto }) {
  const canView = useHasPermission('plan.view_versions');
  const { plan } = project;
  if (!canView) return null;

  if (plan.draft) {
    const isBaselineDraft = plan.draft.kind === 'baseline';
    const label = isBaselineDraft
      ? 'مبنای کاری · هنوز اعمال نشده'
      : `نسخهٔ کاری R${plan.draft.number} · ${toFaDigits(plan.draft.changeCount)} تغییر`;
    return (
      <Link
        to={ROUTES.wbs(project.id)}
        className="bdg wrn"
        title={`آخرین ذخیره ${formatRelativeTime(plan.draft.lastSavedAt)} توسط ${plan.draft.lastSavedBy.fullName}`}
      >
        <Icon name="file-pen-line" size={12} />
        {label}
      </Link>
    );
  }

  if (!plan.current) return null;

  const differsFromPv = plan.pvReference && plan.pvReference.id !== plan.current.id;
  return (
    <span
      className="bdg neu"
      title={
        differsFromPv && plan.pvReference
          ? `مرجع PV و انحراف‌ها: ${versionLabel(plan.pvReference)}`
          : 'مرجع PV همین نسخه است'
      }
    >
      <Icon name="git-branch" size={12} />
      برنامهٔ جاری: {versionShortLabel(plan.current)}
      {differsFromPv && plan.pvReference && (
        <span className="tx5"> · مرجع PV: {versionShortLabel(plan.pvReference)}</span>
      )}
    </span>
  );
}

/** زبانه‌های پروژه — هر زبانه با کد دسترسی خودش (F01 ۵.۴). */
function ProjectTabs({ project, padding }: { project: ProjectDetailDto; padding: number }) {
  const canWbs = useHasPermission('wbs.view');
  const canCbs = useHasPermission('cbs.view');
  const canReports = useHasPermission('report.view');
  const canRisks = useHasPermission('risk.view');
  const canTeam = useHasPermission('team.view');
  const canCharts = useHasPermission('charts.view');
  const canChartsSummary = useHasPermission('charts.view_summary');
  const canSettings = useHasPermission('project.settings.edit');
  const { counts } = project;

  const tabs: (TabItem | false)[] = [
    { key: 'overview', label: 'نمای کلی', icon: 'layout-dashboard', to: ROUTES.project(project.id) },
    canWbs && { key: 'wbs', label: 'WBS', icon: 'git-branch', to: ROUTES.wbs(project.id) },
    canCbs && { key: 'cbs', label: 'CBS', icon: 'banknote', to: ROUTES.cbs(project.id) },
    canCbs && { key: 'links', label: 'اتصالات', icon: 'link', to: ROUTES.links(project.id) },
    canReports && {
      key: 'reports',
      label: 'گزارش‌ها',
      icon: 'clipboard-check',
      to: ROUTES.projectReports(project.id),
      count: counts.pendingReports || undefined,
      countTone: 'w',
    },
    canRisks && {
      key: 'risks',
      label: 'ریسک‌ها',
      icon: 'shield-alert',
      to: ROUTES.projectRisks(project.id),
      count: counts.openRisks || undefined,
      countTone: counts.openHighRisks > 0 ? 'e' : 'neu',
    },
    canTeam && {
      key: 'members',
      label: 'اعضا',
      icon: 'users',
      to: ROUTES.members(project.id),
      count: counts.members,
    },
    (canCharts || canChartsSummary) && {
      key: 'charts',
      label: 'نمودارها',
      icon: 'bar-chart-3',
      to: ROUTES.chartsProgress(project.id),
    },
    canSettings && {
      key: 'settings',
      label: 'تنظیمات',
      icon: 'settings',
      to: ROUTES.projectSettings(project.id),
    },
  ];

  return (
    <Tabs
      items={tabs.filter((tab): tab is TabItem => tab !== false)}
      style={{ paddingInline: padding }}
    />
  );
}
