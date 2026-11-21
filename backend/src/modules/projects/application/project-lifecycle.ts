import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { Permission, ProjectStatus } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { IdentityService, StepUpChallenges } from '../../identity/index.js';
import { TeamService } from '../../team/index.js';
import { type ProjectAction, projectMachine } from '../domain/project-status.machine.js';
import { ProjectSettings } from '../domain/project-settings.entity.js';
import { Project } from '../domain/project.entity.js';

// چرخهٔ عمر و منطقهٔ خطر پروژه (F02 ۸؛ W30، W41). هر تغییر وضعیت از موتور گردش کار می‌گذرد و در
// همان تراکنش ممیزی و رویداد می‌سازد. فعال‌سازی با F04 در مرحلهٔ ۲ می‌آید.

/** مهلت لغو حذف پروژهٔ بایگانی‌شده (F02 ۸.۴ `[تأییدشده]`). */
export const DELETION_GRACE_DAYS = 14;

/** وضعیت‌هایی که هنوز تغییر مدیریتی می‌پذیرند (AC-PS-11: تمام‌شده و بایگانی فقط‌خواندنی‌اند). */
const WRITABLE: readonly ProjectStatus[] = ['draft', 'active', 'paused'];

export interface TransitionResult {
  readonly id: string;
  readonly status: ProjectStatus;
}

@Injectable()
export class ProjectLifecycle {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly audit: Audit,
    private readonly team: TeamService,
    private readonly identity: IdentityService,
    private readonly stepUp: StepUpChallenges,
  ) {}

  /** توقف، ادامه، پایان، بایگانی؛ و بازگردانی که مقصدش از وضعیت فعلی معلوم می‌شود. */
  transition(projectId: string, action: ProjectAction | 'restore_any', reason?: string | null): Promise<TransitionResult> {
    const permissions = this.permissionsIn(projectId);
    return this.em.transactional(async (tx) => {
      const project = await this.lockVisible(tx, projectId);
      const resolved: ProjectAction = action === 'restore_any' ? (project.status === 'completed' ? 'reopen' : 'restore') : action;
      const applied = projectMachine.apply(project, resolved, { permissions, reason: reason?.trim() || null, now: this.clock.now() });
      this.audit.record(tx, {
        action: `project.${resolved}`,
        entityType: 'Project',
        entityId: project.id,
        projectId: project.id,
        before: { status: applied.from },
        after: { status: applied.to },
        reason: reason?.trim() || null,
      });
      await this.outbox.emit(tx, {
        type: 'ProjectStatusChanged',
        projectId: project.id,
        payload: { v: 1, action: resolved, from: applied.from, to: applied.to },
      });
      return { id: project.id, status: project.status };
    });
  }

  /**
   * حذف (F02 ۸.۴؛ AC-PS-09): نام دقیق + کد پیامکی. پیش‌نویس فوراً پاک می‌شود؛ بایگانی‌شده فوراً پنهان و
   * پس از ۱۴ روز در PurgeTick پاک می‌شود. مدیر پروژه فقط پیش‌نویس را (تصمیم کاربر 1405/08/22).
   */
  async requestDeletion(projectId: string, confirmName: string, otp: string | undefined): Promise<{ id: string; purgeAfterDays: number }> {
    const isOrgAdmin = this.permissionsIn(projectId) === 'all';
    // بررسی پیش از مصرف کد تا کد برای درخواست ناممکن هدر نرود
    const project = await this.em.findOne(Project, { id: projectId, deletionRequestedAt: null });
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    this.assertDeletable(project, isOrgAdmin);
    if (confirmName.trim() !== project.name.trim()) throw new DomainError('PROJECT_DELETE_NAME_MISMATCH', 422);
    await this.stepUp.consume({ purpose: 'project.delete', subjectId: projectId, code: otp });

    return this.em.transactional(async (tx) => {
      const locked = await this.lockVisible(tx, projectId);
      this.assertDeletable(locked, isOrgAdmin);
      const now = this.clock.now();
      const identity = { code: locked.code, name: locked.name, status: locked.status };

      if (locked.status === 'draft') {
        this.audit.record(tx, { action: 'project.deleted', entityType: 'Project', entityId: locked.id, projectId: locked.id, before: identity });
        await this.outbox.emit(tx, { type: 'ProjectDeletionRequested', projectId: locked.id, payload: { v: 1, purgeAt: null } });
        tx.remove(locked);
        return { id: projectId, purgeAfterDays: 0 };
      }

      locked.deletionRequestedAt = now;
      locked.deletionPurgeAt = new Date(now.getTime() + DELETION_GRACE_DAYS * 86_400_000);
      this.audit.record(tx, {
        action: 'project.deletion_requested',
        entityType: 'Project',
        entityId: locked.id,
        projectId: locked.id,
        before: identity,
        after: { deletionPurgeAt: locked.deletionPurgeAt.toISOString() },
      });
      await this.outbox.emit(tx, {
        type: 'ProjectDeletionRequested',
        projectId: locked.id,
        payload: { v: 1, purgeAt: locked.deletionPurgeAt.toISOString() },
      });
      return { id: projectId, purgeAfterDays: DELETION_GRACE_DAYS };
    });
  }

  /** لغو حذف در مهلت ۱۴ روزه — فقط مدیر سازمان (F02 ۸.۴). */
  async cancelDeletion(projectId: string): Promise<TransitionResult> {
    if (this.permissionsIn(projectId) !== 'all') throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'project.delete' });
    return this.em.transactional(async (tx) => {
      const now = this.clock.now();
      const project = await tx.findOne(
        Project,
        { id: projectId, deletionRequestedAt: { $ne: null }, deletionPurgeAt: { $gt: now } },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!project) throw new ConflictError('PROJECT_NOT_PENDING_DELETION');
      const purgeAt = project.deletionPurgeAt?.toISOString() ?? null;
      project.deletionRequestedAt = null;
      project.deletionPurgeAt = null;
      this.audit.record(tx, {
        action: 'project.deletion_cancelled',
        entityType: 'Project',
        entityId: project.id,
        projectId: project.id,
        before: { deletionPurgeAt: purgeAt },
      });
      await this.outbox.emit(tx, { type: 'ProjectDeletionCancelled', projectId: project.id, payload: { v: 1 } });
      return { id: project.id, status: project.status };
    });
  }

  /**
   * انتقال مدیریت (F02 ۸.۴؛ AC-PS-08): به عضو فعال دیگر، با کد پیامکی. نقش‌ها را ماژول team عوض می‌کند؛
   * تأییدکنندهٔ جایگزینی که همان مدیر قبلی بود به مدیر تازه می‌رسد. مرحلهٔ دوم با F09 (code-mapping §۷.۲).
   */
  async transferManager(projectId: string, userId: string, otp: string | undefined): Promise<{ managerName: string }> {
    const project = await this.em.findOne(Project, { id: projectId, deletionRequestedAt: null });
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    this.assertWritable(project);
    if (project.managerUserId === userId || !(await this.team.isActiveMember(projectId, userId))) {
      throw new DomainError('PROJECT_MANAGER_TARGET_INVALID', 422);
    }
    await this.stepUp.consume({ purpose: 'project.transfer_manager', subjectId: projectId, code: otp });

    await this.em.transactional(async (tx) => {
      const locked = await this.lockVisible(tx, projectId);
      this.assertWritable(locked);
      const previous = locked.managerUserId;
      await this.team.transferManagerRoles(tx, projectId, previous, userId);
      locked.managerUserId = userId;
      const settings = await tx.findOne(ProjectSettings, { projectId });
      const alternateMoved = settings?.alternateReviewerUserId === previous;
      if (settings && alternateMoved) settings.alternateReviewerUserId = userId;
      this.audit.record(tx, {
        action: 'project.manager_transferred',
        entityType: 'Project',
        entityId: locked.id,
        projectId: locked.id,
        before: { managerUserId: previous, ...(alternateMoved ? { alternateReviewerUserId: previous } : {}) },
        after: { managerUserId: userId, ...(alternateMoved ? { alternateReviewerUserId: userId } : {}) },
      });
      await this.outbox.emit(tx, {
        type: 'ProjectManagerTransferred',
        projectId: locked.id,
        payload: { v: 1, fromUserId: previous, toUserId: userId },
      });
    });
    const person = (await this.identity.personRefs([userId])).get(userId);
    return { managerName: person?.fullName ?? '' };
  }

  private permissionsIn(projectId: string): ReadonlySet<Permission> | 'all' {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    if (access.isOrgAdmin) return 'all';
    return new Set(access.projects.get(projectId)?.keys() ?? []);
  }

  /** پروژهٔ در انتظار حذف برای همه پنهان است (۸.۴). */
  private async lockVisible(tx: EntityManager, projectId: string): Promise<Project> {
    const project = await tx.findOne(Project, { id: projectId, deletionRequestedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    return project;
  }

  private assertDeletable(project: Project, isOrgAdmin: boolean): void {
    if (project.status !== 'draft' && project.status !== 'archived') {
      throw new ConflictError('PROJECT_DELETE_NOT_ALLOWED', { status: project.status });
    }
    // بایگانی‌شده فقط با مدیر سازمان؛ مدیر پروژه فقط پیش‌نویس (F02 ۸.۴، ۱۱)
    if (project.status === 'archived' && !isOrgAdmin) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'project.delete' });
  }

  private assertWritable(project: Project): void {
    if (!WRITABLE.includes(project.status)) throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
  }
}
