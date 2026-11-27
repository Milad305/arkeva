import { NavLink, Link, useMatch } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import type { Permission } from '@/config/permissions';
import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { useHasAccess } from '@/shared/hooks/useHasAccess';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { BrandMark } from './BrandMark';

export interface SidebarCounts {
  projects?: number;
  reports?: number;
  risks?: number;
}

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
  /** کلید شمارندهٔ زندهٔ کنار آیتم. */
  countKey?: keyof SidebarCounts;
  /** کلاس tone شمارنده — `w` برای کهربایی. */
  countTone?: 'w';
  permissions?: Permission[];
}

const MAIN_NAV: NavEntry[] = [
  { to: ROUTES.dashboard, label: 'داشبورد', icon: 'layout-dashboard' },
  { to: ROUTES.projects, label: 'پروژه‌ها', icon: 'folder-kanban', countKey: 'projects' },
  { to: ROUTES.templates, label: 'ساختار WBS / CBS', icon: 'git-branch', permissions: ['wbs.view'] },
  {
    to: ROUTES.reports,
    label: 'گزارش‌های فیلد',
    icon: 'clipboard-check',
    countKey: 'reports',
    countTone: 'w',
    permissions: ['report.view'],
  },
  { to: ROUTES.risks, label: 'ریسک‌ها', icon: 'shield-alert', countKey: 'risks', permissions: ['risk.view'] },
  { to: ROUTES.users, label: 'کاربران و نقش‌ها', icon: 'users', permissions: ['users.invite'] },
  {
    to: ROUTES.managementReports,
    label: 'گزارش‌های مدیریتی',
    icon: 'bar-chart-3',
    permissions: ['charts.view'],
  },
];

export interface SidebarProps {
  organization: { name: string; initials: string; activeProjectCount: number };
  user: { fullName: string; initials: string; jobTitle: string; avatarTone: string };
  counts?: SidebarCounts;
  onSwitchOrganization?: () => void;
}

/**
 * نوار کناری — `.sb` در kit.css.
 *
 * عرض ثابتی روی خودش ندارد؛ عرض از `.sb-slot` در پوستهٔ اپ می‌آید
 * (`flex: 1 1 224px`) تا در عرض کم بتواند wrap شود.
 */
export function Sidebar({ organization, user, counts, onSwitchOrganization }: SidebarProps) {
  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId =
    projectMatch?.params.projectId && projectMatch.params.projectId !== 'new'
      ? projectMatch.params.projectId
      : null;
  const canEditProjectSettings = useHasAccess(['project.settings.edit']);

  const systemNav: NavEntry[] = [
    {
      to: activeProjectId && canEditProjectSettings ? ROUTES.projectSettings(activeProjectId) : ROUTES.account,
      label: 'تنظیمات',
      icon: 'settings',
    },
    { to: ROUTES.help, label: 'راهنما و پشتیبانی', icon: 'life-buoy' },
  ];

  return (
    <div className="sb" style={{ width: '100%', minHeight: '100%' }}>
      <div className="sb-brand">
        <BrandMark size="md" />
        <div className="brand-t">
          <strong>پروژه‌یار</strong>
          <small>پنل مدیریت پیشرفت</small>
        </div>
      </div>

      <button className="sb-org" type="button" aria-label="تغییر سازمان" onClick={onSwitchOrganization}>
        <span className="org-mark">{organization.initials}</span>
        <span className="col grow" style={{ lineHeight: 1.3, minWidth: 0 }}>
          <strong className="t-13 fw6 trunc">{organization.name}</strong>
          <small className="t-xs tx5">
            {`${toFaDigits(organization.activeProjectCount)} پروژه فعال`}
          </small>
        </span>
        <span className="tx5" style={{ display: 'inline-flex' }}>
          <Icon name="chevrons-up-down" size={14} />
        </span>
      </button>

      <div className="sb-sec">منوی اصلی</div>
      <NavSection entries={MAIN_NAV} counts={counts} label="منوی اصلی" />

      <div className="sb-sec">سیستم</div>
      <NavSection entries={systemNav} counts={counts} label="سیستم" />

      <Link className="sb-user" to={ROUTES.account}>
        <span className={cn('av m', user.avatarTone)}>{user.initials}</span>
        <span className="col grow" style={{ lineHeight: 1.3, minWidth: 0 }}>
          <strong className="t-13 fw6 trunc">{user.fullName}</strong>
          <small className="t-xs tx5 trunc">{user.jobTitle}</small>
        </span>
        <span className="tx5" style={{ display: 'inline-flex' }}>
          <Icon name="more-vertical" size={14} />
        </span>
      </Link>
    </div>
  );
}

function NavSection({
  entries,
  counts,
  label,
}: {
  entries: NavEntry[];
  counts?: SidebarCounts;
  label: string;
}) {
  return (
    <nav className="sb-nav" aria-label={label}>
      {entries.map((entry) => (
        <NavEntryLink key={`${entry.to}-${entry.label}`} entry={entry} counts={counts} />
      ))}
    </nav>
  );
}

function NavEntryLink({ entry, counts }: { entry: NavEntry; counts?: SidebarCounts }) {
  const allowed = useHasAccess(entry.permissions ?? []);
  if (!allowed) return null;

  const count = entry.countKey ? counts?.[entry.countKey] : undefined;

  return (
    <NavLink to={entry.to} className={({ isActive }) => cn('nav-a', isActive && 'on')}>
      <Icon name={entry.icon} size={16} />
      <span className="trunc">{entry.label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('cnt', entry.countTone)}>{toFaDigits(count)}</span>
      )}
    </NavLink>
  );
}
