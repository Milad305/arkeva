import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { DomainEvent } from '../../../platform/outbox/domain-event.entity.js';
import { projectsWith } from '../../../platform/security/access.js';
import { formatJalali } from '../../../platform/time/jalali.js';
import { AlertReads } from '../../alerts/reads.js';
import { IdentityService, ProjectCatalog } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { RiskReads } from '../../risks/index.js';

// «فعالیت‌های اخیر» (platform.md ۱۰؛ ActivityEventDto): پرس‌وجو روی outbox با فهرست سفید، بی جدول جدا. ۱۰ مورد پیش‌فرض؛
// متن فید هیچ مبلغی ندارد (رویدادهای هزینه فقط شمار ردیف).

const KINDS: Record<string, string> = {
  FieldReportReceived: 'report_submitted',
  FieldReportItemApproved: 'report_approved',
  FieldReportItemRejected: 'report_items_rejected',
  AlertRaised: 'alert_raised',
  MemberChanged: 'member_added',
  SyncSessionApplied: 'msp_synced',
  PlanVersionApplied: 'plan_applied',
  PeriodClosed: 'period_closed',
  RiskChanged: 'risk_changed',
  CostEntryPosted: 'cost_posted',
};
/** تغییرهای ریسک که در فید می‌آیند؛ ویرایش متن نه. */
const RISK_CHANGES = new Set(['created', 'score', 'owner', 'status:closed', 'status:occurred', 'status:assessed']);
const SUBJECT_TYPES: Record<string, string> = { wbs_item: 'wbs_item', cbs_item: 'cbs_item', risk: 'risk', user_in_project: 'user' };
const SEVERITY_TEXT: Record<string, string> = { info: 'اطلاع', warning: 'هشدار', critical: 'بحرانی' };

const visible = (event: DomainEvent): boolean => {
  if (event.type === 'MemberChanged') return event.payload['change'] === 'added';
  if (event.type === 'RiskChanged') return RISK_CHANGES.has(String(event.payload['change']));
  return true;
};

@Injectable()
export class ActivityFeed {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly catalog: ProjectCatalog,
    private readonly identity: IdentityService,
    private readonly planning: PlanningService,
    private readonly alerts: AlertReads,
    private readonly risks: RiskReads,
  ) {}

  /** `GET /projects/:pid/activity` */
  async project(projectId: string, limit: number) {
    const projects = await this.visibleProjects();
    if (!projects.has(projectId)) throw new NotFoundError('PROJECT_NOT_FOUND');
    return this.feed([projectId], projects, limit, false);
  }

  /** `GET /activity` — پروژه‌های کاربر (W05). */
  async mine(limit: number) {
    const projects = await this.visibleProjects();
    return this.feed([...projects.keys()], projects, limit, true);
  }

  private async visibleProjects(): Promise<Map<string, string>> {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const allowed = new Set(projectsWith(access, 'project.view'));
    return new Map((await this.catalog.list()).filter((project) => access.isOrgAdmin || allowed.has(project.id)).map((project) => [project.id, project.name]));
  }

  private async feed(projectIds: readonly string[], names: ReadonlyMap<string, string>, limit: number, withProject: boolean) {
    if (projectIds.length === 0) return [];
    const rows = await this.em.find(
      DomainEvent,
      { projectId: { $in: [...projectIds] }, type: { $in: Object.keys(KINDS) } },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, limit: limit * 4 },
    );
    const events = rows.filter(visible).slice(0, limit);
    const ids = (key: string) => events.flatMap((event) => (typeof event.payload[key] === 'string' ? [event.payload[key]] : []));
    const [people, alerts, riskTitles] = await Promise.all([
      this.identity.personRefs([
        ...events.flatMap((event) => (event.actorUserId ? [event.actorUserId] : [])),
        ...events.filter((event) => event.type === 'MemberChanged').flatMap(() => ids('userId')),
      ]),
      this.alerts.byIds(ids('alertId')),
      this.risks.titles(ids('riskId')),
    ]);
    const wbs = new Map<string, string>();
    for (const projectId of new Set(events.map((event) => event.projectId as string))) {
      for (const node of (await this.planning.currentContent(projectId)).wbs) wbs.set(node.id, `${node.code} ${node.title}`);
    }
    return events.map((event) => {
      const p = event.payload;
      const str = (key: string) => (typeof p[key] === 'string' ? p[key] : '');
      const num = (key: string) => (typeof p[key] === 'number' ? p[key] : null);
      let subject: { type: string; id: string; label: string } | null = null;
      let details: string | null = null;
      let value: number | null = null;
      switch (event.type) {
        case 'FieldReportReceived':
          subject = { type: 'field_report', id: str('reportId'), label: str('reportNo') };
          value = num('itemCount');
          details = value !== null ? `${toFaDigits(value)} آیتم` : null;
          break;
        case 'FieldReportItemApproved':
        case 'FieldReportItemRejected':
          subject = { type: 'wbs_item', id: str('wbsItemId'), label: wbs.get(str('wbsItemId')) ?? 'فعالیت' };
          details = str('note') || null;
          break;
        case 'AlertRaised': {
          const alert = alerts.get(str('alertId'));
          const type = alert ? SUBJECT_TYPES[alert.subjectType] : undefined;
          subject = alert && type ? { type, id: alert.subjectId, label: alert.title } : null;
          details = `${str('ruleCode')} · ${SEVERITY_TEXT[str('severity')] ?? ''}${alert && !type ? ` · ${alert.title}` : ''}`;
          break;
        }
        case 'MemberChanged':
          subject = { type: 'user', id: str('userId'), label: people.get(str('userId'))?.fullName ?? '' };
          break;
        case 'PlanVersionApplied':
          value = num('number');
          subject = { type: 'plan_version', id: str('versionId'), label: str('kind') === 'baseline' ? 'برنامهٔ مبنا' : `بازنگری R${toFaDigits(value ?? 0)}` };
          break;
        case 'PeriodClosed':
          details = `${toFaDigits(formatJalali(str('startDate')))} تا ${toFaDigits(formatJalali(str('endDate')))}`;
          break;
        case 'RiskChanged':
          subject = { type: 'risk', id: str('riskId'), label: riskTitles.get(str('riskId')) ?? 'ریسک' };
          value = num('score');
          details =
            str('change') === 'created'
              ? 'ثبت شد'
              : str('change') === 'score'
                ? `امتیاز ${toFaDigits(value ?? 0)}`
                : str('change') === 'owner'
                  ? 'مالک عوض شد'
                  : `وضعیت: ${str('status')}`;
          break;
        case 'CostEntryPosted':
          value = num('count');
          details = `${toFaDigits(value ?? 0)} ردیف هزینه قطعی شد`;
          break;
        default:
          break;
      }
      return {
        id: event.id,
        kind: KINDS[event.type] as string,
        occurredAt: event.occurredAt.toISOString(),
        actor: event.actorUserId ? (people.get(event.actorUserId) ?? null) : null,
        subject,
        details,
        value,
        ...(withProject && event.projectId ? { project: { id: event.projectId, name: names.get(event.projectId) ?? '' } } : {}),
      };
    });
  }
}
