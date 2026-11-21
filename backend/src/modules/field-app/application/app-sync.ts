import { AppIssues } from './app-issues.js';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { projectsWith } from '../../../platform/security/access.js';
import { RevisionRequests } from '../../approvals/index.js';
import { approvedQuantity, leafPercent, plannedLeafPercent, stepPercents } from '../../computation/index.js';
import { FieldReads, FieldRecords } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { MyNotifications } from '../../notifications/index.js';
import { type CurrentItem, type PlanNode, PlanningService } from '../../planning/index.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import { ApprovalRoutes } from '../../team/index.js';

// `GET /field/sync` (field-app.md ۵.۱–۵.۲؛ D10): آنچه اپ برای کار آفلاین نگه می‌دارد — پروژه‌ها و قواعد، برگ‌های تخصیص‌یافته
// با برنامهٔ ۱۴ روز آینده و آخرین مقادیر تأییدشده، آیتم‌های خود کاربر با وضعیت، درخواست‌های اصلاح، تأییدکنندهٔ هر برگ و اعلان‌های اخیر
// (از MyNotifications، مالک F13).
// هر پاسخ کامل است و `cursor` فقط لحظهٔ سرور است `[پیش‌فرض فنی]` — اپ دادهٔ محلی را جایگزین می‌کند؛ تغییرات افزایشی بعداً اگر
// حجم لازم کرد. عددها پیش‌نمایش‌اند (D07) و سرور هنگام دریافت دوباره حساب می‌کند.

/** «برنامهٔ ۱۴ روز آینده» (field-app.md ۵.۱ `[تأییدشده]`). */
export const PLAN_DAYS = 14;
/** آیتم‌های تصمیم‌گرفته تا این مدت در «گزارش‌های من» (M10) می‌مانند `[پیش‌فرض فنی]`. */
export const DECIDED_DAYS = 14;
/** اعلان‌های همگام‌سازی (field-app.md ۵.۱): ۳۰ روز اخیر، حداکثر ۱۰۰ تا، تازه‌ترین اول `[پیش‌فرض فنی]`. */
export const NOTIFICATION_DAYS = 30;
export const NOTIFICATION_LIMIT = 100;
const OPEN = ['submitted', 'stage1', 'stage2', 'needs_resolution', 'needs_revision'] as const;

const methodOf = (node: PlanNode): 'quantity' | 'percent' | 'steps' | null =>
  node.measurementMethod === 'quantity' || node.measurementMethod === 'percent' || node.measurementMethod === 'steps' ? node.measurementMethod : null;

@Injectable()
export class AppSync {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly rules: ProjectRules,
    private readonly planning: PlanningService,
    private readonly fieldReads: FieldReads,
    private readonly records: FieldRecords,
    private readonly routes: ApprovalRoutes,
    private readonly revisions: RevisionRequests,
    private readonly identity: IdentityService,
    private readonly issues: AppIssues,
    private readonly notifications: MyNotifications,
  ) {}

  async snapshot() {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    const now = this.clock.now();
    const today = tehranClock(now).date;
    const projectIds = projectsWith(access, 'report.submit');
    const projects = [];
    const activities = [];
    const items = [];
    const approverIds = new Set<string>();
    for (const projectId of projectIds) {
      const rules = await this.rules.of(projectId);
      // پروژهٔ متوقف یا بایگانی در هیچ فهرست اپ نیست (AC-FA-10)
      if (rules.status !== 'active') continue;
      projects.push(projectView(rules));
      const leaves = (await this.planning.currentItems(projectId)).filter(
        (item) => item.isLeaf && item.supervisorUserId === actor.userId && methodOf(item) !== null,
      );
      const reference = rules.progress.pvReferenceVersionId ? await this.planning.versionContent(rules.progress.pvReferenceVersionId) : null;
      const referenceById = new Map((reference?.wbs ?? []).map((node) => [node.id, node]));
      const facts = await this.fieldReads.progressFacts(this.em, projectId);
      for (const leaf of leaves) {
        const approver = await this.routes.approverFor(projectId, leaf.id, actor.userId);
        if (approver.firstStage) approverIds.add(approver.firstStage);
        activities.push(this.activity(rules, leaf, referenceById.get(leaf.id) ?? leaf, facts, today, approver.firstStage ?? null));
      }
      items.push(...(await this.myItems(projectId, actor.userId, now)));
    }
    const people = await this.identity.personRefs([...approverIds]);
    const issues = await this.issues.myIssues(
      actor.userId,
      projects.map((project) => project.id),
    );
    const notifications = await this.notifications.recent({ since: new Date(now.getTime() - NOTIFICATION_DAYS * 86_400_000), limit: NOTIFICATION_LIMIT });
    return {
      cursor: now.toISOString(),
      serverTime: now.toISOString(),
      today,
      projects,
      activities: activities.map((activity) => ({
        ...activity,
        approverName: activity.approverUserId ? (people.get(activity.approverUserId)?.fullName ?? null) : null,
      })),
      items,
      issues,
      notifications,
    };
  }

  private activity(
    rules: ProjectRulesView,
    leaf: CurrentItem,
    planNode: PlanNode,
    facts: Awaited<ReturnType<FieldReads['progressFacts']>>,
    today: string,
    approverUserId: string | null,
  ) {
    const method = methodOf(leaf) as 'quantity' | 'percent' | 'steps';
    const totalQuantity = leaf.totalQuantity === null ? null : Number(leaf.totalQuantity);
    const approved = facts.approved.filter((entry) => entry.wbsItemId === leaf.id);
    const pending = facts.pending.filter((entry) => entry.wbsItemId === leaf.id);
    const steps = method === 'steps' ? stepPercents(approved) : null;
    const plan = Array.from({ length: PLAN_DAYS }, (_, index) => {
      const date = addDays(today, index);
      return {
        date,
        plannedPercent: plannedLeafPercent(
          { start: planNode.plannedStart, finish: planNode.plannedFinish, isMilestone: planNode.isMilestone },
          date,
          rules.calendar,
        ),
      };
    });
    return {
      id: leaf.id,
      projectId: rules.id,
      parentId: leaf.parentId,
      code: leaf.code,
      title: leaf.title,
      method,
      unit: leaf.unit,
      totalQuantity,
      steps: leaf.steps?.map((step) => ({ key: step.key, title: step.title, weight: step.weight, approvedPercent: steps?.get(step.key) ?? 0 })) ?? null,
      plannedStart: leaf.plannedStart,
      plannedFinish: leaf.plannedFinish,
      approvedPercent: leafPercent({ method, totalQuantity, steps: leaf.steps }, approved),
      approvedQuantity: method === 'quantity' ? approvedQuantity(approved) : null,
      lastPendingPercent: pending.length > 0 ? (pending.at(-1)?.computedPercent ?? null) : null,
      plan,
      approverUserId,
    };
  }

  /** آیتم‌های خود کاربر: باز و نیاز اصلاح، و تصمیم‌گرفته‌های ۱۴ روز اخیر؛ اصلاح با یادداشت، چک‌لیست و عکس‌های نامناسب. */
  private async myItems(projectId: string, userId: string, now: Date) {
    const reports = (await this.records.reports(this.em, { projectIds: [projectId], since: new Date(now.getTime() - 90 * 86_400_000) })).filter(
      (report) => report.authorUserId === userId,
    );
    if (reports.length === 0) return [];
    const byId = new Map(reports.map((report) => [report.id, report]));
    const since = new Date(now.getTime() - DECIDED_DAYS * 86_400_000);
    const all = await this.records.items(this.em, { projectId, reportIds: reports.map((report) => report.id) });
    const visible = all.filter((item) => (OPEN as readonly string[]).includes(item.status) || (item.updatedAt ?? item.createdAt) >= since);
    const revising = visible.filter((item) => item.status === 'needs_revision').map((item) => item.id);
    const [requests, photos] = await Promise.all([
      this.revisions.latest(revising),
      this.records.photos(this.em, [...new Set(visible.map((item) => item.reportId))]),
    ]);
    return visible.map((item) => {
      const report = byId.get(item.reportId);
      return {
        id: item.id,
        reportId: item.reportId,
        reportNo: report?.reportNo ?? null,
        projectId,
        wbsItemId: item.wbsItemId,
        workDate: report?.workDate ?? null,
        status: item.status,
        flags: item.flags,
        computedPercent: item.computedPercent,
        revisionCount: item.revisionCount,
        revision: requests.get(item.id) ?? null,
        photos: photos
          .filter((photo) => photo.itemId === item.id)
          .map((photo) => ({ id: photo.id, uploadStatus: photo.uploadStatus, markedUnsuitable: photo.markedUnsuitable })),
      };
    });
  }
}

function projectView(rules: ProjectRulesView) {
  return {
    id: rules.id,
    name: rules.name,
    site: rules.siteLat !== null && rules.siteLng !== null ? { lat: rules.siteLat, lng: rules.siteLng, radiusM: rules.workflow.gpsRadiusM } : null,
    rules: {
      minPhotos: rules.workflow.minPhotos,
      maxJumpPct: rules.workflow.maxJumpPct,
      allowDecrease: rules.workflow.allowDecrease,
      lateAfterHours: rules.workflow.lateAfterHours,
      gpsMode: rules.workflow.gpsMode,
      approvalMode: rules.workflow.approvalMode,
      // ساعت یادآوری روزانه (field-app.md ۵.۱؛ NT-FLD-04): یادآوری محلی اپ و مهلت M03
      dailyReminder: { enabled: rules.dailyReminder.enabled, time: rules.dailyReminder.time },
    },
    calendar: { weekModes: rules.calendar.weekModes, holidays: [...rules.calendar.holidays] },
  };
}
