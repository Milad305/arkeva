import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { bearingDeg } from '../../computation/index.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ForbiddenError, UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { FieldRecords, type ItemRecord, type PhotoRecord, type ReportRecord } from '../../field/index.js';
import { IdentityService, type PersonRef, ProjectCatalog } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { ApprovalRoutes } from '../../team/index.js';
import type { FieldReview } from '../domain/review.entity.js';
import { ItemViews } from './item-view.js';
import { ReviewAccess } from './review-access.js';

// صندوق گزارش‌ها (W20؛ approval-workflow.md ۵.۱) و جزئیات گزارش (W40؛ ۵.۲). همهٔ مقادیر، پرچم‌ها، مهلت و «معوق» از سرور
// (D07). آیتم `submitted` (منتظر عکس) در هیچ صندوقی نیست (AC-AP-05). ناظر (own_area) آیتم‌های حوزهٔ خودش و آنچه به او
// سپرده شده؛ زبانهٔ «در انتظار» برایش فقط آنچه تصمیمش با اوست (AC-AP-11).

type Tab = 'pending' | 'approved' | 'needs_revision' | 'rejected';
export const TAB_STATUSES: Record<Tab, readonly string[]> = {
  pending: ['stage1', 'stage2', 'needs_resolution'],
  approved: ['approved', 'superseded'],
  needs_revision: ['needs_revision'],
  rejected: ['rejected'],
};
const OFFLINE_AFTER_MINUTES = 30;

export interface InboxQuery {
  readonly tab: Tab | 'all';
  readonly projectId: string | null;
  readonly supervisorId: string | null;
  readonly wbsRootId: string | null;
  readonly range: '7d' | '30d' | 'all';
  readonly flagged: boolean;
  readonly sort: 'newest' | 'oldest_waiting';
}

export interface Loaded {
  readonly reports: ReportRecord[];
  readonly items: ItemRecord[];
  readonly reviews: FieldReview[];
  readonly photos: PhotoRecord[];
  readonly people: Map<string, PersonRef>;
  readonly projectNames: Map<string, string>;
}

@Injectable()
export class ReportViews {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly records: FieldRecords,
    private readonly access: ReviewAccess,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectCatalog,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
    private readonly routes: ApprovalRoutes,
    private readonly itemViews: ItemViews,
  ) {}

  /** `GET /inbox/field-items` — میان‌پروژه‌ای (۵.۱). */
  async inbox(query: InboxQuery) {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const userId = this.access.actorId();
    const visibleProjects = (await this.catalog.list()).filter((project) => access.isOrgAdmin || projectsWith(access, 'report.view').includes(project.id));
    const projectIds = query.projectId
      ? visibleProjects.filter((project) => project.id === query.projectId).map((project) => project.id)
      : visibleProjects.map((project) => project.id);
    const since = query.range === 'all' ? null : new Date(this.clock.now().getTime() - (query.range === '7d' ? 7 : 30) * 86_400_000);
    const loaded = await this.load({ projectIds, since });
    const seen = await this.visibleItems(loaded, userId);
    // صندوق: ناظر در «در انتظار» فقط آنچه تصمیمش با اوست (AC-AP-11)؛ دامنهٔ all همه را می‌بیند. جزئیات گزارش همه را نشان می‌دهد
    const visible = {
      ...seen,
      items: seen.items.filter(
        (item) => !TAB_STATUSES.pending.includes(item.status) || this.access.scope(item.projectId, 'report.view') !== 'own_area' || seen.decidable.has(item.id),
      ),
    };
    const subtree = query.projectId && query.wbsRootId ? await this.subtree(query.projectId, query.wbsRootId) : null;
    const now = this.clock.now();
    const today = tehranClock(now).date;

    const byReport = new Map<string, ItemRecord[]>();
    for (const item of visible.items) if (!subtree || subtree.has(item.wbsItemId)) byReport.set(item.reportId, [...(byReport.get(item.reportId) ?? []), item]);
    let summaries = loaded.reports
      .filter((report) => byReport.has(report.id) && (!query.supervisorId || report.authorUserId === query.supervisorId))
      .map((report) => this.summary(report, byReport.get(report.id) ?? [], loaded));
    const flaggedCount = summaries.filter((summary) => summary.flagged).length;
    if (query.flagged) summaries = summaries.filter((summary) => summary.flagged);
    const tabCounts = { pending: 0, approved: 0, needs_revision: 0, rejected: 0, all: summaries.length };
    for (const summary of summaries) for (const tab of Object.keys(TAB_STATUSES) as Tab[]) if (summary.counts[tab] > 0) tabCounts[tab] += 1;
    const shown = query.tab === 'all' ? summaries : summaries.filter((summary) => summary.counts[query.tab as Tab] > 0);
    if (query.sort === 'oldest_waiting') shown.sort((a, b) => (a.waitingSince ?? '9999').localeCompare(b.waitingSince ?? '9999'));

    const mine = visible.items.filter((item) => visible.decidable.has(item.id));
    const openReviews = new Map(loaded.reviews.filter((review) => review.decidedAt === null).map((review) => [review.itemId, review]));
    const returned = visible.items.filter((item) => item.status === 'needs_revision');
    const wbsRoots = query.projectId ? (await this.planning.currentItems(query.projectId)).filter((item) => item.parentId === null) : [];
    return {
      reports: shown,
      tabCounts,
      flaggedCount,
      kpis: {
        pendingItems: mine.length,
        pendingReports: new Set(mine.map((item) => item.reportId)).size,
        pendingProjects: new Set(mine.map((item) => item.projectId)).size,
        overdueItems: mine.filter((item) => (openReviews.get(item.id)?.dueAt.getTime() ?? Infinity) < now.getTime()).length,
        approvedByMeToday: loaded.reviews.filter(
          (review) => review.reviewerUserId === userId && review.decision === 'approve' && review.decidedAt && tehranClock(review.decidedAt).date === today,
        ).length,
        returnedItems: returned.length,
        returnedReports: new Set(returned.map((item) => item.reportId)).size,
      },
      filters: {
        projects: visibleProjects.map((project) => ({ id: project.id, name: project.name })),
        supervisors: [...new Set(loaded.reports.map((report) => report.authorUserId))].flatMap((id) => loaded.people.get(id) ?? []),
        wbsRoots: wbsRoots.map((item) => ({ id: item.id, code: item.code, title: item.title })),
      },
    };
  }

  /** `GET /projects/:pid/field-reports/:reportId` */
  async report(projectId: string, reportId: string) {
    const userId = this.access.actorId();
    const report = await this.records.report(this.em, projectId, reportId);
    const loaded = await this.load({ projectIds: [projectId], ids: [reportId] });
    const visible = await this.visibleItems(loaded, userId);
    if (visible.items.length === 0 && this.access.scope(projectId, 'report.view') !== 'all')
      throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'report.view' });
    const [rules, leaves] = await Promise.all([this.rules.of(projectId), this.planning.currentItems(projectId)]);
    const leafById = new Map(leaves.map((leaf) => [leaf.id, leaf]));
    const items = loaded.items.filter((item) => item.reportId === reportId);
    const approvers = await this.firstApprovers(projectId, items);
    const summary = this.summary(
      report,
      visible.items.filter((item) => item.reportId === reportId),
      loaded,
    );
    const site = rules.siteLat !== null && rules.siteLng !== null ? { lat: rules.siteLat, lng: rules.siteLng } : null;
    const gps = report.gpsLat != null && report.gpsLng != null ? { lat: report.gpsLat, lng: report.gpsLng } : null;
    return {
      ...summary,
      deviceRecordedAt: report.deviceRecordedAt.toISOString(),
      delayMinutes: Math.max(0, Math.round((report.serverReceivedAt.getTime() - report.deviceRecordedAt.getTime()) / 60_000)),
      appVersion: report.appVersion ?? null,
      weather: report.weather ?? null,
      temperatureC: report.temperatureC ?? null,
      crewCount: items.some((item) => item.crewCount != null) ? items.reduce((sum, item) => sum + (item.crewCount ?? 0), 0) : null,
      distanceFromSiteM: report.distanceFromSiteM ?? null,
      siteRadiusM: rules.workflow.gpsRadiusM,
      gpsAccuracyM: report.gpsAccuracyM ?? null,
      gpsLat: gps?.lat ?? null,
      gpsLng: gps?.lng ?? null,
      gpsBearingDeg: site && gps ? bearingDeg(site, gps) : null,
      siteLat: site?.lat ?? null,
      siteLng: site?.lng ?? null,
      note: report.note ?? null,
      attested: !!report.attestedAt,
      items: await Promise.all(
        items.map((item) =>
          this.itemViews.build(
            item,
            report,
            loaded,
            leafById.get(item.wbsItemId),
            visible.decidable.has(item.id),
            approvers.get(item.wbsItemId) ?? null,
            rules,
          ),
        ),
      ),
    };
  }

  /** یک آیتم برای پاسخ تصمیم (DecisionResultDto.item). */
  async item(projectId: string, itemId: string) {
    const [item] = await this.records.items(this.em, { projectId, ids: [itemId] });
    if (!item) return null;
    const view = await this.report(projectId, item.reportId);
    return view.items.find((entry) => entry.id === itemId) ?? null;
  }

  // ── درونی ──

  async load(filter: { readonly projectIds: readonly string[]; readonly ids?: readonly string[]; readonly since?: Date | null }): Promise<Loaded> {
    const reports =
      filter.projectIds.length === 0 ? [] : await this.records.reports(this.em, { projectIds: filter.projectIds, ids: filter.ids, since: filter.since });
    const reportIds = reports.map((report) => report.id);
    const items = (reportIds.length === 0 ? [] : await this.records.items(this.em, { reportIds })).filter((item) => item.status !== 'submitted');
    const [reviews, photos, projects] = await Promise.all([
      this.access.reviewsOf(
        this.em,
        items.map((item) => item.id),
      ),
      this.records.photos(this.em, reportIds),
      this.catalog.list(),
    ]);
    const people = await this.identity.personRefs([
      ...reports.map((report) => report.authorUserId),
      ...reviews.flatMap((review) => [review.assigneeUserId, review.reviewerUserId, review.escalatedToUserId].filter((id): id is string => !!id)),
    ]);
    return { reports, items, reviews, photos, people, projectNames: new Map(projects.map((project) => [project.id, project.name])) };
  }

  /** دامنه (D11): all ← همه؛ own_area ← حوزهٔ خودش یا سپرده به او. «تصمیم با او» برای زبانهٔ در انتظار. */
  async visibleItems(loaded: Loaded, userId: string): Promise<{ items: ItemRecord[]; decidable: Set<string> }> {
    const reviewsOf = new Map<string, FieldReview[]>();
    for (const review of loaded.reviews) reviewsOf.set(review.itemId, [...(reviewsOf.get(review.itemId) ?? []), review]);
    const reportOf = new Map(loaded.reports.map((report) => [report.id, report]));
    const areaReviewer = new Map<string, Map<string, string | null>>();
    const items: ItemRecord[] = [];
    const decidable = new Set<string>();
    for (const item of loaded.items) {
      const report = reportOf.get(item.reportId) as ReportRecord;
      const reviews = reviewsOf.get(item.id) ?? [];
      const scope = this.access.scope(item.projectId, 'report.view');
      if (!scope) continue;
      let seen = scope !== 'own_area';
      if (!seen) {
        if (!areaReviewer.has(item.projectId)) areaReviewer.set(item.projectId, await this.routes.reviewerByLeaf(item.projectId));
        seen =
          areaReviewer.get(item.projectId)?.get(item.wbsItemId) === userId ||
          reviews.some((review) => [review.assigneeUserId, review.escalatedToUserId, review.reviewerUserId].includes(userId));
      }
      if (!seen) continue;
      items.push(item);
      if (TAB_STATUSES.pending.includes(item.status) && this.access.canDecide(report, item, reviews, userId)) decidable.add(item.id);
    }
    return { items, decidable };
  }

  private summary(report: ReportRecord, items: readonly ItemRecord[], loaded: Loaded) {
    const counts = { pending: 0, approved: 0, needs_revision: 0, rejected: 0 };
    for (const item of items) for (const tab of Object.keys(TAB_STATUSES) as Tab[]) if (TAB_STATUSES[tab].includes(item.status)) counts[tab] += 1;
    const flaggedItem = items.find((item) => item.flags.length > 0);
    const open = loaded.reviews.filter((review) => review.decidedAt === null && items.some((item) => item.id === review.itemId));
    const waiting = open.map((review) => review.createdAt.toISOString()).sort()[0] ?? null;
    return {
      id: report.id,
      reportNo: report.reportNo,
      projectId: report.projectId,
      projectName: loaded.projectNames.get(report.projectId) ?? '',
      source: report.source,
      workDate: report.workDate,
      author: loaded.people.get(report.authorUserId) ?? { id: report.authorUserId, fullName: '', avatarTone: 'a1' },
      serverReceivedAt: report.serverReceivedAt.toISOString(),
      offline: report.serverReceivedAt.getTime() - report.deviceRecordedAt.getTime() > OFFLINE_AFTER_MINUTES * 60_000,
      itemCount: items.length,
      counts,
      flagged: !!flaggedItem,
      flagLabel: flaggedItem ? this.flagLabel(flaggedItem) : null,
      photoCount: loaded.photos.filter((photo) => photo.reportId === report.id).length,
      waitingSince: waiting,
    };
  }

  private flagLabel(item: ItemRecord): string {
    const flag = item.flags[0];
    const delta = Math.round(item.deltaPercent * 10) / 10;
    const fa = (value: number) =>
      String(Math.abs(value))
        .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)
        .replace('.', '٫');
    if (flag === 'abnormal_jump') return `جهش ${delta >= 0 ? '+' : '−'}${fa(delta)}٪`;
    if (flag === 'decrease') return `کاهش ${fa(delta)}٪`;
    const labels: Record<string, string> = {
      insufficient_photos: 'عکس ناکافی',
      gps_out_of_range: 'خارج از محدوده',
      late_submission: 'ثبت با تأخیر',
      over_total_quantity: 'فراتر از مقدار کل',
      needs_resolution: 'نیاز تعیین تکلیف',
    };
    return labels[flag ?? ''] ?? 'پرچم‌دار';
  }

  private async firstApprovers(projectId: string, items: readonly ItemRecord[]): Promise<Map<string, string | null>> {
    const byLeaf = await this.routes.reviewerByLeaf(projectId);
    const rules = await this.rules.of(projectId);
    const fallback = rules.alternateReviewerUserId ?? rules.managerUserId;
    return new Map(items.map((item) => [item.wbsItemId, byLeaf.get(item.wbsItemId) ?? fallback]));
  }

  private async subtree(projectId: string, rootId: string): Promise<Set<string>> {
    const items = await this.planning.currentItems(projectId);
    const children = new Map<string | null, string[]>();
    for (const item of items) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item.id]);
    const out = new Set<string>();
    const visit = (id: string) => {
      out.add(id);
      for (const child of children.get(id) ?? []) visit(child);
    };
    visit(rootId);
    return out;
  }
}
