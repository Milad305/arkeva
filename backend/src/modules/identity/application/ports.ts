import type { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectRoleCode, ProjectStatus } from '@projeyar/shared';

// قراردادهایی که identity برای کاربران سازمان (W26) و دعوت لازم دارد ولی مالکشان ماژول دیگری است
// (docs/backend/01 ۷: وارونگی وابستگی؛ همان الگوی OrganizationStats). team و projects به identity
// وابسته‌اند، پس پیاده‌سازی را آن‌ها می‌دهند و identity فقط این‌ها را می‌شناسد.

export interface ProjectBasics {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: ProjectStatus;
}

/** پیاده‌سازی: projects. پروژه‌های دیدنی سازمان (بی در انتظار حذف) و مقداردهی اولیهٔ انواع پروژه هنگام ثبت‌نام سازمان تازه. */
export abstract class ProjectCatalog {
  abstract list(): Promise<ProjectBasics[]>;
  abstract seedOrgDefaults(tx: EntityManager, orgId: string, now: Date): Promise<void>;
}

export interface Membership {
  readonly userId: string;
  readonly projectId: string;
  readonly roles: readonly ProjectRoleCode[];
}

/**
 * پیاده‌سازی: team (تنها نویسندهٔ عضویت و نقش پروژه، `03` ۲). فرمان‌ها درون تراکنش فراخواننده.
 * پیامدهای تخصیص، حوزه و جابه‌جایی کار با برش ۵ (F07) به همین متدها افزوده می‌شوند.
 */
/** بخش «اعلان‌ها»ی حساب من (W32) — پیاده‌سازی در notifications (F13). */
export interface AccountNotificationsView {
  readonly groups: {
    key: string;
    label: string;
    description: string;
    channels: Record<'in_app' | 'email' | 'push' | 'sms', 'on' | 'off' | 'locked_on' | 'na'>;
  }[];
  readonly quietHours: { enabled: boolean; from: string; to: string };
}

export abstract class AccountNotifications {
  abstract view(userId: string): Promise<AccountNotificationsView>;
}

export abstract class MembershipPort {
  abstract memberships(userIds?: readonly string[]): Promise<Membership[]>;
  abstract addMember(
    tx: EntityManager,
    input: { readonly orgId: string; readonly projectId: string; readonly userId: string; readonly roles: readonly ProjectRoleCode[] },
  ): Promise<void>;
  /** نقش‌ها را جایگزین می‌کند؛ نقش مدیر پروژه دست نمی‌خورد (انتقال مدیریت راه جداست). */
  abstract setRoles(
    tx: EntityManager,
    input: { readonly projectId: string; readonly userId: string; readonly roles: readonly ProjectRoleCode[] },
  ): Promise<void>;
  /** دلیل مانع حذف عضو از پروژه، یا null (مدیر پروژه حذف نمی‌شود؛ AC-TM-05). */
  abstract removalBlock(projectId: string, userId: string): Promise<string | null>;
  abstract removeMember(tx: EntityManager, input: { readonly projectId: string; readonly userId: string }): Promise<void>;
}
