import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { IdentityService } from '../../identity/index.js';
import { firstStageApprover, routeOf, secondStageApprover, type TeamPlanItem } from '../domain/routing.js';
import { ApprovalRoute } from '../domain/team.entities.js';
import { rosterOf } from './roster.js';
import { type TeamProjectContext, TeamPlanPort, TeamProjectPort } from './team-ports.js';

// حوزه‌های تأیید (W29، W42؛ team-assignment.md ۶). تأییدکنندهٔ مرحلهٔ اول هر برگ از نزدیک‌ترین ریشهٔ حوزه؛ بی‌حوزه ←
// تأییدکنندهٔ جایگزین (AL-STR-06 با برش هشدارها). جابه‌جایی آیتم‌های منتظر مرحلهٔ اول (۶.۳) با گردش کار تأیید (F09).

export interface AreaInput {
  readonly id: string | null;
  readonly areaName: string;
  readonly rootIds: readonly string[];
  readonly reviewerUserId: string | null;
}

const invalid = (reason: string) => new DomainError('APPROVAL_ROUTES_INVALID', 422, { reason });

@Injectable()
export class ApprovalRoutes {
  constructor(
    private readonly em: EntityManager,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly identity: IdentityService,
    private readonly projects: TeamProjectPort,
    private readonly plan: TeamPlanPort,
  ) {}

  /** `GET /projects/:pid/approval-routes` — شکل W29 (تصمیم کاربر 1405/08/23؛ getApprovalRoutes همان `areas` را می‌خواند). */
  async view(projectId: string) {
    const project = await this.projects.context(projectId);
    const [routes, items, roster] = await Promise.all([
      this.em.find(ApprovalRoute, { projectId }, { orderBy: { sortOrder: 'asc', createdAt: 'asc' } }),
      this.plan.items(projectId),
      rosterOf(this.em, { projectId }),
    ]);
    const byId = new Map(items.map((item) => [item.id, item]));
    const reviewers = roster.filter((entry) => entry.roles.includes('reviewer') || entry.roles.includes('project_manager'));
    const people = await this.identity.personRefs([
      ...reviewers.map((entry) => entry.userId),
      ...routes.flatMap((route) => (route.reviewerUserId ? [route.reviewerUserId] : [])),
    ]);
    const live = routes.map((route) => ({ ...route, rootItemIds: route.rootItemIds.filter((id) => byId.has(id)) }));
    const depthOf = (item: TeamPlanItem): number => (item.parentId && byId.get(item.parentId) ? 1 + depthOf(byId.get(item.parentId) as TeamPlanItem) : 1);
    return {
      areas: live.map((route) => ({
        id: route.id,
        areaName: route.areaName,
        rootIds: route.rootItemIds,
        rootCodes: route.rootItemIds.map((id) => byId.get(id)?.code ?? ''),
        reviewerUserId: route.reviewerUserId ?? null,
        reviewerName: route.reviewerUserId ? (people.get(route.reviewerUserId)?.fullName ?? null) : null,
      })),
      fallbackApproverId: project.alternateReviewerUserId ?? project.managerUserId,
      unroutedLeafCount: items.filter((item) => item.isLeaf && !item.isMilestone && !routeOf(items, live, item.id)).length,
      wbsRoots: items
        .map((item) => ({ item, depth: depthOf(item) }))
        .filter(({ depth }) => depth <= 2)
        .map(({ item, depth }) => ({ id: item.id, code: item.code, title: item.title, depth })),
      reviewers: reviewers.map((entry) => ({
        userId: entry.userId,
        fullName: people.get(entry.userId)?.fullName ?? '',
        avatarTone: people.get(entry.userId)?.avatarTone ?? 'a1',
        isManager: entry.userId === project.managerUserId,
      })),
    };
  }

  /** حوزه‌ها بی ناظر برای «ذخیره به‌عنوان قالب» (templates.md ۵.۱؛ قالب ناظر ندارد). */
  async areasOf(projectId: string): Promise<{ name: string; rootItemIds: string[] }[]> {
    const routes = await this.em.find(ApprovalRoute, { projectId }, { orderBy: { sortOrder: 'asc', createdAt: 'asc' } });
    return routes.map((route) => ({ name: route.areaName, rootItemIds: [...route.rootItemIds] }));
  }

  /** حوزه‌های بی ناظر از قالب هنگام ساخت پروژه (templates.md ۵.۳ گام ۵)؛ درون تراکنش ساخت. */
  async createUnassigned(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly projectId: string;
      readonly areas: readonly { readonly name: string; readonly rootItemIds: readonly string[] }[];
    },
  ): Promise<void> {
    input.areas.forEach((area, index) =>
      tx.create(ApprovalRoute, {
        id: newId(),
        orgId: input.orgId,
        projectId: input.projectId,
        areaName: area.name,
        rootItemIds: [...area.rootItemIds],
        reviewerUserId: null,
        sortOrder: index,
      }),
    );
    await tx.flush();
  }

  /** `PUT /projects/:pid/approval-routes` — جایگزینی کامل از W29 (تصمیم 1405/08/15). */
  async replace(projectId: string, input: { readonly areas: readonly AreaInput[]; readonly fallbackApproverId: string }) {
    await this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
      const [items, roster, existing] = await Promise.all([this.plan.items(projectId, tx), rosterOf(tx, { projectId }), tx.find(ApprovalRoute, { projectId })]);
      const byId = new Map(items.map((item) => [item.id, item]));
      const seen = new Set<string>();
      for (const area of input.areas) {
        if (!area.areaName.trim()) throw invalid('نام هر حوزه را بنویسید.');
        if (area.rootIds.length === 0) throw invalid(`حوزهٔ «${area.areaName.trim()}» هیچ بخشی از WBS ندارد.`);
        for (const id of area.rootIds) {
          const item = byId.get(id);
          if (!item) throw invalid('یکی از بخش‌های WBS در برنامهٔ جاری نیست؛ صفحه را تازه کنید.');
          if (seen.has(id)) throw invalid(`بخش ${item.code} در دو حوزه آمده است؛ هر بخش فقط یک حوزه دارد.`);
          seen.add(id);
        }
        if (area.reviewerUserId && !this.canReview(roster, project, area.reviewerUserId))
          throw invalid('تأییدکنندهٔ حوزه باید ناظر یا مدیر پروژهٔ همین پروژه باشد.');
        if (area.id && !existing.some((route) => route.id === area.id)) throw invalid('یکی از حوزه‌ها دیگر وجود ندارد؛ صفحه را تازه کنید.');
      }
      if (!roster.some((entry) => entry.userId === input.fallbackApproverId)) throw invalid('تأییدکنندهٔ جایگزین باید عضو فعال پروژه باشد.');

      const kept = new Set(input.areas.flatMap((area) => (area.id ? [area.id] : [])));
      for (const route of existing) if (!kept.has(route.id)) tx.remove(route);
      input.areas.forEach((area, index) => {
        const fields = { areaName: area.areaName.trim(), rootItemIds: [...new Set(area.rootIds)], reviewerUserId: area.reviewerUserId, sortOrder: index };
        const route = area.id ? existing.find((entry) => entry.id === area.id) : undefined;
        if (route) Object.assign(route, fields);
        else tx.create(ApprovalRoute, { id: newId(), orgId: project.orgId, projectId, ...fields });
      });
      const fallbackChanged = (project.alternateReviewerUserId ?? project.managerUserId) !== input.fallbackApproverId;
      if (fallbackChanged) await this.projects.setAlternateReviewer(tx, projectId, input.fallbackApproverId);
      await this.changed(tx, project, { routeCount: input.areas.length, fallbackChanged });
    });
    return this.view(projectId);
  }

  /** حوزهٔ مسئولیت ناظر از W42 (۴.۱): ریشه‌ای که در حوزهٔ دیگر بود به حوزهٔ تازه منتقل می‌شود (تصمیم 1405/08/15). */
  async assignArea(
    tx: EntityManager,
    project: TeamProjectContext,
    input: { readonly name: string; readonly rootIds: readonly string[]; readonly reviewerUserId: string },
  ): Promise<void> {
    const items = await this.plan.items(project.id, tx);
    const known = new Set(items.map((item) => item.id));
    const rootIds = [...new Set(input.rootIds)].filter((id) => known.has(id));
    if (rootIds.length === 0) throw new DomainError('MEMBER_INVALID', 422, { reason: 'برای ناظر دست‌کم یک بخش WBS به‌عنوان حوزهٔ مسئولیت انتخاب کنید.' });
    const routes = await tx.find(ApprovalRoute, { projectId: project.id });
    for (const route of routes) {
      route.rootItemIds = route.rootItemIds.filter((id) => !rootIds.includes(id));
      if (route.rootItemIds.length === 0) tx.remove(route);
    }
    tx.create(ApprovalRoute, {
      id: newId(),
      orgId: project.orgId,
      projectId: project.id,
      areaName: input.name.trim() || 'حوزهٔ تازه',
      rootItemIds: rootIds,
      reviewerUserId: input.reviewerUserId,
      sortOrder: routes.length,
    });
    await this.changed(tx, project, { routeCount: routes.length + 1, fallbackChanged: false });
  }

  /**
   * حذف نقش ناظر یا عضو (۴.۲، ۴.۳): حوزه‌هایش بی‌تأییدکننده می‌شوند و اگر جایگزین بود، جایگزین به مدیر پروژه برمی‌گردد.
   * شمار حوزه‌های بی‌تأییدکننده شده را برمی‌گرداند.
   */
  async releaseReviewer(tx: EntityManager, project: TeamProjectContext, userId: string, alsoFallback: boolean): Promise<number> {
    const routes = await tx.find(ApprovalRoute, { projectId: project.id, reviewerUserId: userId });
    for (const route of routes) route.reviewerUserId = null;
    const fallbackReset = alsoFallback && project.alternateReviewerUserId === userId && userId !== project.managerUserId;
    if (fallbackReset) await this.projects.setAlternateReviewer(tx, project.id, project.managerUserId);
    if (routes.length > 0 || fallbackReset) await this.changed(tx, project, { routeCount: routes.length, fallbackChanged: fallbackReset });
    return routes.length;
  }

  /** تأییدکنندهٔ حوزهٔ هر برگ (یا null بی‌حوزه) — دامنهٔ «حوزهٔ خودش» ناظر در صندوق گزارش‌ها (F09 ۵.۱). */
  async reviewerByLeaf(projectId: string): Promise<Map<string, string | null>> {
    const [items, routes] = await Promise.all([this.plan.items(projectId), this.em.find(ApprovalRoute, { projectId })]);
    return new Map(items.filter((item) => item.isLeaf).map((item) => [item.id, routeOf(items, routes, item.id)?.reviewerUserId ?? null]));
  }

  /** حوزه‌هایی که این شخص تأییدکنندهٔ آن‌هاست (پیامد حذف، W16). */
  routesOf(projectId: string, userId: string): Promise<ApprovalRoute[]> {
    return this.em.find(ApprovalRoute, { projectId, reviewerUserId: userId });
  }

  /** تأییدکنندهٔ مرحلهٔ اول و دوم برگ با منع خودتأییدی (۶.۲؛ برای اپ و F09). */
  async approverFor(projectId: string, wbsItemId: string, authorUserId: string | null) {
    const project = await this.projects.context(projectId);
    const [items, routes] = await Promise.all([this.plan.items(projectId), this.em.find(ApprovalRoute, { projectId })]);
    const route = routeOf(items, routes, wbsItemId);
    const alternate = project.alternateReviewerUserId ?? project.managerUserId;
    return {
      routeId: route?.id ?? null,
      firstStage: firstStageApprover({ routeReviewer: route?.reviewerUserId ?? null, alternate, manager: project.managerUserId, author: authorUserId }),
      secondStage: secondStageApprover({ alternate, manager: project.managerUserId, author: authorUserId }),
    };
  }

  private canReview(roster: Awaited<ReturnType<typeof rosterOf>>, project: TeamProjectContext, userId: string): boolean {
    const entry = roster.find((member) => member.userId === userId);
    return !!entry && (entry.roles.includes('reviewer') || entry.roles.includes('project_manager') || userId === project.managerUserId);
  }

  private async changed(
    tx: EntityManager,
    project: TeamProjectContext,
    payload: { readonly routeCount: number; readonly fallbackChanged: boolean },
  ): Promise<void> {
    await this.outbox.emit(tx, { type: 'ApprovalRouteChanged', projectId: project.id, payload: { v: 1, ...payload } });
    this.audit.record(tx, { action: 'team.approval_routes_changed', entityType: 'Project', entityId: project.id, projectId: project.id, after: payload });
  }
}
