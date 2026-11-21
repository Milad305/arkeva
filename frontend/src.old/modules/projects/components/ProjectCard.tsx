import { useNavigate } from 'react-router-dom';
import { Banknote, Wallet, Calendar } from 'lucide-react';

import { toPersianDigits } from '@/shared/utils';
import type { ProjectDto } from '../types';
import { PROJECT_TYPE_ICONS } from '../types';
import {
  PROJECT_STATUS_STYLE,
  getDeviationBadge,
  getProgressColor,
  AVATAR_COLORS,
} from '../services/projectHelpers';

// مطابق designs/Projects.html card view.

interface ProjectCardProps {
  project: ProjectDto;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const statusStyle = PROJECT_STATUS_STYLE[project.status];
  const ac = AVATAR_COLORS[project.manager.avatarColor];
  const pColor = getProgressColor(project.deviation, project.status);
  const devBadge = getDeviationBadge(project.deviation, project.status);
  const TypeIcon = PROJECT_TYPE_ICONS[project.type];

  return (
    <article
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all hover:border-gray-300 hover:shadow-md"
    >
      {/* banner رنگی */}
      <div
        className="h-24 relative overflow-hidden flex items-start justify-between p-3 text-white"
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.06) 14px 16px), none`,
          backgroundColor: pColorForType(project),
        }}
      >
        <div className="w-9 h-9 rounded-md bg-white/[0.18] backdrop-blur-sm inline-flex items-center justify-center relative z-10">
          <TypeIcon className="w-[18px] h-[18px]" />
        </div>
        <span
          className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm text-[11.5px] font-medium whitespace-nowrap relative z-10"
          style={{ background: statusStyle.bg, color: statusStyle.fg }}
        >
          <span className="w-[5px] h-[5px] rounded-full" style={{ background: statusStyle.dot }} />
          {statusStyle.label}
        </span>
      </div>

      {/* body */}
      <div className="p-3.5 flex-1 flex flex-col gap-2.5">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 leading-relaxed">{project.name}</h3>
          <div className="text-xs text-gray-500 -mt-1">{project.employer}</div>
        </div>

        {/* prog-block */}
        <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-gray-900 tracking-tight">
              {toPersianDigits(project.actualProgress)}
              <span className="text-sm text-gray-500 font-medium">٪</span>
            </span>
            <span className="text-[11.5px] text-gray-500">
              پیشرفت واقعی · هدف {toPersianDigits(project.plannedProgress)}٪
            </span>
          </div>

          <div className="relative w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-visible">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${project.actualProgress}%`, background: pColor }}
            />
            {project.plannedProgress > 0 && project.plannedProgress !== 100 && (
              <span
                className="absolute top-[-2px] bottom-[-2px] right-0 w-0.5 bg-gray-700 rounded-sm"
                style={{ width: '2px', insetInlineStart: `${project.plannedProgress}%` }}
              />
            )}
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1">
              <i className="w-2 h-0.5 bg-gray-400 inline-block rounded-sm" />
              هدف {toPersianDigits(project.plannedProgress)}٪
            </span>
            <span
              className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm text-[11.5px] font-medium whitespace-nowrap"
              style={{ background: devBadge.bg, color: devBadge.fg }}
            >
              {devBadge.label}
            </span>
          </div>
        </div>

        {/* budget row */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <Banknote className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{toPersianDigits(project.budget.toLocaleString('en-US'))} میلیارد ﷼</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{toPersianDigits(project.budgetUsedPct)}٪ مصرف</span>
          </span>
        </div>
      </div>

      {/* foot */}
      <div className="border-t border-gray-100 px-3.5 py-2.5 flex items-center justify-between text-xs text-gray-600">
        {/* avatars */}
        <div className="flex">
          <span
            className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white inline-flex items-center justify-center text-[9.5px] font-semibold -ml-1.5"
            style={{ background: ac.bg, color: ac.fg }}
          >
            {project.manager.initials}
          </span>
          <span className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white bg-gray-100 text-gray-700 inline-flex items-center justify-center text-[9.5px] font-semibold -ml-1.5">
            س.ک
          </span>
          <span className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white bg-success-50 text-success-700 inline-flex items-center justify-center text-[9.5px] font-semibold -ml-1.5">
            ع.ه
          </span>
          {project.memberCount > 3 && (
            <span className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white bg-gray-50 text-gray-600 inline-flex items-center justify-center text-[9px] font-semibold -ml-1.5">
              +{toPersianDigits(project.memberCount - 3)}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[11.5px]">
          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="mono">{formatJalaliShort(project.endDate)}</span>
        </span>
      </div>
    </article>
  );
}

function pColorForType(p: ProjectDto): string {
  const tints: Record<string, string> = {
    building: '#1A3354',
    commercial: '#1D4ED8',
    industrial: '#3F3F46',
    road: '#2C4A73',
    tunnel: '#3F3F46',
    hospital: '#B45813',
    energy: '#D97706',
    parking: '#15803D',
    heritage: '#52525B',
  };
  return tints[p.type] ?? '#1A3354';
}

function formatJalaliShort(iso: string): string {
  return iso.replace(/-/g, '/').replace(/^\d{4}/, (y) => String(Number(y) + 1021));
}
