import { useAppSelector } from '@/app/store/hooks';

export interface ShellUser {
  fullName: string;
  initials: string;
  jobTitle: string;
  avatarTone: string;
}

export interface ShellOrganization {
  name: string;
  initials: string;
  activeProjectCount: number;
}

/**
 * هویت نمایش‌داده‌شده در پوستهٔ اپ — نوار کناری و نوار بالا.
 *
 * تا وقتی کاربر از صفحهٔ ورود نیامده (مثلاً با نشست ذخیره‌شده‌ای که هنوز
 * `GET /me` آن را پر نکرده)، مقدار جای‌گزین همان کاربر نمونهٔ بوم است.
 */
const FALLBACK_USER: ShellUser = {
  fullName: 'مهندس احمدی',
  initials: 'م.ا',
  jobTitle: 'برنامه‌ریز پروژه',
  avatarTone: 'a1',
};

const FALLBACK_ORGANIZATION: ShellOrganization = {
  name: 'شرکت آبادگران ایران',
  initials: 'ا.آ',
  activeProjectCount: 12,
};

export function useShellIdentity(): { user: ShellUser; organization: ShellOrganization } {
  const user = useAppSelector((state) => state.auth.user);
  const organizations = useAppSelector((state) => state.auth.organizations);
  const currentOrganizationId = useAppSelector((state) => state.auth.currentOrganizationId);

  const organization =
    organizations.find((item) => item.id === currentOrganizationId) ?? FALLBACK_ORGANIZATION;

  return { user: user ?? FALLBACK_USER, organization };
}
