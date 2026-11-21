import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { ProjectStatus } from '@projeyar/shared';
import { NotFoundError } from '../../../platform/http/errors.js';
import { type WorkCalendar } from '../../computation/index.js';
import type { PlanContent } from '../../planning/index.js';
import { ProjectCalendar } from '../domain/project-settings.entity.js';
import { type KeyMilestone, Project } from '../domain/project.entity.js';

// پیوند F02 و F04 (D05؛ plan-versions.md ۵.۳ گام ۷، ۱۰). planning بالای projects است؛ پس:
//   • projects دو قرارداد تعریف می‌کند که planning پیاده می‌کند: ساخت مبنای کاری هنگام ساخت پروژه و
//     وضعیت نسخه‌ها برای سربرگ پروژه (وارونگی وابستگی، همان الگوی OrganizationStats).
//   • ProjectPlanAccess تنها راهی است که planning ستون‌های پروژه (نسخه‌ها و تاریخ‌ها) را می‌نویسد.

export interface PlanVersionRefView {
  readonly id: string;
  readonly kind: 'baseline' | 'revision';
  readonly number: number;
  readonly source: string;
  readonly appliedAt: string | null;
}

export interface PlanDraftSummaryView {
  readonly versionId: string;
  readonly kind: 'baseline' | 'revision';
  readonly number: number;
  readonly draftRevision: number;
  readonly changeCount: number;
  readonly lastSavedAt: string | null;
  readonly lastSavedBy: { readonly id: string; readonly fullName: string; readonly avatarTone: string } | null;
}

export interface ProjectPlanStateView {
  readonly baseline: PlanVersionRefView | null;
  readonly current: PlanVersionRefView | null;
  readonly pvReference: PlanVersionRefView | null;
  readonly draft: PlanDraftSummaryView | null;
}

/** پیاده‌سازی: planning. درون تراکنش ساخت پروژه (F02 ۵.۴؛ project-setup.md ۵.۲). */
export abstract class PlanBootstrap {
  abstract createBaseline(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly projectId: string;
      readonly actorUserId: string;
      readonly milestones: readonly KeyMilestone[];
      readonly content?: PlanContent;
    },
  ): Promise<void>;
}

/** یک پیش‌شرط یا هشدار فعال‌سازی (ActivationCheckItem فرانت؛ F02 ۸.۱). */
export interface ActivationItem {
  readonly code: string;
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string | null;
  readonly fixAt: 'wbs' | 'cbs' | 'links' | 'members' | 'assignment' | 'settings' | 'calendar' | null;
}

/**
 * پیاده‌سازی: wbs (اعتبارسنجی کل نسخهٔ کاری WBS + CBS را دارد و مبنا را از planning اعمال می‌کند). projects زیر هر دو است.
 */
/** شمار آیتم‌های گزارش در انتظار تأیید پروژه (ProjectNavCounts.pendingReports) — پیاده‌سازی در field. */
/** یک قاعدهٔ هشدار در W30 (AlertRuleDto فرانت). */
export interface AlertRuleView {
  readonly code: string;
  readonly name: string;
  readonly group: string;
  readonly enabled: boolean;
  readonly canDisable: boolean;
  readonly severityText: string;
  readonly params: { key: string; label: string; value: number; unit: string; min: number; max: number; step: number }[];
}

/** قواعد هشدار پروژه برای بخش «قواعد هشدار» تنظیمات (W30) — پیاده‌سازی در alerts (F12). */
export abstract class ProjectAlertRules {
  abstract list(projectId: string): Promise<AlertRuleView[]>;
}

export abstract class ProjectPendingCounts {
  abstract pendingItems(projectId: string): Promise<number>;
}

export abstract class PlanActivation {
  /** پیش‌شرط‌ها و هشدارهای برنامه (F02 ۸.۱ بندهای ۱، ۲، ۳، ۵؛ AL-STR-01، ۰۲، ۰۴). */
  abstract check(projectId: string): Promise<{ readonly blockers: ActivationItem[]; readonly warnings: ActivationItem[] }>;
  /** درون تراکنش فعال‌سازی: اعتبارسنجی دوباره و اعمال مبنا؛ خطا ← PROJECT_ACTIVATION_BLOCKED. */
  abstract applyBaseline(tx: EntityManager, projectId: string): Promise<{ readonly versionId: string }>;
}

/** پیاده‌سازی: planning. */
export abstract class ProjectPlanState {
  abstract state(projectId: string): Promise<ProjectPlanStateView>;
}

export interface ProjectPlanContext {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly mspLinked: boolean;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  readonly baselineVersionId: string | null;
  readonly currentVersionId: string | null;
  readonly pvReferenceVersionId: string | null;
  readonly keyMilestones: readonly KeyMilestone[];
  readonly calendar: WorkCalendar;
  /** ذخیرهٔ احتیاطی (ریال) — بیرون از CBS و BAC (cbs.md ۶.۱). */
  readonly contingencyReserve: string;
}

@Injectable()
export class ProjectPlanAccess {
  constructor(private readonly em: EntityManager) {}

  /** خواندن (یا با `tx` و قفل ردیف پروژه برای ذخیره و اعمال). */
  async context(projectId: string, tx?: EntityManager): Promise<ProjectPlanContext> {
    const em = tx ?? this.em;
    const project = await em.findOne(Project, { id: projectId, deletionRequestedAt: null }, tx ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {});
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    const calendar = await em.findOne(ProjectCalendar, { projectId });
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      status: project.status,
      mspLinked: project.mspLinked,
      plannedStart: project.plannedStart ?? null,
      plannedFinish: project.plannedFinish ?? null,
      baselineVersionId: project.baselineVersionId ?? null,
      currentVersionId: project.currentVersionId ?? null,
      pvReferenceVersionId: project.pvReferenceVersionId ?? null,
      keyMilestones: project.keyMilestones,
      contingencyReserve: project.contingencyReserve,
      calendar: {
        weekModes: (calendar?.workWeek ?? []).map((day) => day.mode),
        holidays: new Set((calendar?.holidays ?? []).filter((holiday) => holiday.enabled).map((holiday) => holiday.date)),
      },
    };
  }

  /** پس از اعمال نسخه (F04 ۵.۳ گام ۷): جاری، و برای مبنا مبنا و اگر خالی است مرجع PV؛ تاریخ‌ها از ریشه. */
  async recordApplied(
    tx: EntityManager,
    projectId: string,
    input: { readonly versionId: string; readonly kind: 'baseline' | 'revision'; readonly plannedStart: string | null; readonly plannedFinish: string | null },
  ): Promise<void> {
    const project = await tx.findOneOrFail(Project, { id: projectId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    project.currentVersionId = input.versionId;
    if (input.kind === 'baseline') {
      project.baselineVersionId = input.versionId;
      project.pvReferenceVersionId ??= input.versionId;
    }
    if (input.plannedStart) project.plannedStart = input.plannedStart;
    if (input.plannedFinish) project.plannedFinish = input.plannedFinish;
  }
}
