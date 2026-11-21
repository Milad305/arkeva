import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { statsOf, type TemplateContent, validate } from '../domain/content.js';
import { Template, TemplateVersion } from '../domain/template.entities.js';

// خواندن و نوشتن پایهٔ قالب (F16؛ templates.md ۴، ۵.۴) و شکل TemplateListItemDto و TemplateDetailDto فرانت.
// محتوای «جاری» قالب = پیش‌نویس منتشرنشده اگر هست، وگرنه آخرین نسخهٔ منتشرشده.

export const templateInvalid = (reason: string, extra: Record<string, unknown> = {}) => new DomainError('TEMPLATE_INVALID', 422, { reason, ...extra });
export const templateConflict = (reason: string) => new ConflictError('TEMPLATE_STATE_CONFLICT', { reason });

const dateOf = (value: Date) => value.toISOString().slice(0, 10);

@Injectable()
export class TemplateStore {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }

  async find(id: string, em: EntityManager = this.em): Promise<Template> {
    const template = await em.findOne(Template, { id });
    if (!template) throw new NotFoundError('TEMPLATE_NOT_FOUND');
    return template;
  }

  /** آخرین نسخهٔ منتشرشدهٔ هر قالب. */
  async latest(templateIds: readonly string[], em: EntityManager = this.em): Promise<Map<string, TemplateVersion>> {
    if (templateIds.length === 0) return new Map();
    const versions = await em.find(TemplateVersion, { templateId: { $in: [...templateIds] } }, { orderBy: { number: 'desc' } });
    const latest = new Map<string, TemplateVersion>();
    for (const version of versions) if (!latest.has(version.templateId)) latest.set(version.templateId, version);
    return latest;
  }

  contentOf(template: Template, latest: TemplateVersion | undefined): TemplateContent {
    const content = template.draftContent ?? latest?.content;
    if (!content) throw templateConflict('این قالب محتوایی ندارد.');
    return content;
  }

  async assertNameFree(name: string, exceptId: string | null = null, em: EntityManager = this.em): Promise<void> {
    const taken = await em.count(Template, { name, ...(exceptId ? { id: { $ne: exceptId } } : {}) });
    if (taken > 0) throw new ConflictError('TEMPLATE_NAME_TAKEN');
  }

  async projectTypes() {
    return this.catalog.projectTypes();
  }

  async assertProjectType(projectTypeId: string): Promise<void> {
    const types = await this.catalog.projectTypes();
    if (!types.some((type) => type.id === projectTypeId)) throw templateInvalid('نوع پروژه شناخته نشد. از فهرست انتخاب کنید.');
  }

  /** قالب پیش‌نویس تازه (ورود از فایل، ذخیره از پروژه). */
  async createDraft(input: {
    readonly name: string;
    readonly projectTypeId: string;
    readonly originNote: string;
    readonly content: TemplateContent;
  }): Promise<string> {
    const actor = this.actor();
    const name = input.name.trim();
    if (name.length < 3 || name.length > 200) throw templateInvalid('نام قالب دست‌کم سه نویسه باشد.');
    await this.assertProjectType(input.projectTypeId);
    return this.em.transactional(async (tx) => {
      await this.assertNameFree(name, null, tx);
      const now = this.clock.now();
      const template = tx.create(Template, {
        id: newId(),
        orgId: actor.orgId,
        name,
        icon: 'layout-template',
        projectType: input.projectTypeId,
        status: 'draft',
        isDefaultForType: false,
        originNote: input.originNote,
        maintainerUserId: actor.userId,
        draftContent: input.content,
        lastChangedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await tx.flush();
      return template.id;
    });
  }

  async listItems(templates: readonly Template[]) {
    const [latest, usage, types, people] = await Promise.all([
      this.latest(templates.map((template) => template.id)),
      this.catalog.templateUsage(),
      this.catalog.projectTypes(),
      this.identity.personRefs(templates.flatMap((template) => (template.maintainerUserId ? [template.maintainerUserId] : []))),
    ]);
    const typeName = new Map(types.map((type) => [type.id, type.name]));
    return templates.map((template) => {
      const version = latest.get(template.id);
      const content = template.draftContent ?? version?.content;
      const stats = content ? statsOf(content) : { wbsCount: 0, cbsCount: 0 };
      return {
        id: template.id,
        name: template.name,
        icon: template.icon,
        projectTypeId: template.projectType,
        projectTypeName: typeName.get(template.projectType) ?? template.projectType,
        status: template.status,
        version: version?.number ?? null,
        maintainerName: template.maintainerUserId ? (people.get(template.maintainerUserId)?.fullName ?? '') : '',
        lastChangedAt: dateOf(template.lastChangedAt),
        usedInProjects: usage.get(template.id)?.length ?? 0,
        wbsCount: stats.wbsCount,
        cbsCount: stats.cbsCount,
        isDefaultForType: template.isDefaultForType,
        originNote: template.originNote ?? null,
      };
    });
  }

  /** `GET /templates/:id` (TemplateDetailDto؛ نسخه‌ها از تازه به کهنه). */
  async detail(id: string) {
    const template = await this.find(id);
    const versions = await this.em.find(TemplateVersion, { templateId: id }, { orderBy: { number: 'desc' } });
    const content = this.contentOf(template, versions[0]);
    const [[item], usage, authors] = await Promise.all([
      this.listItems([template]),
      this.catalog.templateUsage(),
      this.identity.personRefs(versions.flatMap((version) => (version.authorUserId ? [version.authorUserId] : []))),
    ]);
    const stats = statsOf(content);
    const titleOf = (key: string) => content.wbs.find((row) => row.key === key)?.title ?? key;
    return {
      ...(item as NonNullable<typeof item>),
      referenceDurationWd: content.referenceDurationWd,
      levels: stats.levels,
      leafCount: stats.leafCount,
      linkCount: stats.linkCount,
      areas: content.areas.map((area) => ({ key: area.key, name: area.name, rootTitles: area.wbsRootKeys.map(titleOf) })),
      settings: content.settings,
      versions: versions.map((version) => ({
        version: version.number,
        publishedAt: version.publishedAt.toISOString(),
        authorName: version.authorUserId ? (authors.get(version.authorUserId)?.fullName ?? '') : '',
        note: version.note,
        wbsCount: version.wbsCount,
        cbsCount: version.cbsCount,
      })),
      hasUnpublishedDraft: template.draftContent !== null && template.draftContent !== undefined,
      weightsOk: validate(content).weightsOk,
      usedInProjectNames: usage.get(template.id) ?? [],
    };
  }
}
