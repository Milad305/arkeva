import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { ConflictError } from '../../../platform/http/errors.js';
import { ProjectPlanAccess } from '../../projects/index.js';
import { PlanVersion, type PlanVersionSource } from '../domain/plan.entities.js';
import { type PlanContent, PlanContentStore } from './plan-content.store.js';
import { PlanningService } from './planning.service.js';

/** نوشتن کامل مبنای کاری پروژهٔ پیش‌نویس برای ورود MSP (F15) — مالک: planning. */
@Injectable()
export class BaselineReplacer {
  constructor(
    private readonly clock: Clock,
    private readonly projects: ProjectPlanAccess,
    private readonly store: PlanContentStore,
    private readonly planning: PlanningService,
  ) {}

  /**
   * جایگزینی کامل محتوای مبنای کاری پروژهٔ پیش‌نویس درون تراکنش فراخوان (ورود MSP و بازگردانی آن؛ msp-integration.md
   * ۷.۱ گام ۳). جدول جاری همان لحظه همگام می‌شود (D05: پروژهٔ پیش‌نویس). شناسهٔ نسخه و منبع پیشین را برمی‌گرداند.
   */
  async replaceBaseline(
    tx: EntityManager,
    input: { readonly projectId: string; readonly content: PlanContent; readonly source: PlanVersionSource; readonly actorUserId: string },
  ): Promise<{ readonly versionId: string; readonly previousSource: PlanVersionSource }> {
    const project = await this.projects.context(input.projectId, tx);
    if (project.status !== 'draft') throw new ConflictError('PLAN_APPLY_NOT_ALLOWED');
    if ((await tx.count(PlanVersion, { projectId: input.projectId, kind: 'baseline', status: 'draft' })) === 0) {
      await this.planning.createBaseline(tx, { orgId: project.orgId, projectId: input.projectId, actorUserId: input.actorUserId, milestones: [] });
    }
    const draft = await tx.findOneOrFail(PlanVersion, { projectId: input.projectId, kind: 'baseline', status: 'draft' });
    const now = this.clock.now();
    const previousSource = draft.source;
    await this.store.writeVersion(tx, draft, input.content);
    Object.assign(draft, {
      source: input.source,
      draftRevision: draft.draftRevision + 1,
      changeCount: input.content.wbs.length,
      lastSavedAt: now,
      lastSavedByUserId: input.actorUserId,
    });
    await this.store.syncCurrent(tx, project, input.content, null, now);
    await tx.flush();
    return { versionId: draft.id, previousSource };
  }
}
