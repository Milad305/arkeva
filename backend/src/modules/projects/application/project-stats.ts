import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OrganizationStats } from '../../identity/index.js';
import { Project } from '../domain/project.entity.js';

/** «۱۲ پروژه فعال» نشست و نوار کناری — پیاده‌سازی قرارداد identity (01 ۷: وارونگی وابستگی). */
@Injectable()
export class ProjectStats extends OrganizationStats {
  constructor(private readonly em: EntityManager) {
    super();
  }

  activeProjectCount(orgId: string): Promise<number> {
    return this.em.count(Project, { orgId, status: 'active' });
  }
}
