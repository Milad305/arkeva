import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Project } from '../domain/project.entity.js';

/** پرچم `Project.mspLinked` (F02؛ msp-integration.md ۸) — نویسنده projects؛ ماژول msp با ساخت و بازگردانی ورود صدا می‌زند. */
@Injectable()
export class ProjectMspFlag {
  async setLinked(tx: EntityManager, projectId: string, linked: boolean): Promise<void> {
    // همان نمونهٔ مدیریت‌شده: تراکنش اعمال نسخه هم پروژه را عوض می‌کند و یک UPDATE نسخه‌دار بس است
    const project = await tx.findOne(Project, { id: projectId });
    if (project && project.mspLinked !== linked) project.mspLinked = linked;
  }
}
