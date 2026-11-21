import { Link } from 'react-router-dom';

import { projectLink } from '../services/projectLink';
import { PROJECT_STATUS, PROJECT_STATUS_TONES } from '@/config/constants';
import { AvatarGroup } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Box } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { formatJalaliDate } from '@/shared/utils/date';
import { progressColor } from '@/shared/utils/deviation';
import { formatPercent, toBillions, toFaDigits } from '@/shared/utils/num';
import type { ProjectListItemDto } from '../types';
import type { ProjectActions, ProjectPermissions } from '../hooks/useProjectActions';
import { deviationBadge } from '../services/presentation';
import { projectVisual } from '../services/visuals';
import { ProjectActionsMenu } from './ProjectActionsMenu';

export interface ProjectCardProps {
  project: ProjectListItemDto;
  can: ProjectPermissions;
  actions: ProjectActions;
}

/** کارت پروژه — W08. */
export function ProjectCard({ project, can, actions }: ProjectCardProps) {
  const visual = projectVisual(project.projectTypeId);
  const progress = project.progress;
  const badge = deviationBadge(project);
  const color = progress ? progressColor(progress.plannedPercent, progress.actualPercent) : '#D4D4D8';

  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <Link
        to={projectLink(project)}
        className="thumb"
        aria-label={`مشاهدهٔ پروژهٔ ${project.name}`}
        style={{
          width: '100%',
          height: 96,
          borderRadius: 0,
          background: visual.tint,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 12,
        }}
      >
        <span
          className="icb"
          style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}
        >
          <Icon name={visual.icon} size={18} />
        </span>
        <span className="row g4">
          {project.atRisk && (
            <Badge tone="err" icon="alert-triangle">
              در خطر
            </Badge>
          )}
          <Badge tone={PROJECT_STATUS_TONES[project.status]} dot>
            {PROJECT_STATUS[project.status]}
          </Badge>
        </span>
      </Link>

      <div className="col g10" style={{ padding: 14, flex: '1 1 auto' }}>
        <div className="row between ai-s g8">
          <div className="col g2" style={{ minWidth: 0 }}>
            <h3 className="fw6 trunc" style={{ fontSize: 15 }}>
              <Link to={projectLink(project)}>{project.name}</Link>
            </h3>
            <span className="t-12 tx5 trunc">
              {project.clientName} · <span className="mono">{project.code}</span>
            </span>
          </div>
          <ProjectActionsMenu project={project} can={can} actions={actions} />
        </div>

        <Box className="col g8">
          {progress ? (
            <>
              <div className="row between ai-e">
                <span className="stat-v">
                  {toFaDigits(progress.actualPercent)}
                  <span className="t-14 tx5 fw5">٪</span>
                </span>
                <span className="t-sm tx5">
                  {`پیشرفت واقعی · هدف ${formatPercent(progress.plannedPercent)}`}
                </span>
              </div>
              <ProgressBar
                value={progress.actualPercent}
                color={color}
                marker={progress.plannedPercent}
                label={`پیشرفت واقعی ${formatPercent(progress.actualPercent)} در برابر هدف ${formatPercent(progress.plannedPercent)}`}
                style={{ height: 6, overflow: 'visible' }}
              />
              <div className="row between t-sm tx6">
                <span className="row g4">
                  <span style={{ width: 8, height: 2, background: '#3F3F46', display: 'inline-block' }} />
                  {`هدف امروز ${formatPercent(progress.plannedPercent)}`}
                </span>
                <Badge tone={badge.tone} size="sm">
                  {badge.label}
                </Badge>
              </div>
            </>
          ) : (
            <div className="row between t-sm tx6">
              <span>پروژه هنوز فعال نشده و پیشرفتی ندارد.</span>
              <Badge tone="neu" size="sm">
                {project.wizardIncomplete ? 'ناتمام' : badge.label}
              </Badge>
            </div>
          )}
        </Box>

        {can.viewAmounts && progress?.bac && (
          <div className="row between t-12 tx6">
            <span className="row g6">
              <span className="tx5" style={{ display: 'inline-flex' }}>
                <Icon name="banknote" size={13} />
              </span>
              {`${toBillions(progress.bac, 0)} میلیارد ریال`}
            </span>
            <span className="row g6">
              <span className="tx5" style={{ display: 'inline-flex' }}>
                <Icon name="wallet" size={13} />
              </span>
              {`${formatPercent(project.budgetConsumedPercent ?? 0)} مصرف`}
            </span>
          </div>
        )}
      </div>

      <div className="row between" style={{ padding: '10px 14px', borderTop: '1px solid var(--gray-100)' }}>
        <AvatarGroup
          max={3}
          total={project.memberCount}
          people={project.memberPreview.map((person) => ({
            name: person.fullName,
            tone: person.avatarTone,
          }))}
        />
        <span className="row g4 t-sm tx6">
          <Icon name="calendar" size={13} />
          {formatJalaliDate(project.plannedFinish)}
        </span>
      </div>
    </article>
  );
}
