import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { NotFoundError } from '../../../platform/http/errors.js';
import { type TeamProjectContext, TeamProjectPort } from '../../team/index.js';
import { ProjectSettings } from '../domain/project-settings.entity.js';
import { Project } from '../domain/project.entity.js';

// پیاده‌سازی قرارداد team (team-ports.ts): پروژه، مدیر و تأییدکنندهٔ جایگزین (ProjectSettings مال projects است).

@Injectable()
export class ProjectTeamProvider extends TeamProjectPort {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async context(projectId: string, tx?: EntityManager): Promise<TeamProjectContext> {
    const em = tx ?? this.em;
    const project = await em.findOne(Project, { id: projectId, deletionRequestedAt: null }, tx ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {});
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    const settings = await em.findOne(ProjectSettings, { projectId });
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      status: project.status,
      managerUserId: project.managerUserId,
      alternateReviewerUserId: settings?.alternateReviewerUserId ?? null,
    };
  }

  async setAlternateReviewer(tx: EntityManager, projectId: string, userId: string): Promise<void> {
    const settings = await tx.findOne(ProjectSettings, { projectId });
    if (settings) settings.alternateReviewerUserId = userId;
    else tx.create(ProjectSettings, { projectId, orgId: (await tx.findOneOrFail(Project, { id: projectId })).orgId, alternateReviewerUserId: userId });
  }
}
