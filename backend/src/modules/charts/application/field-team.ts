import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { type WbsItemProgressView, workDaysWithoutReport } from '../../computation/reads.js';
import { DeviceHeartbeats, FieldRecords } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import type { PlanningService } from '../../planning/index.js';
import type { ProjectRulesView } from '../../projects/index.js';
import type { OpenAlertView } from '../../alerts/reads.js';

type PlanNode = Awaited<ReturnType<PlanningService['currentContent']>>['wbs'][number];

// «تیم کارگاه امروز» W10 (ب18؛ charts.md ۶.۲، تصمیم 1405/08/14): سرپرستانی که امروز فعالیت باز تخصیص‌یافته دارند؛ وضعیت
// «گزارش داده»، «در صف گوشی» (ضربان) یا «گزارش نداده» و روزهای کاری بی‌گزارش با شدت همان AL-FLD-01 (از هشدار باز).

/** پنجرهٔ گزارش‌های خوانده‌شده برای آخرین گزارش هر سرپرست. */
const LOOKBACK_MS = 60 * 86_400_000;

@Injectable()
export class FieldTeamToday {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly records: FieldRecords,
    private readonly heartbeats: DeviceHeartbeats,
    private readonly identity: IdentityService,
  ) {}

  async of(rules: ProjectRulesView, wbs: readonly PlanNode[], items: ReadonlyMap<string, WbsItemProgressView>, alerts: readonly OpenAlertView[]) {
    const now = this.clock.now();
    const today = tehranClock(now).date;
    const byId = new Map(wbs.map((node) => [node.id, node]));
    const topOf = (node: PlanNode): PlanNode => {
      let current = node;
      while (current.parentId && byId.get(current.parentId)) current = byId.get(current.parentId) as PlanNode;
      return current;
    };
    const firstLeaf = new Map<string, PlanNode>();
    for (const node of wbs) {
      if (!node.isLeaf || !node.supervisorUserId || node.measurementMethod === 'time_based') continue;
      if (!node.plannedStart || node.plannedStart > today || (items.get(node.id)?.actualPercent ?? 0) >= 100) continue;
      if (!firstLeaf.has(node.supervisorUserId)) firstLeaf.set(node.supervisorUserId, node);
    }
    const ids = [...firstLeaf.keys()];
    if (ids.length === 0) return { reportedCount: 0, expectedCount: 0, supervisors: [] };
    const [reports, queues, people] = await Promise.all([
      this.records.reports(this.em, { projectIds: [rules.id], since: new Date(now.getTime() - LOOKBACK_MS) }),
      this.heartbeats.latest(ids),
      this.identity.personRefs(ids),
    ]);
    const activated = rules.progress.activatedAt ? tehranClock(rules.progress.activatedAt).date : today;
    const supervisors = ids.map((userId) => {
      const own = reports.filter((report) => report.authorUserId === userId);
      const todayCount = own.filter((report) => report.workDate === today).length;
      const lastWork = own.reduce<string | null>((max, report) => (!max || report.workDate > max ? report.workDate : max), null);
      const lastAt = own.reduce<Date | null>((max, report) => (!max || report.serverReceivedAt > max ? report.serverReceivedAt : max), null);
      const queued = queues.get(userId)?.queuedReports ?? 0;
      const alert = alerts.find((entry) => entry.ruleCode === 'AL-FLD-01' && entry.subjectId === userId);
      return {
        user: people.get(userId) ?? { id: userId, fullName: '—', avatarTone: 'a1' },
        // حوزه = گروه سطح یک نخستین فعالیت باز او `[پیش‌فرض فنی]`
        areaName: topOf(firstLeaf.get(userId) as PlanNode).title,
        state: todayCount > 0 ? ('reported' as const) : queued > 0 ? ('queued' as const) : ('not_reported' as const),
        reportCountToday: todayCount,
        lastReportAt: lastAt?.toISOString() ?? null,
        queuedReports: queued,
        workingDaysWithoutReport: todayCount > 0 ? 0 : workDaysWithoutReport(lastWork, activated, today, rules.calendar),
        alertSeverity: alert?.severity ?? null,
      };
    });
    return { reportedCount: supervisors.filter((entry) => entry.state === 'reported').length, expectedCount: supervisors.length, supervisors };
  }
}
