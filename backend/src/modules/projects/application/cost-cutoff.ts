import { Injectable } from '@nestjs/common';
import { type EntityManager, LockMode } from '@mikro-orm/postgresql';
import { NotFoundError } from '../../../platform/http/errors.js';
import { Project } from '../domain/project.entity.js';

// ستون‌های تاریخ کامل بودن هزینه‌ها روی Project (OD-19) مال cost-ledger‌اند (01 ۴)؛ تنها راه نوشتنشان همین است (همان
// الگوی ProjectPlanAccess).

export interface CostCutoffView {
  readonly projectId: string;
  readonly orgId: string;
  readonly status: string;
  readonly name: string;
  readonly costsCompleteThrough: string | null;
  readonly setBy: string | null;
  readonly setAt: Date | null;
}

@Injectable()
export class ProjectCostCutoff {
  /** با `lock` ردیف پروژه قفل می‌شود (تغییر تاریخ و ثبت هزینه پشت سر هم). */
  async of(em: EntityManager, projectId: string, lock = false): Promise<CostCutoffView> {
    const project = await em.findOne(Project, { id: projectId, deletionRequestedAt: null }, lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {});
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    return {
      projectId: project.id,
      orgId: project.orgId,
      status: project.status,
      name: project.name,
      costsCompleteThrough: project.costsCompleteThrough ?? null,
      setBy: project.costsCompleteSetBy ?? null,
      setAt: project.costsCompleteSetAt ?? null,
    };
  }

  async set(tx: EntityManager, projectId: string, input: { readonly date: string | null; readonly userId: string; readonly at: Date }): Promise<void> {
    const project = await tx.findOneOrFail(Project, { id: projectId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    Object.assign(project, { costsCompleteThrough: input.date, costsCompleteSetBy: input.userId, costsCompleteSetAt: input.at });
  }
}
