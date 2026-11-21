import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectBasicsCatalog, ProjectRules } from '../../projects/index.js';
import { buildXer } from '../domain/xer.js';

// «دریافت XER» کارت P6 (F19 ۶.۳؛ `integrations.export_p6`): نسخهٔ جاری + درصد تأییدشده ← فایل در ذخیره‌سازی (مثل GeneratedReport)
// با ممیزی و لینک کوتاه‌مدت.

@Injectable()
export class P6Export {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly storage: ObjectStorage,
    private readonly planning: PlanningService,
    private readonly progress: ProgressReads,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly rules: ProjectRules,
  ) {}

  /** `POST /projects/:pid/integrations/p6/xer` */
  async export(projectId: string): Promise<{ url: string; fileName: string; activities: number }> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError('AUTH_REQUIRED');
    const [content, live, [card], rules] = await Promise.all([
      this.planning.currentContent(projectId),
      this.progress.items(projectId),
      this.catalog.cards([projectId]),
      this.rules.of(projectId),
    ]);
    const supervisorIds = [...new Set(content.wbs.flatMap((node) => (node.isLeaf && node.supervisorUserId ? [node.supervisorUserId] : [])))];
    const people = await this.identity.personRefs(supervisorIds);
    const date = tehranClock(this.clock.now()).date;
    const code = card?.code ?? 'project';
    const xer = buildXer({
      projectCode: code,
      projectName: card?.name ?? rules.name,
      exportDate: date,
      workDaysPerWeek: rules.calendar.weekModes.filter((mode) => mode !== 'off').length,
      nodes: content.wbs.map((node) => ({
        id: node.id,
        parentId: node.parentId,
        sortOrder: node.sortOrder,
        code: node.code,
        title: node.title,
        isLeaf: node.isLeaf,
        isMilestone: node.isMilestone,
        plannedStart: node.plannedStart,
        plannedFinish: node.plannedFinish,
        percent: live.get(node.id)?.actualPercent ?? 0,
        supervisorId: node.supervisorUserId,
      })),
      resources: supervisorIds.flatMap((id) => {
        const person = people.get(id);
        return person ? [{ id, name: person.fullName }] : [];
      }),
    });
    const fileName = `${code}_${date}.xer`;
    const key = fileKey(actor.orgId, projectId, 'export', `${newId()}.xer`);
    await this.storage.put(key, Buffer.from(xer, 'utf8'), 'text/plain');
    const activities = content.wbs.filter((node) => node.isLeaf).length;
    await this.em.transactional((tx) => {
      this.audit.record(tx, { action: 'p6.xer_exported', entityType: 'Project', entityId: projectId, projectId, after: { fileName, activities } });
      return Promise.resolve();
    });
    return {
      url: await this.storage.signedUrl(key, { ttlSec: this.config.storage.linkTtlSec, fileName, contentType: 'text/plain; charset=utf-8' }),
      fileName,
      activities,
    };
  }
}
