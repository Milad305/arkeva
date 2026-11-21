import type { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectStatus } from '@projeyar/shared';
import type { TeamPlanItem } from '../domain/routing.js';

export type { TeamPlanItem } from '../domain/routing.js';

// team زیر projects و planning است (projects تیم اولیه را می‌سازد و planning روی projects است)، ولی تخصیص و حوزه
// هم پروژه و تنظیمش را می‌خواهند و هم برگ‌های WBS را. پس team این دو قرارداد را تعریف می‌کند و آن دو ماژول (سراسری)
// پیاده‌سازی می‌دهند — همان وارونگی MembershipPort و OrganizationStats (01 ۷).

export interface TeamProjectContext {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly managerUserId: string;
  /** تأییدکنندهٔ جایگزین (ProjectSettings؛ پیش‌فرض مدیر پروژه). */
  readonly alternateReviewerUserId: string | null;
}

/** پیاده‌سازی: projects. */
export abstract class TeamProjectPort {
  /** با `tx` ردیف پروژه قفل می‌شود. */
  abstract context(projectId: string, tx?: EntityManager): Promise<TeamProjectContext>;
  /** مالک ستون projects است؛ team فقط از این راه می‌نویسد (W29). */
  abstract setAlternateReviewer(tx: EntityManager, projectId: string, userId: string): Promise<void>;
}

/** پیاده‌سازی: planning (مالک جدول WbsItem؛ ستون سرپرست مال team است — `03` ۲). */
export abstract class TeamPlanPort {
  /** WBS جاری بی حذف‌شده‌ها. */
  abstract items(projectId: string, em?: EntityManager): Promise<TeamPlanItem[]>;
  /** تنها راه نوشتن `WbsItem.supervisorUserId` (عملیاتی و بی نسخه؛ D05). */
  abstract setSupervisor(tx: EntityManager, projectId: string, wbsItemIds: readonly string[], supervisorUserId: string | null): Promise<void>;
}
