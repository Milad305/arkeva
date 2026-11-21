import { Injectable } from '@nestjs/common';
import { EntityManager, type FilterQuery, LockMode } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';
import { ProjectCatalog } from '../../identity/index.js';
import { Alert, type AlertSeverity, type AlertStatus } from '../domain/alert.entities.js';
import { SEVERITY_RANK } from '../domain/rule-types.js';

// خواندن و فرمان‌های هشدار (04-alert-engine ۶–۸): «نیاز به توجه» W05، فهرست پروژه، دیدن و رد. متن بی مبلغ برای کسی که در همان
// پروژه `cbs.view_amounts` ندارد (AC-AL-07). رد فقط مدیر پروژه، با دلیل، و نه برای بحرانی (AC-AL-06).

export interface AlertView {
  readonly id: string;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly ruleCode: string;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly title: string;
  readonly guidance: string;
  readonly actionLink: string;
  readonly firstTriggeredAt: string;
  readonly lastEvaluatedAt: string;
}

const STATUS_VALUES = ['open', 'seen', 'resolved', 'dismissed'] as const;

@Injectable()
export class AlertQueries {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly catalog: ProjectCatalog,
  ) {}

  private access() {
    const access = this.context.access;
    const actor = this.context.actor;
    if (!access || !actor) throw new UnauthorizedError();
    return { access, actor };
  }

  private amountsIn(projectId: string | null): boolean {
    const { access } = this.access();
    return access.isOrgAdmin || (!!projectId && (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false));
  }

  private async views(alerts: readonly Alert[]): Promise<AlertView[]> {
    const names = new Map((await this.catalog.list()).map((project) => [project.id, project.name]));
    return alerts.map((alert) => ({
      id: alert.id,
      projectId: alert.projectId ?? null,
      projectName: alert.projectId ? (names.get(alert.projectId) ?? null) : null,
      ruleCode: alert.ruleCode,
      severity: alert.severity,
      status: alert.status,
      subjectType: alert.subjectType,
      subjectId: alert.subjectId,
      title: alert.title,
      guidance: this.amountsIn(alert.projectId ?? null) ? alert.guidance : alert.guidanceSafe,
      actionLink: alert.projectId ? `/projects/${alert.projectId}${alert.actionLink}` : alert.actionLink,
      firstTriggeredAt: alert.firstTriggeredAt.toISOString(),
      lastEvaluatedAt: alert.lastEvaluatedAt.toISOString(),
    }));
  }

  private bySeverity(alerts: Alert[]): Alert[] {
    return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.firstTriggeredAt.getTime() - a.firstTriggeredAt.getTime());
  }

  /** `GET /alerts/mine` — open و seen همهٔ پروژه‌های کاربر با `alerts.view`، مرتب بر شدت. */
  async mine(query: { readonly status?: string; readonly limit?: number }) {
    const { access } = this.access();
    const statuses = parseStatuses(query.status) ?? ['open', 'seen'];
    const where: FilterQuery<Alert> = { status: { $in: statuses } };
    if (!access.isOrgAdmin) where.projectId = { $in: projectsWith(access, 'alerts.view') };
    const alerts = this.bySeverity(await this.em.find(Alert, where));
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    return {
      total: alerts.length,
      criticalCount: alerts.filter((alert) => alert.severity === 'critical').length,
      items: await this.views(alerts.slice(0, limit)),
    };
  }

  /** `GET /projects/:pid/alerts` */
  async forProject(
    projectId: string,
    query: { readonly status?: string; readonly severity?: string; readonly subjectType?: string; readonly subjectId?: string },
  ) {
    const where: FilterQuery<Alert> = { projectId, status: { $in: parseStatuses(query.status) ?? ['open', 'seen'] } };
    if (query.severity) where.severity = query.severity as AlertSeverity;
    if (query.subjectType) where.subjectType = query.subjectType as Alert['subjectType'];
    if (query.subjectId) where.subjectId = query.subjectId;
    return this.views(this.bySeverity(await this.em.find(Alert, where)));
  }

  /** `POST /alerts/:id/seen` */
  async seen(alertId: string): Promise<AlertView> {
    const alert = await this.visible(alertId, 'alerts.view');
    if (alert.status === 'open') Object.assign(alert, { status: 'seen', seenAt: this.clock.now() });
    await this.em.flush();
    return (await this.views([alert]))[0] as AlertView;
  }

  /** `POST /alerts/:id/dismiss {reason}` — فقط مدیر پروژه؛ بحرانی ردپذیر نیست (AC-AL-06). */
  async dismiss(alertId: string, reason: string): Promise<AlertView> {
    const { actor } = this.access();
    const note = reason.trim();
    if (note.length < 3) throw new DomainError('VALIDATION_FAILED', 422, { fields: [{ field: 'reason', message: 'دلیل رد هشدار را بنویسید.' }] });
    const alert = await this.em.transactional(async (tx) => {
      const locked = await tx.findOne(Alert, { id: alertId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!locked) throw new NotFoundError('ALERT_NOT_FOUND');
      this.require(locked.projectId ?? null, 'alerts.dismiss');
      if (locked.severity === 'critical') throw new ConflictError('ALERT_NOT_DISMISSIBLE', { reason: 'هشدار بحرانی رد نمی‌شود؛ با رفع شرط خودش بسته می‌شود.' });
      if (locked.status !== 'open' && locked.status !== 'seen') throw new ConflictError('ALERT_NOT_DISMISSIBLE', { reason: 'این هشدار دیگر باز نیست.' });
      Object.assign(locked, { status: 'dismissed', dismissedAt: this.clock.now(), dismissedByUserId: actor.userId, dismissReason: note });
      this.audit.record(tx, {
        action: 'alert.dismissed',
        entityType: 'Alert',
        entityId: locked.id,
        projectId: locked.projectId ?? null,
        after: { ruleCode: locked.ruleCode, severity: locked.severity },
        reason: note,
      });
      return locked;
    });
    return (await this.views([alert]))[0] as AlertView;
  }

  private async visible(alertId: string, code: 'alerts.view' | 'alerts.dismiss'): Promise<Alert> {
    const alert = await this.em.findOne(Alert, { id: alertId });
    if (!alert) throw new NotFoundError('ALERT_NOT_FOUND');
    this.require(alert.projectId ?? null, code);
    return alert;
  }

  private require(projectId: string | null, code: 'alerts.view' | 'alerts.dismiss'): void {
    const { access } = this.access();
    if (access.isOrgAdmin) return;
    const codes = projectId ? access.projects.get(projectId) : undefined;
    // عضو نیست = هشدار برایش وجود ندارد (07 ۴)
    if (!codes) throw new NotFoundError('ALERT_NOT_FOUND');
    if (!codes.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
  }
}

function parseStatuses(raw: string | undefined): AlertStatus[] | null {
  if (!raw) return null;
  const values = raw.split(',').filter((value): value is AlertStatus => (STATUS_VALUES as readonly string[]).includes(value));
  return values.length > 0 ? values : null;
}
