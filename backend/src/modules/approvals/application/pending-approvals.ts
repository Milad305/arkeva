import { Injectable } from '@nestjs/common';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';
import { ProjectCatalog } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { ReportViews } from './report-views.js';

// «در انتظار تأیید من» داشبورد W05 (charts.md ۶.۱؛ PendingApprovalDto): همان آیتم‌هایی که تصمیمشان با کاربر است (AC-AP-11)،
// قدیمی‌تر اول؛ معوق از مهلت مرحلهٔ باز (`dueAt` از reviewDeadlineHours پروژه، تصمیم 1405/08/15).

@Injectable()
export class PendingApprovals {
  constructor(
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly views: ReportViews,
    private readonly catalog: ProjectCatalog,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
  ) {}

  /** تهی ← کاربر در هیچ پروژه‌ای تأییدکننده نیست. */
  async mine(limit = 5) {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    const approver =
      access.isOrgAdmin || [...access.projects.values()].some((codes) => codes.has('report.approve.stage1') || codes.has('report.approve.stage2'));
    if (!approver) return null;
    const projects = (await this.catalog.list()).filter((project) => access.isOrgAdmin || projectsWith(access, 'report.view').includes(project.id));
    const loaded = await this.views.load({ projectIds: projects.map((project) => project.id) });
    const { items, decidable } = await this.views.visibleItems(loaded, actor.userId);
    const now = this.clock.now();
    const openReview = new Map(loaded.reviews.filter((review) => review.decidedAt === null).map((review) => [review.itemId, review]));
    const reportOf = new Map(loaded.reports.map((report) => [report.id, report]));
    const mine = items
      .filter((item) => decidable.has(item.id))
      .map((item) => ({ item, review: openReview.get(item.id), report: reportOf.get(item.reportId) }))
      .sort((a, b) => (a.review?.createdAt.getTime() ?? 0) - (b.review?.createdAt.getTime() ?? 0));
    const projectIds = [...new Set(mine.map((entry) => entry.item.projectId))];
    const nodes = new Map<string, { code: string; title: string }>();
    const deadlines: number[] = [];
    for (const projectId of projectIds) {
      for (const node of (await this.planning.currentContent(projectId)).wbs) nodes.set(node.id, { code: node.code, title: node.title });
      deadlines.push((await this.rules.of(projectId)).reviewDeadlineHours);
    }
    const overdue = (dueAt: Date | undefined) => !!dueAt && dueAt.getTime() < now.getTime();
    return {
      total: mine.length,
      overdue: mine.filter((entry) => overdue(entry.review?.dueAt)).length,
      // کوتاه‌ترین مهلت پروژه‌های درگیر (برچسب «بیش از N ساعت») `[پیش‌فرض فنی]`
      overdueHours: deadlines.length > 0 ? Math.min(...deadlines) : 24,
      items: mine.slice(0, limit).map(({ item, review, report }) => ({
        itemId: item.id,
        reportId: item.reportId,
        projectId: item.projectId,
        projectName: loaded.projectNames.get(item.projectId) ?? '',
        wbsItemId: item.wbsItemId,
        wbsCode: nodes.get(item.wbsItemId)?.code ?? '',
        wbsTitle: nodes.get(item.wbsItemId)?.title ?? '',
        submittedBy: report ? (loaded.people.get(report.authorUserId) ?? null) : null,
        submittedAt: (report?.serverReceivedAt ?? review?.createdAt ?? now).toISOString(),
        toPercent: item.computedPercent ?? 0,
        overdue: overdue(review?.dueAt),
      })),
    };
  }
}
