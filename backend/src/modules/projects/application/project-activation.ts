import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { Permission } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { ApprovalRoutes } from '../../team/index.js';
import { projectMachine } from '../domain/project-status.machine.js';
import { ProjectCalendar } from '../domain/project-settings.entity.js';
import { Project } from '../domain/project.entity.js';
import { type ActivationItem, PlanActivation } from './plan-ports.js';
import type { TransitionResult } from './project-lifecycle.js';

// فعال‌سازی پروژه (F02 ۸.۱؛ AC-PS-05، AC-PS-06). پیش‌شرط‌های برنامه از PlanActivation (wbs) و بقیه اینجا. اثر در یک
// تراکنش: مبنا اعمال (F04)، `status = active`، `activatedAt`، `ProjectActivated` (← NT-PRJ-01 به اعضا). دوره‌های گزارش
// (F10 ۵.۸) با برش گزارش کارگاه.

@Injectable()
export class ProjectActivation {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly audit: Audit,
    private readonly plan: PlanActivation,
    private readonly routes: ApprovalRoutes,
  ) {}

  /** `GET /projects/:pid/activation-check` */
  async check(projectId: string): Promise<{ canActivate: boolean; blockers: ActivationItem[]; warnings: ActivationItem[] }> {
    const project = await this.em.findOne(Project, { id: projectId, deletionRequestedAt: null });
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (project.status !== 'draft') throw new ConflictError('TRANSITION_NOT_ALLOWED', { machine: 'Project', action: 'activate', from: project.status });
    const [plan, calendar, areas] = await Promise.all([
      this.plan.check(projectId),
      this.em.findOne(ProjectCalendar, { projectId }),
      this.routes.view(projectId),
    ]);
    const withoutReviewer = areas.areas.filter((area) => !area.reviewerUserId).length;
    const blockers: ActivationItem[] = [
      ...plan.blockers,
      {
        code: 'manager_calendar',
        label: 'مدیر پروژه و تقویم تعیین شده',
        passed: !!project.managerUserId && !!calendar,
        detail: calendar ? null : 'تقویم کاری پروژه هنوز ذخیره نشده است؛ در «تنظیمات ← تقویم» روزهای کاری را تعیین کنید.',
        fixAt: 'calendar',
      },
    ];
    const routeIssues = withoutReviewer + (areas.unroutedLeafCount > 0 ? 1 : 0);
    const extra: ActivationItem[] = [
      {
        code: 'AL-STR-06',
        label: 'حوزهٔ بدون ناظر',
        passed: routeIssues === 0,
        detail:
          routeIssues === 0
            ? null
            : [
                withoutReviewer > 0 ? `${toFaDigits(withoutReviewer)} حوزه ناظر ندارد` : null,
                areas.unroutedLeafCount > 0 ? `${toFaDigits(areas.unroutedLeafCount)} برگ در هیچ حوزه‌ای نیست و به تأییدکنندهٔ جایگزین می‌رود` : null,
              ]
                .filter(Boolean)
                .join('؛ '),
        fixAt: 'settings',
      },
      {
        code: 'site_location',
        label: 'موقعیت کارگاه',
        passed: project.siteLat !== null && project.siteLat !== undefined && project.siteLng !== null && project.siteLng !== undefined,
        detail: 'بدون آن کنترل GPS گزارش‌ها انجام نمی‌شود',
        fixAt: 'settings',
      },
      // تاریخ کامل بودن هزینه‌ها مال دفتر هزینه (F06، برش ۸) است؛ تا آن موقع همیشه ثبت‌نشده
      { code: 'costs_complete', label: 'تاریخ کامل بودن هزینه‌ها', passed: false, detail: 'تا ثبت نشود، CPI از تاریخ داده محاسبه نمی‌شود', fixAt: 'cbs' },
    ];
    const warnings = [...plan.warnings, ...extra.map((entry) => (entry.passed ? { ...entry, detail: null } : entry))];
    return { canActivate: blockers.every((entry) => entry.passed), blockers, warnings };
  }

  /** `POST /projects/:pid/activate` — پیش‌شرط‌ها درون تراکنش دوباره سنجیده می‌شوند. */
  async activate(projectId: string): Promise<TransitionResult> {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    const permissions: ReadonlySet<Permission> | 'all' = access.isOrgAdmin ? 'all' : new Set(access.projects.get(projectId)?.keys() ?? []);
    const report = await this.check(projectId);
    const blocker = report.blockers.find((entry) => !entry.passed);
    if (blocker) throw new DomainError('PROJECT_ACTIVATION_BLOCKED', 422, { message: `${blocker.label}: ${blocker.detail ?? ''}`.trim(), code: blocker.code });
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const project = await tx.findOne(Project, { id: projectId, deletionRequestedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
      // دسترسی و وضعیت پیش از هر نوشتن (همان قواعد ماشین)
      if (!projectMachine.available(project, { permissions, reason: null, now }).includes('activate'))
        projectMachine.apply(project, 'activate', { permissions, reason: null, now });
      const { versionId } = await this.plan.applyBaseline(tx, projectId);
      const applied = projectMachine.apply(project, 'activate', { permissions, reason: null, now });
      this.audit.record(tx, {
        action: 'project.activate',
        entityType: 'Project',
        entityId: project.id,
        projectId: project.id,
        before: { status: applied.from },
        after: { status: applied.to, baselineVersionId: versionId },
      });
      await this.outbox.emit(tx, { type: 'ProjectActivated', projectId: project.id, payload: { v: 1, baselineVersionId: versionId } });
      await this.outbox.emit(tx, {
        type: 'ProjectStatusChanged',
        projectId: project.id,
        payload: { v: 1, action: 'activate', from: applied.from, to: applied.to },
      });
      return { id: project.id, status: project.status };
    });
  }
}
