import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { IdentityService } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { Risk, RiskLink } from '../domain/risk.entities.js';
import { riskLink } from './risk-commands.js';
import { RiskStore } from './risk-store.js';

// مشکل کارگاه ← ریسک (risk.md ۵.۳؛ AC-RK-04). فراخوان (field-app) همان تراکنش دریافت SiteIssue را می‌دهد:
//   ریسک identified با منبع field و بی امتیاز، کد RSK-NNN، دسته از نوع مشکل، رویداد = شرح، پیامد از «اثر بر کار»، پیوند به برگ،
//   مالک موقت = مدیر پروژه، عکس‌ها پیوست یادداشت اول، NT-RSK-04 به مدیر پروژه. سرپرست دنبال‌کننده نمی‌شود (امتیاز نمی‌بیند).

/** نگاشت `[تأییدشده]` ۵.۳. */
export const ISSUE_CATEGORY: Record<string, string> = {
  material: 'تأمین',
  safety: 'ایمنی',
  equipment: 'منابع',
  design: 'طراحی',
  weather: 'محیطی',
  other: 'فنی',
};

const EFFECT_TEXT: Record<string, string> = { stop: 'توقف کار', slow: 'کندی کار', none: 'بدون اثر فعلی بر کار' };

export interface IssueForRisk {
  readonly id: string;
  readonly orgId: string;
  readonly projectId: string;
  readonly reporterUserId: string;
  readonly wbsItemId: string | null;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly effect: 'stop' | 'slow' | 'none';
  readonly photoIds: readonly string[];
}

@Injectable()
export class RiskIntake {
  constructor(
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly notifier: Notifier,
    private readonly identity: IdentityService,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
    private readonly store: RiskStore,
  ) {}

  async fromSiteIssue(tx: EntityManager, issue: IssueForRisk): Promise<{ readonly riskId: string; readonly code: string }> {
    const rules = await this.rules.of(issue.projectId, tx);
    const now = this.clock.now();
    const risk = tx.create(Risk, {
      id: newId(),
      orgId: issue.orgId,
      projectId: issue.projectId,
      code: await this.store.nextCode(tx, issue.orgId, issue.projectId),
      title: issue.title,
      category: ISSUE_CATEGORY[issue.type] ?? 'فنی',
      cause: null,
      event: issue.description || null,
      consequence: EFFECT_TEXT[issue.effect] ?? null,
      probability: null,
      impact: null,
      score: null,
      level: null,
      status: 'identified',
      responseStrategy: null,
      ownerUserId: rules.managerUserId,
      triggerText: null,
      nextReviewDate: null,
      reviewFrequency: null,
      costImpact: null,
      scheduleImpactDays: null,
      targetProbability: null,
      targetImpact: null,
      source: 'field',
      sourceReportedByUserId: issue.reporterUserId,
      sourceIssueType: issue.type,
      sourceIssueEffect: issue.effect,
      closeReason: null,
      closedAt: null,
      closedByUserId: null,
      occurredAt: null,
      actualCost: null,
      actualDelayDays: null,
      createdByUserId: issue.reporterUserId,
      createdAt: now,
      updatedAt: now,
    });
    await tx.flush();
    // برگی که به سرپرست دیگری رفته هم پذیرفته می‌شود (۱۱)؛ برگ ناشناخته پیوند نمی‌گیرد
    if (issue.wbsItemId && (await this.planning.currentContent(issue.projectId)).wbs.some((node) => node.id === issue.wbsItemId)) {
      tx.create(RiskLink, {
        id: newId(),
        orgId: issue.orgId,
        projectId: issue.projectId,
        riskId: risk.id,
        targetType: 'wbs_item',
        targetId: issue.wbsItemId,
        createdAt: now,
      });
    }
    const note = this.store.note(tx, risk, 'created', `از کارگاه گزارش شد · ${EFFECT_TEXT[issue.effect] ?? ''}`, issue.reporterUserId);
    note.attachmentKeys = [...issue.photoIds];
    await this.store.follow(tx, risk, [rules.managerUserId]);
    await this.outbox.emit(tx, {
      type: 'RiskChanged',
      projectId: issue.projectId,
      payload: { v: 1, riskId: risk.id, change: 'created', status: 'identified', score: null, source: 'field' },
    });
    this.audit.record(tx, {
      action: 'risk.created',
      entityType: 'Risk',
      entityId: risk.id,
      projectId: issue.projectId,
      after: { code: risk.code, source: 'field', issueId: issue.id },
    });
    const reporter = (await this.identity.personRefs([issue.reporterUserId])).get(issue.reporterUserId)?.fullName ?? 'سرپرست';
    await this.notifier.notify(tx, {
      code: 'NT-RSK-04',
      projectId: issue.projectId,
      recipients: [rules.managerUserId].filter((userId) => userId !== issue.reporterUserId),
      subjectId: risk.id,
      title: `${reporter} مشکل «${issue.title}» را از کارگاه گزارش کرد.`,
      body: `${risk.code} · ${rules.name}`,
      link: riskLink(issue.projectId, risk.id),
    });
    return { riskId: risk.id, code: risk.code };
  }
}
