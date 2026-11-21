import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { cn } from '@/shared/utils/cn';
import { useAppDispatch } from '@/app/store/hooks';
import { toggleCommandPalette } from '@/app/store/uiSlice';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconButton, IconLink } from '@/shared/components/ui/IconButton';
import { Breadcrumbs, type Crumb } from '@/shared/components/ui/PageHead';
import { Kbd } from '@/shared/components/ui/Kbd';
import { getTopbarBell } from './topbarSlots';
import { useShellIdentity } from './useShellIdentity';

export interface TopbarProps {
  /** عنوان صفحه — برای صفحه‌های سطح سازمان. */
  title?: string;
  icon?: IconName;
  /** مسیر — برای صفحه‌های درون پروژه. عنوان و مسیر با هم نمی‌آیند. */
  crumbs?: Crumb[];
  /** نوار جستجوی عریض میانی. */
  showSearch?: boolean;
  /** اگر نیاید از نشست جاری خوانده می‌شود. */
  user?: { fullName: string; initials: string; avatarTone: string };
  unreadNotifications?: number;
}

/**
 * نوار بالا — `.topbar` در kit.css، ارتفاع ۵۲px.
 *
 * `flex` با `min-width:0` روی مسیر، پس در عرض کم مسیر کوتاه می‌شود
 * و دکمه‌ها بیرون نمی‌زنند.
 */
export function Topbar({
  title,
  icon = 'layout-dashboard',
  crumbs,
  showSearch = false,
  user: userOverride,
  unreadNotifications = 0,
}: TopbarProps) {
  const dispatch = useAppDispatch();
  const shell = useShellIdentity();
  const user = userOverride ?? shell.user;
  const openPalette = () => dispatch(toggleCommandPalette());
  const Bell = getTopbarBell();

  return (
    <header className="topbar">
      {title && (
        <div className="tb-title">
          <span className="tx-pri" style={{ display: 'inline-flex' }}>
            <Icon name={icon} size={16} />
          </span>
          <span className="trunc">{title}</span>
        </div>
      )}

      {!title && crumbs && <Breadcrumbs items={crumbs} variant="topbar" />}

      {showSearch && (
        <button type="button" className="tb-search" onClick={openPalette}>
          <Icon name="search" size={14} />
          <span className="grow trunc" style={{ textAlign: 'start' }}>
            جستجوی سراسری در پروژه‌ها، گزارش‌ها و کاربران…
          </span>
          <Kbd>Ctrl+K</Kbd>
        </button>
      )}

      <div className="row g4 ms-auto">
        {!showSearch && (
          <IconButton icon="search" label="جستجو" onClick={openPalette} />
        )}

        {Bell ? (
          <Bell />
        ) : (
          <IconLink
            icon="bell"
            to={ROUTES.notifications}
            ping={unreadNotifications > 0}
            label={
              unreadNotifications > 0
                ? `اعلان‌ها، ${unreadNotifications} مورد خوانده‌نشده`
                : 'اعلان‌ها'
            }
          />
        )}

        <IconLink icon="help-circle" to={ROUTES.help} label="راهنما" />

        <span className="vsep" />

        <Link className="me" to={ROUTES.account} aria-label={`حساب کاربری ${user.fullName}`}>
          <span className={cn('av', user.avatarTone)}>{user.initials}</span>
          <Icon name="chevron-down" size={14} />
        </Link>
      </div>
    </header>
  );
}
