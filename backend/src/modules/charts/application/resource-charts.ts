import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { AlertReads } from '../../alerts/reads.js';
import { ApproverWindows } from '../../approvals/index.js';
import { scheduleSpan } from '../../computation/index.js';
import { type ChartRange, chartRange, type ChartRangePreset, percentile } from '../../computation/figures.js';
import { ProgressReads } from '../../computation/reads.js';
import { DeviceHeartbeats, FieldRecords } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ApprovalRoutes, TeamService } from '../../team/index.js';
import { ChartContext } from './chart-access.js';

// `GET /projects/:pid/charts/resources?range=` — W23 (charts.md ۶.۵؛ OD-05): heatmap گزارش روزانهٔ هر سرپرست، بار کار، آمار
// تأییدکنندگان (هنگام خواندن؛ تصمیم 1405/08/25)، گلوگاه و نفرات (جمع crewCount؛ AC-CH-06). بی بخش «کمبود نیرو به تفکیک تخصص».
// بازه: دورهٔ بسته همان ماه؛ بقیه ۳۰ روز تا تاریخ داده (heatmap روزانه).

const round1 = (value: number) => Math.round(value * 10) / 10;
const mean = (values: readonly number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const DAY = 86_400_000;

@Injectable()
export class ResourceCharts {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly chart: ChartContext,
    private readonly progress: ProgressReads,
    private readonly planning: PlanningService,
    private readonly records: FieldRecords,
    private readonly heartbeats: DeviceHeartbeats,
    private readonly team: TeamService,
    private readonly routes: ApprovalRoutes,
    private readonly approvals: ApproverWindows,
    private readonly alerts: AlertReads,
    private readonly identity: IdentityService,
  ) {}

  async get(projectId: string, preset: ChartRangePreset) {
    const { figures, meta } = await this.chart.load(projectId);
    const { rules } = figures;
    const dataDate = figures.meta.dataDate;
    const range: ChartRange =
      preset === 'closed_period'
        ? chartRange(preset, dataDate, dataDate, dataDate)
        : { preset, from: addDays(dataDate, -30), to: dataDate, label: preset === 'month' ? 'این ماه' : 'یک ماه اخیر', closedPeriod: false };
    const days: string[] = [];
    for (let date = range.from; date <= range.to; date = addDays(date, 1)) days.push(date);
    const holiday = (date: string) => (scheduleSpan(date, date, rules.calendar)?.workDays ?? 0) === 0;
    const workDays = days.filter((date) => !holiday(date));
    const now = this.clock.now();

    const [content, items, members, reports, alerts, routes] = await Promise.all([
      this.planning.currentContent(projectId),
      this.progress.items(projectId),
      this.team.membersWithRoles([projectId], ['supervisor']),
      this.records.reports(this.em, { projectIds: [projectId], since: new Date(Date.parse(`${range.from}T00:00:00Z`) - 2 * DAY) }),
      this.alerts.open([projectId]),
      this.routes.view(projectId),
    ]);
    const inRange = reports.filter((report) => report.workDate >= range.from && report.workDate <= range.to);
    const reportIds = inRange.map((report) => report.id);
    const [reportItems, photos] = await Promise.all([
      reportIds.length ? this.records.items(this.em, { projectId, reportIds }) : Promise.resolve([]),
      this.records.photos(this.em, reportIds),
    ]);
    const supervisorIds = [...new Set(members.map((member) => member.userId))];
    const [people, queues] = await Promise.all([
      this.identity.personRefs([...supervisorIds, ...routes.reviewers.map((entry) => entry.userId)]),
      this.heartbeats.latest(supervisorIds),
    ]);
    const byId = new Map(content.wbs.map((node) => [node.id, node]));
    const leaves = content.wbs.filter((node) => node.isLeaf && !node.isMilestone && node.measurementMethod !== 'time_based');

    const rows = supervisorIds.map((userId) => {
      const user = people.get(userId) ?? { id: userId, fullName: '—', avatarTone: 'a1' };
      const own = leaves.filter((leaf) => leaf.supervisorUserId === userId);
      const open = own.filter((leaf) => items.get(leaf.id)?.status !== 'completed');
      const mine = inRange.filter((report) => report.authorUserId === userId);
      const queue = queues.get(userId);
      const queuedFrom = queue && queue.queuedReports > 0 && queue.oldestQueuedAt ? tehranClock(queue.oldestQueuedAt).date : null;
      const cells = days.map((date) => {
        const count = mine.filter((report) => report.workDate === date).length;
        return { date, count, holiday: holiday(date), queued: !!queuedFrom && date >= queuedFrom && count === 0 && !holiday(date) };
      });
      const total = mine.length;
      const covered = cells.filter((cell) => !cell.holiday && (cell.count > 0 || cell.queued)).length;
      const photoCount = photos.filter((photo) => mine.some((report) => report.id === photo.reportId)).length;
      const perReport = total > 0 ? round1(photoCount / total) : 0;
      const planned = own.map((leaf) => items.get(leaf.id)?.plannedPercent ?? 0);
      const actual = own.map((leaf) => items.get(leaf.id)?.actualPercent ?? 0);
      const flag =
        queue && queue.queuedReports > 0
          ? { icon: 'cloud-off' as const, text: `${toFaDigits(queue.queuedReports)} گزارش در صف همگام‌سازی گوشی` }
          : open.length > 0 && total > 0 && perReport < 1
            ? { icon: 'camera-off' as const, text: 'گزارش‌ها کم‌عکس‌اند' }
            : null;
      const first = own[0];
      return {
        heat: {
          user,
          hasOpenWork: open.length > 0,
          cells,
          total,
          coveredDays: covered,
          workingDays: workDays.length,
          coveragePercent: open.length > 0 ? round1((covered / Math.max(1, workDays.length)) * 100) : null,
          photosPerReport: perReport,
        },
        load: {
          user,
          area: first?.parentId ? (byId.get(first.parentId)?.title ?? null) : null,
          openLeaves: open.length,
          doneLeaves: own.length - open.length,
          reports: total,
          actualPercent: own.length ? round1(mean(actual)) : null,
          plannedPercent: own.length ? round1(mean(planned)) : null,
          deviation: own.length ? round1(mean(actual) - mean(planned)) : null,
          flag,
        },
      };
    });

    // تأییدکنندگان: تصمیم‌های بازه و صف باز
    const window = await this.approvals.of(
      projectId,
      new Date(Date.parse(`${range.from}T00:00:00+03:30`)),
      new Date(Date.parse(`${addDays(range.to, 1)}T00:00:00+03:30`)),
      now,
    );
    const areaOf = new Map<string, string>();
    for (const area of routes.areas) if (area.reviewerUserId && !areaOf.has(area.reviewerUserId)) areaOf.set(area.reviewerUserId, area.areaName);
    const approvers = routes.reviewers.map((reviewer) => {
      const decided = window.decided.filter((entry) => entry.userId === reviewer.userId);
      const hours = decided.map((entry) => entry.hours);
      return {
        user: people.get(reviewer.userId) ?? { id: reviewer.userId, fullName: reviewer.fullName, avatarTone: reviewer.avatarTone },
        area: areaOf.get(reviewer.userId) ?? null,
        decisions: decided.length,
        avgHours: round1(mean(hours)),
        p90Hours: round1(percentile(hours, 0.9)),
        returnRatePercent: decided.length ? round1((decided.filter((entry) => entry.returned).length / decided.length) * 100) : 0,
        pending: window.open.filter((entry) => entry.userId === reviewer.userId).length,
        bottleneck: false,
      };
    });
    const target = rules.reviewDeadlineHours;
    const worst = approvers.filter((entry) => entry.pending > 0 && entry.avgHours > target).sort((a, b) => b.avgHours - a.avgHours)[0];
    if (worst) worst.bottleneck = true;
    const substituteId = worst
      ? [rules.alternateReviewerUserId, rules.managerUserId, ...approvers.map((entry) => entry.user.id)].find(
          (id): id is string => !!id && id !== worst.user.id,
        )
      : undefined;
    const substitute = substituteId ? ((await this.identity.personRefs([substituteId])).get(substituteId) ?? null) : null;
    const allHours = window.decided.map((entry) => entry.hours);
    const returnCount = window.decided.filter((entry) => entry.returned).length;

    // نفرات: جمع crewCount آیتم‌های گزارش هر روز (AC-CH-06)
    const reportDate = new Map(inRange.map((report) => [report.id, report.workDate]));
    const crew = days.map((date) => ({
      date,
      total: reportItems.filter((item) => reportDate.get(item.reportId) === date).reduce((sum, item) => sum + (item.crewCount ?? 0), 0),
    }));
    const crewDays = crew.filter((entry) => entry.total > 0);
    const withWork = rows.filter((row) => row.heat.hasOpenWork);
    const reportCount = rows.reduce((sum, row) => sum + row.heat.total, 0);
    const resAlerts = alerts.filter((alert) => alert.ruleCode === 'AL-RES-01');

    return {
      ...meta,
      range,
      kpis: {
        reportCount,
        perWorkingDay: round1(reportCount / Math.max(1, workDays.length)),
        coveragePercent: round1(mean(withWork.map((row) => row.heat.coveragePercent ?? 0))),
        supervisorsWithWork: withWork.length,
        workingDays: workDays.length,
        pending: window.open.length,
        pendingOverdue: window.open.filter((entry) => entry.overdue).length,
        avgApprovalHours: round1(mean(allHours)),
        targetHours: target,
        returnRatePercent: window.decided.length ? round1((returnCount / window.decided.length) * 100) : 0,
        returnCount,
        avgCrew: crewDays.length ? Math.round(mean(crewDays.map((entry) => entry.total))) : 0,
      },
      workload: rows.map((row) => row.load),
      redistribution: resAlerts.length ? resAlerts.map((alert) => alert.guidance).join(' ') : null,
      approvers,
      pendingByAge: {
        under24: window.open.filter((entry) => entry.ageHours < 24).length,
        between24and48: window.open.filter((entry) => entry.ageHours >= 24 && entry.ageHours < 48).length,
        over48: window.open.filter((entry) => entry.ageHours >= 48).length,
      },
      bottleneck:
        worst && substitute
          ? {
              userId: worst.user.id,
              fullName: worst.user.fullName,
              text: `${toFaDigits(worst.pending)} آیتم در انتظار نزد ${worst.user.fullName} است و میانگین تأیید او ${toFaDigits(String(worst.avgHours)).replace('.', '٫')} ساعت است (هدف ${toFaDigits(target)} ساعت).`,
              substitute,
            }
          : null,
      heatmap: { days: days.map((date) => ({ date, holiday: holiday(date) })), rows: rows.map((row) => row.heat) },
      attention: alerts
        .filter((alert) => alert.ruleCode.startsWith('AL-FLD'))
        .map((alert) => ({
          text: alert.guidance,
          tone: alert.severity === 'critical' ? ('err' as const) : ('wrn' as const),
          link: `/projects/${projectId}/reports`,
        })),
      crew,
    };
  }
}
