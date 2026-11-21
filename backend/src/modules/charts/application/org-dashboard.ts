import { Injectable } from '@nestjs/common';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';
import { PendingApprovals } from '../../approvals/index.js';
import { PortfolioTrend } from '../../computation/figures.js';
import { atRisk, itemStatus, ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { PortfolioSummary, ProjectBasicsCatalog } from '../../projects/index.js';
import { riskLevelOf, RiskReads } from '../../risks/index.js';

// `GET /dashboard` — W05 (charts.md ۶.۱؛ تصمیم‌های 1405/08/15). تجمیع ساده روی مقادیر ذخیره‌شده: شمارش، میانگین ساده و
// مقایسه با ماه گذشته (همان W07)؛ صف تأیید از F09؛ ریسک‌های بالا و ماتریس ۵×۵ از F14 فقط با `risk.view`.

/** آستانه‌های پیش‌فرض (00 ۴.۴) برای رنگ حلقهٔ میانگین. */
const DEFAULT_THRESHOLDS = { warning: 5, critical: 15 };

@Injectable()
export class OrgDashboard {
  constructor(
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly summary: PortfolioSummary,
    private readonly progress: ProgressReads,
    private readonly trend: PortfolioTrend,
    private readonly pending: PendingApprovals,
    private readonly risks: RiskReads,
    private readonly identity: IdentityService,
  ) {}

  async get() {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const visible = new Set(projectsWith(access, 'project.view'));
    const projects = (await this.catalog.list()).filter((project) => access.isOrgAdmin || visible.has(project.id));
    const active = projects.filter((project) => project.status === 'active');
    const [portfolio, progress, cards, before] = await Promise.all([
      this.summary.get(),
      this.progress.projects(active.map((project) => project.id)),
      this.catalog.cards(active.map((project) => project.id)),
      this.progress.snapshotsAt(
        projects.map((project) => project.id),
        this.progress.lastMonth(),
      ),
    ]);
    const computed = active.filter((project) => progress.has(project.id));
    const mean = (values: readonly number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const avgActual = mean(computed.map((project) => progress.get(project.id)?.actualPercent ?? 0));
    const avgPlanned = mean(computed.map((project) => progress.get(project.id)?.plannedPercent ?? 0));
    const trend = await this.trend.of(computed.map((project) => project.id));
    const riskProjects = projects.filter((project) => access.isOrgAdmin || (access.projects.get(project.id)?.has('risk.view') ?? false));
    return {
      generatedAt: this.clock.now().toISOString(),
      dataDate: trend.dataDate,
      kpis: {
        activeCount: active.length,
        totalCount: projects.length,
        // پروژه‌هایی که ماه گذشته snapshot داشتند = فعال در آن روز
        activeDelta: active.length - before.size,
        atRiskCount: portfolio.atRiskCount,
        atRiskDelta: portfolio.atRiskDelta,
        avgActualPercent: avgActual,
        avgPlannedPercent: avgPlanned,
        avgActualDelta: portfolio.avgActualPercentDelta,
        avgStatus: avgActual === null || avgPlanned === null ? null : itemStatus(avgActual, avgPlanned, DEFAULT_THRESHOLDS),
      },
      projects: cards
        .flatMap((card) => {
          const view = progress.get(card.id);
          if (!view) return [];
          return [
            {
              id: card.id,
              code: card.code,
              name: card.name,
              clientName: card.clientName,
              projectTypeId: card.projectTypeId,
              plannedPercent: view.plannedPercent,
              actualPercent: view.actualPercent,
              deviation: view.deviation,
              status: itemStatus(view.actualPercent, view.plannedPercent, DEFAULT_THRESHOLDS),
              atRisk: atRisk(view.deviation, view.cpi),
            },
          ];
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'fa')),
      trend: trend.points,
      pendingApprovals: await this.pending.mine(5),
      risks: riskProjects.length > 0 ? await this.riskCard(riskProjects) : null,
    };
  }

  private async riskCard(projects: readonly { id: string; name: string }[]) {
    const open = await this.risks.openSummaries(projects.map((project) => project.id));
    const names = new Map(projects.map((project) => [project.id, project.name]));
    const high = open
      .filter((risk) => (risk.score ?? 0) >= 15)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.code.localeCompare(b.code))
      .slice(0, 5);
    const owners = await this.identity.personRefs(high.map((risk) => risk.ownerUserId));
    const matrix = [];
    for (let impact = 5; impact >= 1; impact -= 1) {
      for (let probability = 1; probability <= 5; probability += 1) {
        matrix.push({
          probability,
          impact,
          count: open.filter((risk) => risk.probability === probability && risk.impact === impact).length,
          level: riskLevelOf(probability * impact),
        });
      }
    }
    return {
      totalOpen: open.length,
      items: high.map((risk) => ({
        id: risk.id,
        projectId: risk.projectId,
        projectName: names.get(risk.projectId) ?? '',
        code: risk.code,
        title: risk.title,
        score: risk.score as number,
        level: risk.level as string,
        owner: owners.get(risk.ownerUserId) ?? { id: risk.ownerUserId, fullName: '—', avatarTone: 'a1' },
      })),
      matrix,
    };
  }
}
