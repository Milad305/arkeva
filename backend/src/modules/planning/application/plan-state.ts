import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  PlanBootstrap,
  type KeyMilestone,
  type PlanVersionRefView,
  ProjectPlanAccess,
  ProjectPlanState,
  type ProjectPlanStateView,
} from '../../projects/index.js';
import { PlanVersion } from '../domain/plan.entities.js';
import { PlanningService } from './planning.service.js';

// پیاده‌سازی قراردادهای projects (plan-ports.ts): وضعیت نسخه‌ها برای سربرگ پروژه و مبنای کاری هنگام ساخت.

@Injectable()
export class PlanStateProvider extends ProjectPlanState {
  constructor(
    private readonly em: EntityManager,
    private readonly planning: PlanningService,
    private readonly projects: ProjectPlanAccess,
  ) {
    super();
  }

  async state(projectId: string): Promise<ProjectPlanStateView> {
    const project = await this.projects.context(projectId);
    const ids = [project.baselineVersionId, project.currentVersionId, project.pvReferenceVersionId].filter((id): id is string => !!id);
    const [versions, draft] = await Promise.all([
      ids.length > 0 ? this.em.find(PlanVersion, { id: { $in: ids } }) : Promise.resolve([]),
      this.em.findOne(PlanVersion, { projectId, status: 'draft' }),
    ]);
    const byId = new Map(versions.map((version) => [version.id, version]));
    const ref = (id: string | null): PlanVersionRefView | null => {
      const version = id ? byId.get(id) : undefined;
      return version
        ? { id: version.id, kind: version.kind, number: version.number ?? 0, source: version.source, appliedAt: version.appliedAt?.toISOString() ?? null }
        : null;
    };
    return {
      baseline: ref(project.baselineVersionId),
      current: ref(project.currentVersionId),
      pvReference: ref(project.pvReferenceVersionId),
      draft: draft ? await this.planning.summaryOf(draft) : null,
    };
  }
}

@Injectable()
export class PlanBootstrapProvider extends PlanBootstrap {
  constructor(private readonly planning: PlanningService) {
    super();
  }

  createBaseline(
    tx: Parameters<PlanBootstrap['createBaseline']>[0],
    input: { readonly orgId: string; readonly projectId: string; readonly actorUserId: string; readonly milestones: readonly KeyMilestone[] },
  ): Promise<void> {
    return this.planning.createBaseline(tx, input);
  }
}
