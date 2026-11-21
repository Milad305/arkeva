import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { addDays, OnTick, tehranClock, type TickHandler, type TickName } from '../../../platform/scheduler/ticks.js';
import { ReviewStats } from '../../approvals/index.js';
import { scheduleSpan } from '../../computation/index.js';
import { ProgressReads } from '../../computation/reads.js';
import { FieldRecords } from '../../field/index.js';
import { ProjectCatalog } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { TeamService } from '../../team/index.js';
import { digestText, reminderDue } from '../domain/daily-notices.js';
import { Alert } from '../domain/alert.entities.js';

// خلاصهٔ روزانه NT-DIG-01 (DigestTick ۰۷:۳۰؛ notifications.md ۵.۶) و یادآوری گزارش NT-FLD-04 (HourlyTick در `dailyReminderTime`
// هر پروژه؛ ۵.۷). اینجا (F12) چون همهٔ ورودی‌ها — پیشرفت ذخیره‌شده، هشدار، صف تأیید، برگ‌های باز و گزارش‌ها — را alerts از
// پیش می‌خواند و notifications را team و field import می‌کنند (چرخهٔ ESM). ساخت اعلان فقط با Notifier (D09).
//   • یک سرپرست با چند پروژه یک یادآوری در روز (AC-NT-09): کار به ازای سازمان، یک اعلان برای همهٔ پروژه‌هایش، dedupe ۲۴ ساعته.
//   • روز تعطیل تقویم پروژه یادآوری ندارد؛ خلاصه هر روز می‌آید و فقط کوتاه می‌شود.

export const DAILY_NOTICES_QUEUE: QueueDef = {
  name: 'notifications.daily',
  policy: 'standard',
  retryLimit: 3,
  retryDelaySec: 30,
  retryBackoff: true,
  expireInSeconds: 300,
  priority: 30,
  concurrency: 2,
};

const DAY_MS = 86_400_000;
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

interface DailyJob extends JobData {
  readonly orgId: string;
  readonly kind: 'digest' | 'reminder';
  readonly projectId?: string;
  readonly runDate: string;
}

@Injectable()
export class DailyNotices implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
    private readonly notifier: Notifier,
    private readonly rules: ProjectRules,
    private readonly progress: ProgressReads,
    private readonly reviews: ReviewStats,
    private readonly team: TeamService,
    private readonly planning: PlanningService,
    private readonly records: FieldRecords,
    private readonly catalog: ProjectCatalog,
  ) {}

  onModuleInit(): void {
    this.jobs.work<DailyJob>(DAILY_NOTICES_QUEUE, async (job) => {
      if (job.data.kind === 'digest' && job.data.projectId) await this.digest(job.data.orgId, job.data.projectId, job.data.runDate);
      if (job.data.kind === 'reminder') await this.reminder(job.data.orgId);
    });
  }

  /** NT-DIG-01 یک پروژه برای مدیر(ان) پروژه؛ برمی‌گرداند چند گیرنده. */
  async digest(orgId: string, projectId: string, runDate: string): Promise<number> {
    const rules = await this.rules.of(projectId);
    if (rules.status !== 'active') return 0;
    const now = this.clock.now();
    const [progress, yesterday, alerts, queue, managers] = await Promise.all([
      this.progress.project(projectId),
      this.progress.snapshotsAt([projectId], addDays(runDate, -1)),
      this.em.find(Alert, { projectId, status: { $in: ['open', 'seen'] } }, { fields: ['severity', 'title', 'lastEvaluatedAt'] }),
      this.reviews.forProject(projectId, now),
      this.team.membersWithRoles([projectId], ['project_manager']),
    ]);
    const count = (severity: Alert['severity']) => alerts.filter((alert) => alert.severity === severity).length;
    const top = [...alerts]
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.lastEvaluatedAt.getTime() - a.lastEvaluatedAt.getTime())
      .slice(0, 3)
      .map((alert) => alert.title);
    const text = digestText({
      projectName: rules.name,
      progress: progress
        ? { actual: progress.actualPercent, planned: progress.plannedPercent, deviation: progress.deviation, cpi: progress.cpi, spi: progress.spi }
        : null,
      yesterdayActual: yesterday.get(projectId)?.actual ?? null,
      alerts: { critical: count('critical'), warning: count('warning'), info: count('info'), top },
      pendingItems: progress?.pendingCount ?? 0,
      overdueReviews: queue.reduce((sum, entry) => sum + entry.overdueCount, 0),
    });
    const recipients = [...new Set([rules.managerUserId, ...managers.map((member) => member.userId)])];
    await this.em.transactional((tx) =>
      this.notifier.notify(tx, {
        code: 'NT-DIG-01',
        projectId,
        recipients,
        subjectId: `${projectId}:${runDate}`,
        title: text.title,
        body: text.body,
        link: `/projects/${projectId}`,
        orgId,
        dedupeWindowMs: DAY_MS,
      }),
    );
    return recipients.length;
  }

  /** NT-FLD-04 برای سرپرستانی از سازمان که نوبت یادآوری یکی از پروژه‌هایشان رسیده؛ برمی‌گرداند چند سرپرست. */
  async reminder(orgId: string): Promise<number> {
    const now = this.clock.now();
    const { date: today, minuteOfDay } = tehranClock(now);
    const projects = (await this.catalog.list()).filter((project) => project.status === 'active');
    const due = new Map<string, { projects: string[]; time: string }>();
    for (const project of projects) {
      const rules = await this.rules.of(project.id);
      if (!rules.dailyReminder.enabled || !reminderDue(rules.dailyReminder.time, minuteOfDay)) continue;
      if ((scheduleSpan(today, today, rules.calendar)?.workDays ?? 0) < 1) continue;
      const [content, items, reports] = await Promise.all([
        this.planning.currentContent(project.id),
        this.progress.items(project.id),
        this.records.reports(this.em, { projectIds: [project.id], since: new Date(now.getTime() - 2 * DAY_MS) }),
      ]);
      const reported = new Set(reports.filter((report) => report.workDate === today).map((report) => report.authorUserId));
      const open = new Set(
        content.wbs
          .filter((node) => node.isLeaf && node.supervisorUserId && node.measurementMethod !== 'time_based')
          .filter((node) => !!node.plannedStart && node.plannedStart <= today && (items.get(node.id)?.actualPercent ?? 0) < 100)
          .map((node) => node.supervisorUserId as string),
      );
      for (const userId of open) {
        if (reported.has(userId)) continue;
        const entry = due.get(userId) ?? { projects: [], time: rules.dailyReminder.time };
        entry.projects.push(rules.name);
        due.set(userId, entry);
      }
    }
    for (const [userId, entry] of due) {
      await this.em.transactional((tx) =>
        this.notifier.notify(tx, {
          code: 'NT-FLD-04',
          projectId: null,
          recipients: [userId],
          subjectId: `daily-reminder:${today}`,
          title: 'یادآوری گزارش روزانه',
          body: `هنوز گزارش امروز را ثبت نکرده‌اید. مهلت یادآوری ${toFaDigits(entry.time)}.${
            entry.projects.length > 1 ? ` پروژه‌ها: ${entry.projects.join('، ')}` : ''
          }`,
          link: '/dashboard',
          orgId,
          dedupeWindowMs: DAY_MS,
        }),
      );
    }
    return due.size;
  }
}

/** DigestTick ← کار هر پروژهٔ فعال؛ HourlyTick ← کار یادآوری هر سازمان. */
@Injectable()
@OnTick('DigestTick', 'HourlyTick')
export class DailyNoticeTicks implements TickHandler {
  constructor(
    private readonly orm: MikroORM,
    private readonly jobs: Jobs,
    private readonly clock: Clock,
  ) {}

  async onTick(tick: TickName, runDate: string): Promise<number> {
    const rows = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from active_projects_for_compute()');
    if (tick === 'DigestTick') {
      for (const row of rows) {
        await this.jobs.send(
          null,
          DAILY_NOTICES_QUEUE,
          { orgId: row.org_id, kind: 'digest', projectId: row.project_id, runDate },
          { singletonKey: `digest:${row.project_id}:${runDate}` },
        );
      }
      return rows.length;
    }
    // تیک ساعتیِ جبرانی (روز گذشته) یادآوری نمی‌فرستد
    const today = tehranClock(this.clock.now()).date;
    const orgs = [...new Set(rows.map((row) => row.org_id))];
    for (const orgId of orgs) await this.jobs.send(null, DAILY_NOTICES_QUEUE, { orgId, kind: 'reminder', runDate: today }, {});
    return orgs.length;
  }
}
