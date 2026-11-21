import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { ProjectBasicsCatalog, type PreparedTemplate, ProjectTemplates, type WizardTemplateView } from '../../projects/index.js';
import { applyTemplate } from '../domain/apply.js';
import { Template, type TemplateVersion } from '../domain/template.entities.js';
import { templateInvalid, TemplateStore } from './template-store.js';

// قالب‌ها برای ویزارد ساخت پروژه (W38؛ templates.md ۵.۳، ۵.۴): فقط منتشرشده و بایگانی‌نشده (AC-TP-08)، همیشه آخرین نسخهٔ
// منتشرشده — پیش‌نویس نسخهٔ بعد دیده نمی‌شود (AC-TP-06). پیاده‌سازی ProjectTemplates (درگاه projects).

const APPROVAL_LABEL = { single_stage: 'گردش‌کار یک‌مرحله‌ای', two_stage: 'گردش‌کار دومرحله‌ای' } as const;

@Injectable()
export class WizardTemplates extends ProjectTemplates {
  constructor(
    private readonly em: EntityManager,
    private readonly store: TemplateStore,
    private readonly catalog: ProjectBasicsCatalog,
  ) {
    super();
  }

  async forWizard(projectTypeId: string | null): Promise<WizardTemplateView[]> {
    const templates = await this.em.find(Template, { status: 'published' });
    const [latest, usage] = await Promise.all([this.store.latest(templates.map((template) => template.id)), this.catalog.templateUsage()]);
    return templates
      .filter((template) => latest.has(template.id))
      .map((template) => {
        const version = latest.get(template.id) as TemplateVersion;
        const settings = version.content.settings;
        const sameType = projectTypeId !== null && template.projectType === projectTypeId;
        return {
          rank: Number(sameType) * 1e9 + Number(sameType && template.isDefaultForType) * 1e8 + (usage.get(template.id)?.length ?? 0),
          view: {
            id: template.id,
            title: template.name,
            icon: template.icon,
            version: `نسخهٔ ${toFaDigits(version.number)}`,
            wbsCount: version.wbsCount,
            cbsCount: version.cbsCount,
            usedIn: usage.get(template.id)?.length ?? 0,
            recommended: sameType && template.isDefaultForType,
            copies: [
              `${toFaDigits(version.wbsCount)} آیتم WBS با وزن‌ها، روش‌ها و واحد مقدار`,
              version.cbsCount > 0 ? `${toFaDigits(version.cbsCount)} قلم CBS و اتصال‌های WBS` : 'بی قلم CBS؛ بودجه دستی وارد می‌شود',
              'تاریخ‌ها از تاریخ شروع پروژه محاسبه می‌شود',
              `آستانه‌های ${toFaDigits(settings.warningThreshold)} و ${toFaDigits(settings.criticalThreshold)}٪ و ${APPROVAL_LABEL[settings.approvalMode]}`,
            ],
          },
        };
      })
      .sort((a, b) => b.rank - a.rank)
      .map((entry) => entry.view);
  }

  async prepare(templateId: string, input: { readonly workDays: readonly string[]; readonly cbsBudget: bigint }): Promise<PreparedTemplate> {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
    const template = uuid ? await this.em.findOne(Template, { id: templateId }) : null;
    const version = template?.status === 'published' ? (await this.store.latest([templateId])).get(templateId) : undefined;
    if (!template || !version) throw templateInvalid('این قالب منتشرشده نیست یا بایگانی شده است. قالب دیگری انتخاب کنید.');
    const applied = applyTemplate(version.content, { workDays: input.workDays, cbsBudget: input.cbsBudget < 0n ? 0n : input.cbsBudget, newId });
    return {
      templateId,
      version: version.number,
      content: { wbs: applied.wbs, cbs: applied.cbs, links: applied.links },
      areas: applied.areas,
      settings: { ...version.content.settings },
    };
  }
}
