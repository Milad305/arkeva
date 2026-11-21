import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { type IssueEffect, type IssueType, type SiteIssue, SiteIssues } from '../../field/index.js';
import { ProjectRules } from '../../projects/index.js';
import { RiskIntake, RiskViews } from '../../risks/index.js';

// `POST /field/issues` (M13؛ field-app.md ۴.۸ و ۵.۲؛ تصمیم 1405/08/25). upsert با UUID گوشی: ارسال دوباره همان ریسک را
// برمی‌گرداند (AC-RK-05). SiteIssue با field (مالک F08) و ریسک با F14 در یک تراکنش؛ پاسخ و M10 فقط وضعیت و دسته (AC-RK-11).

export interface AppIssueBody {
  readonly id: string;
  readonly projectId: string;
  readonly type: IssueType;
  readonly title: string;
  readonly description?: string | null;
  readonly effect: IssueEffect;
  readonly wbsItemId?: string | null;
  readonly deviceRecordedAt: Date;
  readonly photos?: readonly { readonly id: string; readonly sha256: string; readonly takenAt: Date }[];
}

const invalid = (reason: string) => new DomainError('FIELD_ENTRY_INVALID', 422, { reason });

@Injectable()
export class AppIssues {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly issues: SiteIssues,
    private readonly intake: RiskIntake,
    private readonly risks: RiskViews,
    private readonly rules: ProjectRules,
  ) {}

  private actor(projectId: string): { userId: string; orgId: string } {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    const codes = access.projects.get(projectId);
    if (!codes) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (!codes.has('risk.create_site_issue') && !codes.has('risk.create'))
      throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'risk.create_site_issue' });
    return actor;
  }

  async submit(body: AppIssueBody) {
    const actor = this.actor(body.projectId);
    const title = body.title.trim();
    if (title.length < 3) throw invalid('عنوان مشکل را بنویسید.');
    const photos = body.photos ?? [];
    if (photos.length > 5) throw invalid('هر مشکل حداکثر ۵ عکس دارد.');
    const known = await this.issues.find(body.id);
    if (known) return this.state(this.mine(known, actor.userId, body.projectId));
    if ((await this.rules.of(body.projectId)).status !== 'active')
      throw new ConflictError('FIELD_ENTRY_NOT_ALLOWED', { reason: 'پروژه فعال نیست و مشکل تازه نمی‌پذیرد.' });
    const issue = await this.em.transactional(async (tx) => {
      await this.issues.lockId(tx, body.id);
      // ارسال هم‌زمان دیگری پیش از ما ثبت کرد
      const raced = await this.issues.find(body.id, tx);
      if (raced) return this.mine(raced, actor.userId, body.projectId);
      const created = await this.issues.create(tx, actor.orgId, {
        id: body.id,
        projectId: body.projectId,
        reporterUserId: actor.userId,
        type: body.type,
        title,
        description: body.description?.trim() ?? '',
        effect: body.effect,
        wbsItemId: body.wbsItemId ?? null,
        deviceRecordedAt: body.deviceRecordedAt,
        photos,
      });
      const risk = await this.intake.fromSiteIssue(tx, {
        id: created.id,
        orgId: actor.orgId,
        projectId: body.projectId,
        reporterUserId: actor.userId,
        wbsItemId: created.wbsItemId ?? null,
        type: created.type,
        title,
        description: created.description,
        effect: created.effect,
        photoIds: photos.map((photo) => photo.id),
      });
      await this.issues.linkRisk(tx, created, risk.riskId);
      return created;
    });
    return this.state(issue);
  }

  /** شناسهٔ گوشی تکراری فقط برای همان گزارش‌دهنده و پروژه معنا دارد. */
  private mine(issue: SiteIssue, userId: string, projectId: string): SiteIssue {
    if (issue.reporterUserId !== userId || issue.projectId !== projectId)
      throw new ConflictError('FIELD_ENTRY_NOT_ALLOWED', { reason: 'این شناسهٔ مشکل پیش‌تر برای مورد دیگری ثبت شده است.' });
    return issue;
  }

  private async state(issue: SiteIssue) {
    const [states, photos] = await Promise.all([this.risks.siteIssueStates(issue.riskId ? [issue.riskId] : []), this.issues.photos([issue.id])]);
    const risk = issue.riskId ? states.get(issue.riskId) : undefined;
    return {
      id: issue.id,
      projectId: issue.projectId,
      riskId: issue.riskId ?? null,
      riskCode: risk?.code ?? null,
      status: risk?.status ?? 'identified',
      category: risk?.category ?? null,
      photos: photos.map((photo) => ({ id: photo.id, uploadStatus: photo.uploadStatus })),
    };
  }

  /** M10: مشکل‌های خودم با وضعیت و دسته، بی امتیاز و مبلغ (AC-RK-11). */
  async myIssues(userId: string, projectIds: readonly string[]) {
    const issues = await this.issues.mine(userId, projectIds);
    const states = await this.risks.siteIssueStates(issues.flatMap((issue) => (issue.riskId ? [issue.riskId] : [])));
    return issues.map((issue) => {
      const risk = issue.riskId ? states.get(issue.riskId) : undefined;
      return {
        id: issue.id,
        projectId: issue.projectId,
        title: issue.title,
        type: issue.type,
        effect: issue.effect,
        wbsItemId: issue.wbsItemId ?? null,
        reportedAt: issue.serverReceivedAt.toISOString(),
        riskCode: risk?.code ?? null,
        status: risk?.status ?? 'identified',
        category: risk?.category ?? null,
      };
    });
  }
}
