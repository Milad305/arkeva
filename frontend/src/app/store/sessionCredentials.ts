import { initialsFor, orgInitialsFor } from '@/shared/components/ui/Avatar';
import type { SessionDto } from '@/modules/auth/types';
import type { Credentials } from './authSlice';

// نشست سرور ← وضعیت store. یک جا برای ورود، تازه‌سازی و بازگشت نشست پس از تازه‌کردن صفحه.

export function toCredentials(session: SessionDto): Credentials {
  return {
    user: {
      id: session.user.id,
      fullName: session.user.fullName,
      initials: initialsFor(session.user.fullName),
      username: session.user.email ?? session.user.mobile,
      mobile: session.user.mobile,
      jobTitle: session.user.jobTitle ?? '',
      avatarTone: session.user.avatarTone ?? 'a1',
    },
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    organizations: [
      {
        id: session.organization.id,
        name: session.organization.name,
        initials: orgInitialsFor(session.organization.name),
        activeProjectCount: session.organization.activeProjectCount,
      },
    ],
    effectivePermissions: session.permissions,
  };
}
