import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { newId } from '../../../platform/database/ids.js';
import { type ProjectBasics, ProjectCatalog } from '../../identity/index.js';
import { Project, ProjectType } from '../domain/project.entity.js';

const DEFAULT_PROJECT_TYPES: readonly [key: string, name: string][] = [
  ['residential', 'ساختمانی'],
  ['road_bridge', 'راه و پل'],
  ['tunnel', 'تونل'],
  ['healthcare', 'درمانی'],
  ['energy', 'انرژی'],
  ['parking', 'پارکینگ'],
  ['heritage', 'مرمت و میراث'],
  ['commercial', 'تجاری'],
];

/** پیاده‌سازی ProjectCatalog برای identity (W26، دعوت، ثبت‌نام سازمان): پروژه‌های دیدنی سازمان. */
@Injectable()
export class ProjectBasicsCatalog extends ProjectCatalog {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async seedOrgDefaults(tx: EntityManager, orgId: string, now: Date): Promise<void> {
    for (const [sortOrder, [key, name]] of DEFAULT_PROJECT_TYPES.entries()) {
      tx.create(ProjectType, { id: newId(), orgId, key, name, sortOrder, createdAt: now });
    }
    await tx.flush();
  }

  async list(): Promise<ProjectBasics[]> {
    const projects = await this.em.find(Project, { deletionRequestedAt: null }, { orderBy: { code: 'desc' }, fields: ['code', 'name', 'status'] });
    return projects.map((project) => ({ id: project.id, code: project.code, name: project.name, status: project.status }));
  }

  /** نوع‌های پروژهٔ سازمان (W31، W37). */
  async projectTypes(): Promise<{ id: string; name: string }[]> {
    return (await this.em.find(ProjectType, {}, { orderBy: { sortOrder: 'asc' } })).map((type) => ({ id: type.key, name: type.name }));
  }

  /** پروژه‌های ساخته‌شده از هر قالب (`templateRef`؛ آمار W31، AC-TP-05). */
  async templateUsage(): Promise<Map<string, string[]>> {
    const rows = await this.em.find(Project, { templateId: { $ne: null }, deletionRequestedAt: null }, { fields: ['name', 'templateId'] });
    const usage = new Map<string, string[]>();
    for (const row of rows) usage.set(row.templateId as string, [...(usage.get(row.templateId as string) ?? []), row.name]);
    return usage;
  }

  /** ردیف‌های جدول پروژه‌های فعال داشبورد W05 (charts.md ۶.۱). */
  async cards(ids: readonly string[]): Promise<{ id: string; code: string; name: string; clientName: string; projectTypeId: string; status: string }[]> {
    if (ids.length === 0) return [];
    const projects = await this.em.find(
      Project,
      { id: { $in: [...ids] }, deletionRequestedAt: null },
      { fields: ['code', 'name', 'clientName', 'projectType', 'status'] },
    );
    return projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      clientName: project.clientName,
      projectTypeId: project.projectType,
      status: project.status,
    }));
  }
}
