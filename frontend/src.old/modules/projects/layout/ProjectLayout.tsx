import { type ReactNode } from 'react';
import { Link, NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Hash,
  Play,
  Flag,
  User,
  Share2,
  Edit3,
  MoreVertical,
  LayoutDashboard,
  GitBranch,
  Banknote,
  Link as LinkIcon,
  ClipboardCheck,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';

import { cn, formatJalaliDate } from '@/shared/utils';
import { useGetProjectQuery, useGetProjectTabCountsQuery } from '../api/projectsApi';
import { PROJECT_STATUS_STYLE, PROJECT_TYPE_TINT } from '../services/projectHelpers';
import { PROJECT_TYPE_ICONS, type ProjectTab } from '../types';

// بازنویسی وفادار بر اساس designs/Project.html بخش‌های:
//   .proj-header (sticky) / .proj-title-block / .proj-actions / .tabs
// این layout بین همهٔ تب‌های پروژه مشترک است (مطابق frontend-react.md بخش ۱۴).

interface TabDef {
  key: ProjectTab;
  label: string;
  icon: typeof LayoutDashboard;
  // sub-path نسبت به /projects/:projectId
  to: string;
  badgeKey?: 'reports' | 'members';
  // وقتی گزارش‌ها هشدار دارند (مطابق .tab.has-warn در طراحی)
  hasWarn?: boolean;
  permission?: string;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard, to: '' },
  { key: 'wbs', label: 'WBS', icon: GitBranch, to: '/wbs', permission: 'wbs.view' },
  { key: 'cbs', label: 'CBS', icon: Banknote, to: '/cbs', permission: 'cbs.view' },
  { key: 'links', label: 'اتصالات', icon: LinkIcon, to: '/links', permission: 'links.view' },
  {
    key: 'reports',
    label: 'گزارش‌ها',
    icon: ClipboardCheck,
    to: '/reports',
    badgeKey: 'reports',
    hasWarn: true,
    permission: 'reports.view',
  },
  {
    key: 'members',
    label: 'اعضا',
    icon: Users,
    to: '/members',
    badgeKey: 'members',
    permission: 'members.view',
  },
  { key: 'charts', label: 'نمودارها', icon: BarChart3, to: '/charts', permission: 'charts.view' },
  { key: 'settings', label: 'تنظیمات', icon: Settings, to: '/settings', permission: 'settings.view' },
];

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const id = Number(projectId);

  const { data: project, isLoading } = useGetProjectQuery(id);
  const { data: tabCounts } = useGetProjectTabCountsQuery(id);

  // تب‌های full-width (مثل WBS با چیدمان ۳ ستون) نباید padding/max-width بگیرند.
  // سایر تب‌ها در container با padding رندر می‌شوند.
  const fullWidthTabs = ['/wbs', '/cbs', '/links'];
  const isFullWidth = fullWidthTabs.some((t) => location.pathname.endsWith(t));

  // نمایش fallback حین بارگذاری — ساختار همان است.
  if (isLoading || !project) {
    return <ProjectLayoutSkeleton />;
  }

  const statusStyle = PROJECT_STATUS_STYLE[project.status];
  const ProjectTypeIcon = PROJECT_TYPE_ICONS[project.type];
  const tint = PROJECT_TYPE_TINT[project.type];

  return (
    <>
      {/* Project header (sticky زیر topbar) */}
      <section className="bg-white border-b border-gray-200 sticky top-[56px] z-20">
        <div className="px-8 pt-5 max-w-[1480px]">
          {/* ردیف عنوان + اکشن‌ها */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {/* thumbnail بزرگ — مطابق .proj-thumb-lg */}
              <div
                className="relative w-[52px] h-[52px] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: tint }}
              >
                {/* pattern مورب تزئینی — مطابق .proj-thumb-lg::after */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, transparent 0 6px, rgba(255,255,255,0.08) 6px 7px)',
                  }}
                />
                <ProjectTypeIcon className="w-6 h-6 text-white relative z-[1]" />
              </div>

              <div className="min-w-0">
                {/* breadcrumb بالای عنوان */}
                <div className="flex items-center gap-[5px] text-xs text-gray-500 mb-1">
                  <Link to="/projects" className="hover:text-gray-800">
                    پروژه‌ها
                  </Link>
                </div>

                <h1 className="text-[24px] font-bold tracking-[-0.01em] text-gray-900 leading-[1.3] m-0">
                  {project.name}
                </h1>

                {/* submeta — کارفرما، کد، تاریخ‌ها، مدیر */}
                {/* نکته: آیکن‌ها shrink-0 دارند و text در span پیچیده شده تا baseline
                    متن، آیکن را به بالا هل ندهد (مطابق frontend-react.md بخش ۱۷). */}
                <div className="flex items-center gap-3.5 flex-wrap mt-2 text-[12.5px] text-gray-600">
                  <span className="inline-flex items-center gap-[5px]">
                    <Briefcase className="w-[13px] h-[13px] text-gray-400 shrink-0" />
                    <span>کارفرما: <strong className="text-gray-800 font-medium">{project.employer}</strong></span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-[5px]">
                    <Hash className="w-[13px] h-[13px] text-gray-400 shrink-0" />
                    <span>کد: <strong className="mono font-medium text-gray-800">{project.code}</strong></span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-[5px]">
                    <Play className="w-[13px] h-[13px] text-gray-400 shrink-0" />
                    <span>شروع:{' '}<strong className="mono font-medium text-gray-800">{formatJalaliDate(project.startDate)}</strong></span>
                  </span>
                  <span className="inline-flex items-center gap-[5px]">
                    <Flag className="w-[13px] h-[13px] text-gray-400 shrink-0" />
                    <span>پایان:{' '}<strong className="mono font-medium text-gray-800">{formatJalaliDate(project.endDate)}</strong></span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-[5px]">
                    <User className="w-[13px] h-[13px] text-gray-400 shrink-0" />
                    <span>مدیر: <strong className="font-medium text-gray-800">{project.manager.fullName}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* اکشن‌ها */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="inline-flex items-center gap-[5px] h-6 px-[9px] rounded-sm text-xs font-medium leading-none"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.dot }} />
                {statusStyle.label}
              </span>
              <button className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-md bg-white border border-gray-300 text-gray-800 text-[13px] font-medium hover:bg-gray-50 hover:border-gray-400 transition-all">
                <Share2 className="w-[13px] h-[13px] shrink-0" />
                <span>اشتراک‌گذاری</span>
              </button>
              <button className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-md bg-primary-700 text-white text-[13px] font-medium hover:bg-primary-900 transition-all">
                <Edit3 className="w-[13px] h-[13px] shrink-0" />
                <span>ویرایش پروژه</span>
              </button>
              <button
                className="w-[34px] h-[34px] rounded-md border border-gray-300 inline-flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="بیشتر"
              >
                <MoreVertical className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5 pt-3.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const badge =
                tab.badgeKey && tabCounts ? tabCounts[tab.badgeKey] : undefined;
              const showWarnBadge = tab.hasWarn && badge !== undefined && badge > 0;
              return (
                <NavLink
                  key={tab.key}
                  to={`/projects/${id}${tab.to}`}
                  end={tab.to === ''}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 border-transparent transition-colors',
                      isActive
                        ? 'text-primary-700 border-primary-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900',
                    )
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-1.5 rounded-full min-w-[18px] text-center',
                        showWarnBadge
                          ? 'bg-warning-50 text-warning-700'
                          : 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {badge.toLocaleString('fa-IR')}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </section>

      {/* محتوای تب — هر تب در Outlet رندر می‌شود */}
      <div className={isFullWidth ? '' : 'px-8 py-6 pb-12 max-w-[1480px]'}>
        <Outlet />
      </div>
    </>
  );
}

// fallback حین بارگذاری پروژه — همان ساختار ولی بدون داده.
function ProjectLayoutSkeleton(): ReactNode {
  return (
    <div className="px-8 py-6 max-w-[1480px]">
      <div className="h-14 bg-gray-100 rounded-lg animate-pulse mb-4" />
      <div className="h-10 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}
