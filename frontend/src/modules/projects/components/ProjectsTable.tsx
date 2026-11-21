import { Link } from 'react-router-dom';

import { projectLink } from '../services/projectLink';
import { PROJECT_STATUS, PROJECT_STATUS_TONES } from '@/config/constants';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { Pagination } from '@/shared/components/ui/Pagination';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { useSelection } from '@/shared/hooks/useSelection';
import { cn } from '@/shared/utils/cn';
import { formatDayDelta, formatJalaliDate } from '@/shared/utils/date';
import { progressColor } from '@/shared/utils/deviation';
import { formatPercent, formatRatio, toBillions, toFaDigits } from '@/shared/utils/num';
import type { ProjectListItemDto } from '../types';
import type { ProjectListView, ProjectSortKey } from '../hooks/useProjectListView';

const SORT_KEYS: readonly string[] = ['name', 'actual', 'deviation', 'plannedFinish'];

/** کلید ستون جدول همان کلید مرتب‌سازی است؛ فقط ستون‌های مرتب‌شدنی را می‌پذیرد. */
function isSortKey(key: string): key is ProjectSortKey {
  return SORT_KEYS.includes(key);
}
import type { ProjectActions, ProjectPermissions } from '../hooks/useProjectActions';
import { cpiTone, deviationBadge } from '../services/presentation';
import { exportProjectsCsv } from '../services/exportProjects';
import { projectVisual } from '../services/visuals';
import { ProjectActionsMenu } from './ProjectActionsMenu';

export interface ProjectsTableProps {
  view: ProjectListView;
  can: ProjectPermissions;
  actions: ProjectActions;
}

/**
 * جدول پروژه‌ها — W07.
 *
 * کف عرض ۱۱۸۰px همان آرت‌بورد است؛ با ستون‌های CPI و SPI که F02 ۹ می‌خواهد
 * ۱۳۴۰px می‌شود. جدول در `.tbl-wrap` اسکرول افقی خودش را می‌گیرد، پس صفحه هرگز
 * سرریز نمی‌کند.
 */
export function ProjectsTable({ view, can, actions }: ProjectsTableProps) {
  const selection = useSelection(view.paged.map((project) => project.id));

  const columns: Array<Column<ProjectListItemDto>> = [
    {
      key: 'name',
      header: 'نام پروژه',
      minWidth: 220,
      sortable: true,
      render: (project) => <ProjectNameCell project={project} />,
    },
    {
      key: 'client',
      header: 'کارفرما',
      // اسم‌های بلند دوخطی می‌شوند، هم‌قد خانهٔ نام پروژه؛ سه‌خطی نه
      minWidth: 140,
      render: (project) => <span className="tx8">{project.clientName}</span>,
    },
    {
      key: 'manager',
      header: 'مدیر پروژه',
      render: (project) => (
        <span className="row g8 nowrap">
          <Avatar name={project.manager.fullName} tone={project.manager.avatarTone} />
          {project.manager.fullName}
        </span>
      ),
    },
    {
      key: 'planned',
      header: 'پیشرفت برنامه‌ای',
      minWidth: 130,
      render: (project) => (
        <PercentCell value={project.progress?.plannedPercent} label="برنامه‌ای" color="#A1A1AA" />
      ),
    },
    {
      key: 'actual',
      header: 'پیشرفت واقعی',
      minWidth: 130,
      sortable: true,
      emphasized: true,
      render: (project) => (
        <PercentCell
          value={project.progress?.actualPercent}
          label="واقعی"
          color={
            project.progress
              ? progressColor(project.progress.plannedPercent, project.progress.actualPercent)
              : '#D4D4D8'
          }
        />
      ),
    },
    {
      key: 'deviation',
      header: 'انحراف',
      sortable: true,
      render: (project) => {
        const badge = deviationBadge(project);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
  ];

  if (can.viewIndices) {
    columns.push(
      {
        key: 'cpi',
        header: 'CPI',
        align: 'center',
        render: (project) => <IndexCell value={project.progress?.cpi ?? null} project={project} cost />,
      },
      {
        key: 'spi',
        header: 'SPI',
        align: 'center',
        render: (project) => <IndexCell value={project.progress?.spi ?? null} project={project} />,
      },
    );
  }

  if (can.viewAmounts) {
    columns.push({
      key: 'budget',
      header: 'بودجه',
      render: (project) =>
        project.progress?.bac ? (
          <div className="col">
            <span className="fw6 tx9 nowrap">{`${toBillions(project.progress.bac, 0)} میلیارد ریال`}</span>
            <span className="t-xs tx5">{`${formatPercent(project.budgetConsumedPercent ?? 0)} مصرف‌شده`}</span>
          </div>
        ) : (
          <span className="tx5">—</span>
        ),
    });
  }

  columns.push(
    {
      key: 'plannedFinish',
      header: 'پایان برنامه‌ای',
      sortable: true,
      render: (project) => <FinishCell project={project} />,
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (project) => (
        <span className="row g4 wrap">
          <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
            {project.wizardIncomplete ? 'ناتمام' : PROJECT_STATUS[project.status]}
          </Badge>
          {project.atRisk && (
            <Badge tone="err" size="sm" icon="alert-triangle" title="انحراف ۱۵ واحد یا بیشتر، یا CPI زیر ۰٫۹">
              در خطر
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'menu',
      header: '',
      width: 40,
      render: (project) => <ProjectActionsMenu project={project} can={can} actions={actions} />,
    },
  );

  const selectedProjects = view.paged.filter((project) => selection.isSelected(project.id));

  return (
    <Card>
      <DataTable
        rows={view.paged}
        columns={columns}
        getRowId={(project) => project.id}
        minWidth={can.viewIndices ? 1340 : 1180}
        selection={selection}
        isRowSelected={(project) => selection.isSelected(project.id)}
        sort={view.sort}
        onSortChange={(key) => {
          if (isSortKey(key)) view.toggleSort(key);
        }}
        caption="فهرست پروژه‌ها"
        bulkActions={(current) => (
          <>
            <span className="row g8 t-13 fw6">
              <Icon name="check-square" size={15} />
              {`${toFaDigits(current.count)} پروژه انتخاب شد`}
            </span>
            <AppButton
              variant="ghostOnDark"
              size="sm"
              icon="file-spreadsheet"
              onClick={() => exportProjectsCsv(selectedProjects, { includeAmounts: can.viewAmounts })}
            >
              خروجی Excel
            </AppButton>
            <AppButton variant="ghostOnDark" size="sm" className="ms-auto" onClick={current.clear}>
              لغو انتخاب
            </AppButton>
          </>
        )}
        footer={
          <Pagination
            page={view.page}
            pageSize={view.pageSize}
            total={view.visible.length}
            unit="پروژه"
            onPageChange={view.setPage}
            onPageSizeChange={view.setPageSize}
          />
        }
      />
    </Card>
  );
}

function ProjectNameCell({ project }: { project: ProjectListItemDto }) {
  const visual = projectVisual(project.projectTypeId);

  return (
    <Link className="row g10" to={projectLink(project)} style={{ minWidth: 220 }}>
      <span className="thumb" style={{ background: visual.tint }}>
        <Icon name={visual.icon} size={16} />
      </span>
      <span className="col" style={{ minWidth: 0 }}>
        <span className="fw6 tx9 trunc">{project.name}</span>
        <span className="mono t-xs tx5">{project.code}</span>
      </span>
    </Link>
  );
}

function PercentCell({ value, label, color }: { value: number | undefined; label: string; color: string }) {
  if (value === undefined) return <span className="tx5">—</span>;

  return (
    <div className="col g4">
      <span className="row between t-12 fw6">
        {formatPercent(value)}
        <span className="t-xs tx5 fw5">{label}</span>
      </span>
      <ProgressBar value={value} size="thin" color={color} />
    </div>
  );
}

function IndexCell({
  value,
  project,
  cost,
}: {
  value: number | null;
  project: ProjectListItemDto;
  cost?: boolean;
}) {
  if (value === null) return <span className="tx5">—</span>;

  const tone = cost ? cpiTone(value) : null;
  const content = (
    <span className={cn('fw6 num', tone === 'err' && 'tx-err', tone === 'wrn' && 'tx-wrn')}>
      {formatRatio(value)}
    </span>
  );

  // ب25: کنار هر شاخص هزینه تاریخ محاسبه‌اش نمایش داده می‌شود
  if (!cost || !project.progress?.costIndicesDate) return content;

  return (
    <Tooltip content={`محاسبه‌شده در ${formatJalaliDate(project.progress.costIndicesDate)}`}>
      {/* دکمهٔ ساده تا راهنما با Tab هم باز شود؛ kit.css ظاهر دکمه را صاف کرده است */}
      <button type="button" aria-label={`CPI ${formatRatio(value)}`} style={{ cursor: 'help' }}>
        {content}
      </button>
    </Tooltip>
  );
}

function FinishCell({ project }: { project: ProjectListItemDto }) {
  const forecast = project.progress?.forecastFinish;
  const late = (project.progress?.delayDays ?? 0) > 0;

  // تاریخ پیش‌بینی و مقدار تأخیر جدا می‌شکنند تا ستون باریک بماند و
  // جدول در مانیتور عریض بدون اسکرول افقی جا شود
  return (
    <div className="col">
      <span className="t-12 tx7 nowrap">{formatJalaliDate(project.plannedFinish)}</span>
      {forecast && project.plannedFinish && project.status !== 'completed' && (
        <span className={cn('t-xs', late ? 'tx-wrn' : 'tx5')}>
          <span className="nowrap">{`پیش‌بینی ${formatJalaliDate(forecast)}`}</span>{' '}
          <span className="nowrap">{`· ${formatDayDelta(project.plannedFinish, forecast)}`}</span>
        </span>
      )}
    </div>
  );
}
