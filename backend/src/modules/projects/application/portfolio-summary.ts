import { Injectable } from '@nestjs/common';
import { EntityManager, type FilterQuery } from '@mikro-orm/postgresql';
import { PROJECT_STATUSES, type ProjectStatus } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';
import { ProgressReads } from '../../computation/reads.js';
import { Project } from '../domain/project.entity.js';

// کارت‌های W07 (PortfolioSummaryDto؛ تصمیم 1405/08/23: `GET /projects/summary`). فقط از ProjectProgress و snapshot روزانه
// (D07)؛ میانگین ساده پروژه‌های فعال (charts.md ۶.۱)؛ «در خطر» ب24؛ مقایسه با همان روز ماه شمسی قبل. مبالغ فقط روی پروژه‌هایی
// که کاربر `cbs.view_amounts` دارد و اگر هیچ‌کدام نبود نمی‌آیند (D11).

const atRisk = (deviation: number, cpi: number | null): boolean => deviation <= -15 || (cpi !== null && cpi < 0.9);
const round1 = (value: number): number => Math.round(value * 10) / 10;

@Injectable()
export class PortfolioSummary {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly progress: ProgressReads,
  ) {}

  async get() {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const where: FilterQuery<Project> = { deletionRequestedAt: null };
    if (!access.isOrgAdmin) where.id = { $in: projectsWith(access, 'project.view') };
    const projects = await this.em.find(Project, where, { fields: ['id', 'status'] });
    const countByStatus = Object.fromEntries(PROJECT_STATUSES.map((status) => [status, 0])) as Record<ProjectStatus, number>;
    for (const project of projects) countByStatus[project.status as ProjectStatus] += 1;

    const active = projects.filter((project) => project.status === 'active').map((project) => project.id);
    const [now, before] = await Promise.all([
      this.progress.projects(projects.map((project) => project.id)),
      this.progress.snapshotsAt(active, this.progress.lastMonth()),
    ]);
    const activeNow = active.flatMap((id) => {
      const view = now.get(id);
      return view ? [view] : [];
    });
    const mean = (values: readonly number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
    const avgNow = mean(activeNow.map((view) => view.actualPercent));
    const previous = [...before.values()];
    const riskNow = activeNow.filter((view) => atRisk(view.deviation, view.cpi)).length;
    const riskBefore = previous.filter((row) => atRisk(row.actual - row.planned, row.cpi)).length;

    const visible = [...now].filter(([id]) => access.isOrgAdmin || (access.projects.get(id)?.has('cbs.view_amounts') ?? false)).map(([, view]) => view);
    const totalBac = visible.reduce((sum, view) => sum + BigInt(view.bac), 0n);
    const totalAc = visible.reduce((sum, view) => sum + BigInt(view.ac), 0n);
    const computed = [...now.values()].map((view) => view.computedAt).filter((value): value is string => !!value);
    return {
      totalCount: projects.length,
      countByStatus,
      avgActualPercent: round1(avgNow),
      avgActualPercentDelta: previous.length > 0 ? round1(avgNow - mean(previous.map((row) => row.actual))) : 0,
      ...(visible.length > 0
        ? {
            totalBac: totalBac.toString(),
            totalAc: totalAc.toString(),
            totalAcPercent: totalBac > 0n ? round1((Number(totalAc) / Number(totalBac)) * 100) : 0,
          }
        : {}),
      atRiskCount: riskNow,
      atRiskDelta: riskNow - riskBefore,
      computedAt: computed.sort().at(-1) ?? null,
    };
  }
}
