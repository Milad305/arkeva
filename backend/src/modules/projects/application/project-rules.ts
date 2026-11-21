import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ProjectStatus } from '@projeyar/shared';
import { NotFoundError } from '../../../platform/http/errors.js';
import type { WorkCalendar } from '../../computation/index.js';
import { ProjectCalendar, ProjectSettings } from '../domain/project-settings.entity.js';
import { Project } from '../domain/project.entity.js';

// تنظیمات قواعد گزارش و گردش کار تأیید یک پروژه (W29؛ `02` ۳) برای field و approvals (F08، F09). فقط خواندن؛ نویسنده
// همچنان ProjectSettingsService است.

export interface ProjectRulesView {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly managerUserId: string;
  readonly alternateReviewerUserId: string | null;
  readonly mspLinked: boolean;
  readonly siteLat: number | null;
  readonly siteLng: number | null;
  readonly calendar: WorkCalendar;
  /** ورودی‌های محاسبات (F10، F11؛ OD-19). */
  readonly progress: {
    readonly warningThreshold: number;
    readonly criticalThreshold: number;
    readonly eacMethod: 'cpi' | 'remaining' | 'composite';
    readonly pvReferenceVersionId: string | null;
    readonly currentVersionId: string | null;
    readonly costsCompleteThrough: string | null;
    /** دوره‌های گزارش از ماه شروع برنامه‌ای (تصمیم 1405/08/23). */
    readonly plannedStart: string | null;
    readonly activatedAt: Date | null;
    readonly weightGenerator: 'manual' | 'cost' | 'duration' | 'equal';
    /** پیشرفت ریالی کنار فیزیکی در W10 (ب10). */
    readonly showFinancialProgress: boolean;
  };
  /** یادآوری گزارش روزانه (NT-FLD-04؛ W29 کارگاه). */
  readonly dailyReminder: { readonly enabled: boolean; readonly time: string };
  readonly reviewDeadlineHours: number;
  readonly onDeadline: 'remind_only' | 'escalate';
  readonly workflow: {
    readonly minPhotos: number;
    readonly maxJumpPct: number;
    readonly allowDecrease: boolean;
    readonly lateAfterHours: number;
    readonly gpsMode: 'flag_only' | 'block';
    readonly gpsRadiusM: number;
    readonly approvalMode: 'single_stage' | 'two_stage';
    readonly criticalThreshold: number;
    readonly stage2OnCritical: boolean;
    readonly stage2OnJump: boolean;
    readonly stage2OnGpsOut: boolean;
    readonly stage2OnCriticalPath: boolean;
    readonly autoApproveEnabled: boolean;
    readonly autoApproveMaxDelta: number;
    readonly mspLinked: boolean;
  };
}

@Injectable()
export class ProjectRules {
  constructor(private readonly em: EntityManager) {}

  /** تقویم کامل پروژه (W28) برای نوشتن در فایل MSP (msp-integration.md ۷.۴). */
  async calendarDetail(projectId: string, em: EntityManager = this.em) {
    const calendar = await em.findOne(ProjectCalendar, { projectId });
    if (!calendar) return null;
    return {
      weekModes: calendar.workWeek.map((day) => day.mode),
      dayStart: calendar.dayStart,
      dayEnd: calendar.dayEnd,
      halfDayEnd: calendar.halfDayEnd,
      holidays: calendar.holidays.filter((holiday) => holiday.enabled).map((holiday) => ({ date: holiday.date, title: holiday.title })),
    };
  }

  async of(projectId: string, em: EntityManager = this.em): Promise<ProjectRulesView> {
    const [project, settings, calendar] = await Promise.all([
      em.findOne(Project, { id: projectId, deletionRequestedAt: null }),
      em.findOne(ProjectSettings, { projectId }),
      em.findOne(ProjectCalendar, { projectId }),
    ]);
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    const s = settings;
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      status: project.status,
      managerUserId: project.managerUserId,
      alternateReviewerUserId: s?.alternateReviewerUserId ?? null,
      mspLinked: project.mspLinked,
      siteLat: project.siteLat ?? null,
      siteLng: project.siteLng ?? null,
      calendar: {
        weekModes: (calendar?.workWeek ?? []).map((day) => day.mode),
        holidays: new Set((calendar?.holidays ?? []).filter((holiday) => holiday.enabled).map((holiday) => holiday.date)),
      },
      progress: {
        warningThreshold: s?.warningThreshold ?? 5,
        criticalThreshold: s?.criticalThreshold ?? 15,
        eacMethod: s?.eacMethod ?? 'cpi',
        pvReferenceVersionId: project.pvReferenceVersionId ?? null,
        currentVersionId: project.currentVersionId ?? null,
        costsCompleteThrough: project.costsCompleteThrough ?? null,
        plannedStart: project.plannedStart ?? null,
        activatedAt: project.activatedAt ?? null,
        weightGenerator: s?.weightGenerator ?? 'manual',
        showFinancialProgress: s?.showFinancialProgress ?? false,
      },
      dailyReminder: { enabled: s?.dailyReminderEnabled ?? true, time: s?.dailyReminderTime ?? '17:00' },
      reviewDeadlineHours: s?.reviewDeadlineHours ?? 24,
      onDeadline: s?.onDeadline ?? 'escalate',
      workflow: {
        minPhotos: s?.minPhotos ?? 2,
        maxJumpPct: s?.maxJumpPct ?? 20,
        allowDecrease: s?.allowDecrease ?? false,
        lateAfterHours: s?.lateAfterHours ?? 72,
        gpsMode: s?.gpsMode ?? 'flag_only',
        gpsRadiusM: project.gpsRadiusM,
        approvalMode: s?.approvalMode ?? 'two_stage',
        criticalThreshold: s?.criticalThreshold ?? 15,
        stage2OnCritical: s?.stage2OnCritical ?? true,
        stage2OnJump: s?.stage2OnJump ?? true,
        stage2OnGpsOut: s?.stage2OnGpsOut ?? true,
        stage2OnCriticalPath: s?.stage2OnCriticalPath ?? false,
        autoApproveEnabled: s?.autoApproveEnabled ?? true,
        autoApproveMaxDelta: s?.autoApproveMaxDelta ?? 2,
        mspLinked: project.mspLinked,
      },
    };
  }
}
