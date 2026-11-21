import { NavLink, Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import type { Permission } from '@/config/permissions';
import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { useHasAccess } from '@/shared/hooks/useHasAccess';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { BrandMark } from './BrandMark';

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
  /** شمارندهٔ کنار آیتم. */
  count?: number;
  /** کلاس tone شمارنده — `w` برای کهربایی. */
  countTone?: 'w';
  permissions?: Permission[];
}

const MAIN_NAV: NavEntry[] = [
  { to: ROUTES.dashboard, label: 'داشبورد', icon: 'layout-dashboard' },
  { to: ROUTES.projects, label: 'پروژه‌ها', icon: 'folder-kanban', count: 12 },
  { to: ROUTES.templates, label: 'ساختار WBS / CBS', icon: 'git-branch', permissions: ['wbs.view'] },
  {
    to: ROUTES.reports,
    label: 'گزارش‌های فیلد',
    icon: 'clipboard-check',
    count: 24,
    countTone: 'w',
    permissions: ['report.view'],
  },
  { to: ROUTES.risks, label: 'ریسک‌ها', icon: 'shield-alert', count: 9 },
  { to: ROUTES.users, label: 'کاربران و نقش‌ها', icon: 'users', permissions: ['users.invite'] },
  {
    to: ROUTES.managementReports,
    label: 'گزارش‌های مدیریتی',
    icon: 'bar-chart-3',
    permissions: ['charts.view'],
  },
];

const SYSTEM_NAV: NavEntry[] = [
  { to: ROUTES.templates, label: 'تنظیمات', icon: 'settings', permissions: ['project.settings.edit'] },
  { to: ROUTES.help, label: 'راهنما و پشتیبانی', icon: 'life-buoy' },
];

export interface SidebarProps {
  organization: { name: string; initials: string; activeProjectCount: number };
  user: { fullName: string; initials: string; jobTitle: string; avatarTone: string };
  onSwitchOrganization?: () => void;
}

/**
 * نوار کناری — `.sb` در kit.css.
 *
 * عرض ثابتی روی خودش ندارد؛ عرض از `.sb-slot` در پوستهٔ اپ می‌آید
 * (`flex: 1 1 224px`) تا در عرض کم بتواند wrap شود.
 */
export function Sidebar({ organization, user, onSwitchOrganization }: SidebarProps) {
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
      <NavSection entries={MAIN_NAV} label="منوی اصلی" />

      <div className="sb-sec">سیستم</div>
      <NavSection entries={SYSTEM_NAV} label="سیستم" />

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

function NavSection({ entries, label }: { entries: NavEntry[]; label: string }) {
  return (
    <nav className="sb-nav" aria-label={label}>
      {entries.map((entry) => (
        <NavEntryLink key={`${entry.to}-${entry.label}`} entry={entry} />
      ))}
    </nav>
  );
}

function NavEntryLink({ entry }: { entry: NavEntry }) {
  const allowed = useHasAccess(entry.permissions ?? []);
  if (!allowed) return null;

  return (
    <NavLink to={entry.to} className={({ isActive }) => cn('nav-a', isActive && 'on')}>
      <Icon name={entry.icon} size={16} />
      <span className="trunc">{entry.label}</span>
      {entry.count !== undefined && (
        <span className={cn('cnt', entry.countTone)}>{toFaDigits(entry.count)}</span>
      )}
    </NavLink>
  );
}
