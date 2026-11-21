import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DEFAULT_ROLE_PERMISSIONS, type ProjectRoleCode, SYSTEM_ROLES } from '@projeyar/shared';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { TeamService } from '../../team/index.js';
import {
  type Audience,
  type Category,
  CATEGORIES,
  CATEGORY_LABELS,
  type Format,
  hasAmounts,
  type Scope,
  SECTION_KEYS,
  type SectionKey,
  SECTIONS,
  SYSTEM_TEMPLATES,
  type TemplateDef,
} from '../domain/catalog.js';
import { GeneratedReport, ReportTemplate } from '../domain/report.entities.js';
import { ReportAccess } from './report-access.js';
import { ReportData } from './report-data.js';
import { ReportRanges } from './report-ranges.js';

// کتابخانهٔ گزارش (W25؛ management-reports.md ۵، ۹، ۱۱): قالب‌ها، قالب سفارشی (G21)، گزینهٔ فرم‌ها، بازه‌ها و پیش‌نمایش زنده.

const invalid = (reason: string) => new DomainError('REPORT_INVALID', 422, { reason });
const ROLE_CODES: ProjectRoleCode[] = ['project_manager', 'planner', 'reviewer', 'finance', 'client_reviewer'];
const amountRoles = (Object.keys(DEFAULT_ROLE_PERMISSIONS) as ProjectRoleCode[]).filter((role) =>
  DEFAULT_ROLE_PERMISSIONS[role].some((grant) => grant.code === 'cbs.view_amounts'),
);
const initialsOf = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('.');

export const customDef = (row: ReportTemplate): TemplateDef => ({
  id: row.id,
  name: row.name,
  description: row.description,
  icon: 'layout-template',
  category: row.category,
  audience: row.audience,
  scope: row.scope,
  sections: row.sections,
  formats: row.formats,
  isSystem: false,
  status: 'ready',
});

@Injectable()
export class ReportLibrary {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly access: ReportAccess,
    private readonly ranges: ReportRanges,
    private readonly data: ReportData,
    private readonly identity: IdentityService,
    private readonly team: TeamService,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  async template(id: string): Promise<TemplateDef> {
    const system = SYSTEM_TEMPLATES.find((template) => template.id === id);
    if (system) return system;
    const custom = /^[0-9a-f-]{36}$/i.test(id) ? await this.em.findOne(ReportTemplate, { id }) : null;
    if (!custom) throw new NotFoundError('REPORT_TEMPLATE_NOT_FOUND');
    return customDef(custom);
  }

  private dto(template: TemplateDef, lastGenerated: ReadonlyMap<string, Date>) {
    return {
      ...template,
      sections: [...template.sections],
      formats: [...template.formats],
      categoryLabel: CATEGORY_LABELS[template.category],
      includesAmounts: hasAmounts(template.sections, template.audience),
      pageCount: Math.max(1, template.sections.length),
      lastGeneratedAt: lastGenerated.get(template.id)?.toISOString() ?? null,
    };
  }

  /** `GET /report-templates` */
  async list() {
    const [custom, generated] = await Promise.all([
      this.em.find(ReportTemplate, {}, { orderBy: { createdAt: 'asc' } }),
      this.em.find(GeneratedReport, { status: 'done' }, { fields: ['templateId', 'createdAt'] }),
    ]);
    const last = new Map<string, Date>();
    for (const row of generated) if (!last.has(row.templateId) || (last.get(row.templateId) as Date) < row.createdAt) last.set(row.templateId, row.createdAt);
    const items = [...SYSTEM_TEMPLATES, ...custom.map(customDef)].map((template) => this.dto(template, last));
    return {
      items,
      categoryCounts: CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        count: items.filter((item) => item.category === category).length,
      })).filter((entry) => entry.count > 0),
      sections: SECTION_KEYS.map((key) => ({ key, ...SECTIONS[key] })),
    };
  }

  /** `POST /report-templates` — ترکیب بخش‌های آماده؛ بخش تازه ساخته نمی‌شود (۵؛ G21). */
  async create(input: {
    readonly name: string;
    readonly description: string;
    readonly category: Category;
    readonly audience: Audience;
    readonly scope: Scope;
    readonly sections: readonly SectionKey[];
    readonly formats: readonly Format[];
  }) {
    const { actor } = this.access.actor();
    const name = input.name.trim();
    if (name.length < 3 || name.length > 120) throw invalid('نام قالب دست‌کم سه نویسه باشد.');
    const sections = [...new Set(input.sections)];
    if (sections.length === 0) throw invalid('دست‌کم یک بخش را انتخاب کنید.');
    if (input.scope === 'portfolio' && !sections.includes('portfolio')) throw invalid('گزارش پرتفوی باید بخش «پرتفوی پروژه‌ها» را داشته باشد.');
    if (input.scope === 'project' && sections.includes('portfolio')) throw invalid('بخش «پرتفوی پروژه‌ها» فقط در گزارش سطح سازمان می‌آید.');
    if (SYSTEM_TEMPLATES.some((template) => template.name === name) || (await this.em.count(ReportTemplate, { name })) > 0)
      throw new ConflictError('REPORT_TEMPLATE_NAME_TAKEN');
    const now = this.clock.now();
    const row = await this.em.transactional((tx) =>
      Promise.resolve(
        tx.create(ReportTemplate, {
          id: newId(),
          orgId: actor.orgId,
          name,
          description: input.description.trim() || 'قالب سفارشی سازمان',
          category: input.category,
          audience: input.audience,
          scope: input.scope,
          sections,
          formats: input.formats.length > 0 ? [...new Set(input.formats)] : ['pdf'],
          createdByUserId: actor.userId,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    return this.dto(customDef(row), new Map());
  }

  /** `GET /report-templates/options` `[پیش‌فرض فنی]` — پروژه‌ها، کاربران و نقش‌ها برای فرم‌ها. */
  async options() {
    const projectIds = await this.access.projects('reports.view');
    const [cards, people, viewers] = await Promise.all([
      this.catalog.cards(projectIds),
      this.identity.directory('', 50),
      this.team.membersWithRoles(projectIds, amountRoles),
    ]);
    const amountUsers = new Set(viewers.map((row) => row.userId));
    return {
      projects: cards.filter((card) => card.status !== 'archived').map((card) => ({ id: card.id, name: card.name, code: card.code })),
      users: people.map((person) => ({
        id: person.userId,
        fullName: person.fullName,
        initials: initialsOf(person.fullName),
        avatarTone: person.avatarTone,
        canViewAmounts: amountUsers.has(person.userId),
      })),
      roles: ROLE_CODES.map((code) => ({ code, label: SYSTEM_ROLES[code], canViewAmounts: amountRoles.includes(code) })),
    };
  }

  /** `GET /report-templates/ranges?projectId=` */
  async rangeOptions(projectId: string | null) {
    const scope = this.access.scope(projectId ?? 'org', 'reports.view');
    return (await this.ranges.list(scope)).map(({ periodId: _periodId, ...range }) => range);
  }

  /** قالب پرتفوی همیشه سطح سازمان است (پروژهٔ انتخاب‌شده نادیده)؛ قالب پروژه پروژه می‌خواهد. */
  scopeFor(template: TemplateDef, rawScope: string, code: 'reports.view' | 'reports.generate'): string | null {
    if (template.scope === 'portfolio') return this.access.scope('org', code);
    const projectId = this.access.scope(rawScope, code);
    if (!projectId) throw invalid('این قالب برای یک پروژه است؛ پروژه را انتخاب کنید.');
    return projectId;
  }

  /** `POST /projects/:scope/reports/preview` — همان محتوای فایل، با مبلغ به اندازهٔ دسترسی کاربر. */
  async preview(rawScope: string, input: { readonly templateId: string; readonly rangeId: string; readonly disabledSections?: readonly SectionKey[] }) {
    const template = await this.template(input.templateId);
    const projectId = this.scopeFor(template, rawScope, 'reports.view');
    const { actor } = this.access.actor();
    const content = await this.data.build({
      orgId: actor.orgId,
      projectId,
      template,
      range: await this.ranges.resolve(projectId, input.rangeId),
      disabled: input.disabledSections ?? [],
      amounts: this.access.amounts(projectId),
      projectIds: projectId ? [projectId] : await this.access.projects('reports.view'),
      now: this.clock.now(),
    });
    // کلید ذخیره‌سازی عکس فقط برای فایل است
    const sections = content.sections.map((section) =>
      section['key'] === 'photos' && Array.isArray(section['items'])
        ? { ...section, items: (section['items'] as Record<string, unknown>[]).map(({ storageKey: _key, ...item }) => item) }
        : section,
    );
    return { ...content, sections };
  }
}
