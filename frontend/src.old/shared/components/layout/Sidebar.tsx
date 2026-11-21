import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  ClipboardCheck,
  Users,
  BarChart3,
  Settings,
  LifeBuoy,
  MoreVertical,
  ChevronsUpDown,
  FileText,
} from 'lucide-react';

import { cn } from '@/shared/utils';
import { useAppSelector } from '@/app/store';

// بازنویسی وفادار بر اساس designs/Projects.html بخش .sidebar.
// نکته: در RTL این سایدبار در سمت راست قرار می‌گیرد (border-l).

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  permission?: string; // برای فیلتر آیتم‌ها بر اساس دسترسی (بعداً)
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// مطابق منوی designs/Projects.html: دو بخش «منو اصلی» و «سیستم».
const navSections: NavSection[] = [
  {
    title: 'منو اصلی',
    items: [
      { to: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
      { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban, badge: 12, permission: 'project.view' },
      { to: '/wbs', label: 'ساختار WBS / CBS', icon: GitBranch, permission: 'wbs.view' },
      { to: '/reports', label: 'گزارش‌های فیلد', icon: ClipboardCheck, badge: 24, permission: 'reports.view' },
      { to: '/members', label: 'کاربران و نقش‌ها', icon: Users, permission: 'members.view' },
      { to: '/charts', label: 'گزارش‌های مدیریتی', icon: BarChart3, permission: 'charts.view' },
    ],
  },
  {
    title: 'سیستم',
    items: [
      { to: '/settings', label: 'تنظیمات', icon: Settings, permission: 'settings.view' },
      { to: '/help', label: 'راهنما و پشتیبانی', icon: LifeBuoy },
    ],
  },
];

// تبدیل نام سازمان به دو حرف اول (مطابق org-mark در طراحی: «ا.آ»).
function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[1]![0]}`;
}

// تبدیل نام کامل کاربر به دو حرف اول (مطابق avatar در طراحی: «م.ا»).
function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[1]![0]}`;
}

// برچسب فارسی نقش سازمانی برای نمایش زیر نام کاربر.
const ORG_ROLE_LABELS: Record<string, string> = {
  owner: 'مالک سازمان',
  admin: 'مدیر سازمان',
  member: 'برنامه‌ریز پروژه',
};

export function Sidebar() {
  const { user } = useAppSelector((state) => state.auth);
  const organizations = useAppSelector((state) => state.auth.organizations);
  const currentOrgId = useAppSelector((state) => state.ui.currentOrganizationId);
  const currentOrg = organizations.find((org) => org.id === currentOrgId) ?? organizations[0];

  const orgName = currentOrg?.name ?? 'سازمان';
  const orgRole = currentOrg?.role ?? 'member';
  const roleLabel = ORG_ROLE_LABELS[orgRole] ?? 'برنامه‌ریز پروژه';

  return (
    <aside className="w-60 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0">
      {/* ── برند ── */}
      {/* مطابق .sb-brand: 18px padding، border-bottom gray-100، mark 32×32 با نقطه accent در گوشه. */}
      <div className="flex items-center gap-2.5 pt-[18px] px-[18px] pb-4 border-b border-gray-100">
        <div className="relative w-8 h-8 rounded-md bg-primary-700 flex items-center justify-center flex-shrink-0">
          <FileText className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          {/* نقطه تزئینی accent در گوشه پایین-راست (مطابق .sb-brand .mark::after) */}
          <span className="absolute right-[5px] bottom-[5px] w-[7px] h-[7px] bg-accent-500 rounded-[2px]" />
        </div>
        <div className="flex flex-col leading-[1.15]">
          <strong className="text-sm font-bold text-gray-900">پروژه‌یار</strong>
          <small className="text-[10.5px] text-gray-500">پنل مدیریت پیشرفت</small>
        </div>
      </div>

      {/* ── سوییچر سازمان ── */}
      {/* مطابق .sb-org: bg-gray-50، border gray-200، rounded-md، margin 14/12. */}
      <button
        type="button"
        className="mx-3 mt-3.5 mb-1 px-2.5 py-2 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2 text-right"
      >
        <span className="w-[26px] h-[26px] rounded-sm bg-accent-100 text-accent-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {orgInitials(orgName)}
        </span>
        <span className="flex-1 min-w-0 leading-[1.2]">
          <strong className="block text-[12.5px] font-semibold text-gray-900 truncate">
            {orgName}
          </strong>
          <small className="block text-[10.5px] text-gray-500">۱۲ پروژه فعال</small>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {/* ── منوی ناوبری ── */}
      {/* مطابق .sb-nav با دو .sb-section. nav منو flex-1 می‌گیرد تا کاربر در پایین بماند. */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-2">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="mt-4 mb-1.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-colors text-right w-full',
                        isActive
                          ? 'bg-primary-700 text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-gray-500')}
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 whitespace-nowrap">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={cn(
                              'mr-auto text-[11px] font-semibold px-1.5 rounded-sm min-w-5 text-center',
                              isActive
                                ? 'bg-white/[0.18] text-white'
                                : 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {item.badge.toLocaleString('fa-IR')}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── پروفایل کاربر ── */}
      {/* مطابق .sb-user: کارت شناور با border + rounded-md، نه footer با border-top. */}
      <div className="mx-2.5 mt-2.5 mb-3 p-2.5 rounded-md border border-gray-200 bg-white flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-[11.5px] font-bold flex items-center justify-center flex-shrink-0">
          {user ? userInitials(user.fullName) : '؟'}
        </span>
        <span className="flex-1 min-w-0 leading-[1.2]">
          <strong className="block text-[12.5px] font-semibold text-gray-900 truncate">
            {user?.fullName ?? 'کاربر'}
          </strong>
          <small className="block text-[10.5px] text-gray-500 truncate">{roleLabel}</small>
        </span>
        <button
          type="button"
          aria-label="بیشتر"
          className="text-gray-400 p-1 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
