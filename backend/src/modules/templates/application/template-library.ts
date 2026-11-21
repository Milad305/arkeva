import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { normalizeSearch } from '../../../platform/search/normalize.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { statsOf, validate } from '../domain/content.js';
import { normalizeContent, TemplateContentError } from '../domain/normalize.js';
import { previewOf } from '../domain/preview.js';
import { Template, TemplateVersion } from '../domain/template.entities.js';
import { templateConflict, templateInvalid, TemplateStore } from './template-store.js';

// کتابخانهٔ قالب‌ها (W31؛ templates.md ۵.۲، ۵.۴، ۹): فهرست، پیش‌نمایش، اعتبارسنجی، انتشار، بایگانی، پیش‌فرض نوع، حذف و
// پیش‌نویس نسخهٔ بعد (`PUT /templates/:id/draft`؛ تصمیم کاربر برش ۱۶).

@Injectable()
export class TemplateLibrary {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly store: TemplateStore,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  /** `GET /templates?type=&status=&search=` — پیش‌فرض اول، بعد پراستفاده‌تر، بعد تازه‌تر. */
  async list(input: { readonly type: string | null; readonly includeArchived: boolean; readonly search: string }) {
    const all = await this.em.find(Template, {}, { orderBy: { lastChangedAt: 'desc' } });
    const visible = all.filter((template) => input.includeArchived || template.status !== 'archived');
    const query = normalizeSearch(input.search ?? '');
    const items = (
      await this.store.listItems(
        visible.filter((template) => (!input.type || template.projectType === input.type) && (query === '' || normalizeSearch(template.name).includes(query))),
      )
    ).sort(
      (a, b) =>
        Number(b.isDefaultForType) - Number(a.isDefaultForType) || b.usedInProjects - a.usedInProjects || b.lastChangedAt.localeCompare(a.lastChangedAt),
    );
    const types = await this.catalog.projectTypes();
    return {
      items,
      typeCounts: types
        .map((type) => ({ projectTypeId: type.id, name: type.name, count: visible.filter((template) => template.projectType === type.id).length }))
        .filter((entry) => entry.count > 0),
      projectTypes: types,
      archivedCount: all.filter((template) => template.status === 'archived').length,
    };
  }

  detail(id: string) {
    return this.store.detail(id);
  }

  /** `GET /templates/:id/preview?cbsBudget=&workdays=` (۵.۳ بی ساخت پروژه). */
  async preview(id: string, input: { readonly cbsBudget: string; readonly workdays: number }) {
    const template = await this.store.find(id);
    const latest = (await this.store.latest([id])).get(id);
    let budget: bigint;
    try {
      budget = BigInt(input.cbsBudget || '0');
    } catch {
      throw templateInvalid('بودجهٔ CBS را به ریال و بدون جداکننده بنویسید.');
    }
    return {
      templateId: id,
      version: latest?.number ?? null,
      ...previewOf(this.store.contentOf(template, latest), { cbsBudget: budget < 0n ? 0n : budget, workdays: input.workdays }),
    };
  }

  /** `POST /templates/:id/validate` (۵.۲؛ AC-TP-03). */
  async validate(id: string) {
    const template = await this.store.find(id);
    const latest = (await this.store.latest([id])).get(id);
    return { templateId: id, ...validate(this.store.contentOf(template, latest)) };
  }

  /** `POST /templates/:id/publish {note}` — نسخهٔ تغییرناپذیر تازه (۵.۴؛ AC-TP-06). */
  async publish(id: string, note: string) {
    const actor = this.store.actor();
    await this.em.transactional(async (tx) => {
      const template = await this.store.find(id, tx);
      if (template.status === 'archived') throw templateConflict('قالب بایگانی‌شده منتشر نمی‌شود. اول از بایگانی بیرونش بیاورید.');
      const latest = (await this.store.latest([id], tx)).get(id);
      const content = this.store.contentOf(template, latest);
      const report = validate(content);
      if (!report.canPublish)
        throw templateInvalid('قالب هنوز اعتبار ندارد و پیش‌نویس می‌ماند؛ «بررسی وزن‌ها» خطاها را نشان می‌دهد.', { errors: report.errors });
      const now = this.clock.now();
      const stats = statsOf(content);
      const number = (latest?.number ?? 0) + 1;
      tx.create(TemplateVersion, {
        id: newId(),
        orgId: actor.orgId,
        templateId: id,
        number,
        content,
        note: note.trim() || 'بدون یادداشت',
        authorUserId: actor.userId,
        wbsCount: stats.wbsCount,
        cbsCount: stats.cbsCount,
        publishedAt: now,
        createdAt: now,
      });
      template.status = 'published';
      template.draftContent = null;
      template.lastChangedAt = now;
      this.audit.record(tx, { action: 'template.published', entityType: 'Template', entityId: id, after: { version: number } });
    });
    return this.store.detail(id);
  }

  /** `POST /templates/:id/archive` و `DELETE` همان مسیر (۵.۴؛ AC-TP-08). */
  async archive(id: string, archived: boolean) {
    await this.em.transactional(async (tx) => {
      const template = await this.store.find(id, tx);
      const hasVersion = (await tx.count(TemplateVersion, { templateId: id })) > 0;
      template.status = archived ? 'archived' : hasVersion ? 'published' : 'draft';
      if (archived) template.isDefaultForType = false;
      template.lastChangedAt = this.clock.now();
      this.audit.record(tx, { action: archived ? 'template.archived' : 'template.unarchived', entityType: 'Template', entityId: id });
    });
    return this.store.detail(id);
  }

  /** `PATCH /templates/:id {isDefaultForType}` — هر نوع پروژه یک پیش‌فرض (۵.۴). */
  async setDefault(id: string, isDefault: boolean) {
    await this.em.transactional(async (tx) => {
      const template = await this.store.find(id, tx);
      if (isDefault) {
        if (template.status !== 'published') throw templateConflict('فقط قالب منتشرشده پیش‌فرض می‌شود؛ اول نسخه‌اش را منتشر کنید.');
        const others = await tx.find(Template, { projectType: template.projectType, isDefaultForType: true, id: { $ne: id } });
        for (const other of others) other.isDefaultForType = false;
        // ایندکس یکتای جزئی: پیش‌فرض قبلی پیش از تازه پاک شود
        await tx.flush();
      }
      template.isDefaultForType = isDefault;
      this.audit.record(tx, { action: 'template.default_changed', entityType: 'Template', entityId: id, after: { isDefaultForType: isDefault } });
    });
    return this.store.detail(id);
  }

  /** `DELETE /templates/:id` — فقط قالبی که هرگز پروژه‌ای از آن ساخته نشده (۵.۴). */
  async remove(id: string) {
    const usage = await this.catalog.templateUsage();
    await this.em.transactional(async (tx) => {
      const template = await this.store.find(id, tx);
      if ((usage.get(id)?.length ?? 0) > 0) {
        throw templateConflict('از این قالب پروژه ساخته شده است، پس حذف نمی‌شود. می‌توانید بایگانی‌اش کنید تا در ساخت پروژه دیده نشود.');
      }
      this.audit.record(tx, { action: 'template.deleted', entityType: 'Template', entityId: id, before: { name: template.name } });
      await tx.nativeDelete(TemplateVersion, { templateId: id });
      tx.remove(template);
    });
    return { id };
  }

  /** `PUT /templates/:id/draft` — پیش‌نویس نسخهٔ بعد؛ تا انتشار، ویزارد نسخهٔ قبلی را می‌دهد (۵.۴؛ AC-TP-06). */
  async putDraft(id: string, input: { readonly content: unknown; readonly name?: string; readonly projectTypeId?: string }) {
    let content;
    try {
      content = normalizeContent(input.content);
    } catch (error) {
      if (error instanceof TemplateContentError) throw templateInvalid(error.message);
      throw error;
    }
    if (input.projectTypeId) await this.store.assertProjectType(input.projectTypeId);
    await this.em.transactional(async (tx) => {
      const template = await this.store.find(id, tx);
      if (template.status === 'archived') throw templateConflict('قالب بایگانی‌شده ویرایش نمی‌شود. اول از بایگانی بیرونش بیاورید.');
      const name = input.name?.trim();
      if (name !== undefined && name !== template.name) {
        if (name.length < 3 || name.length > 200) throw templateInvalid('نام قالب دست‌کم سه نویسه باشد.');
        await this.store.assertNameFree(name, id, tx);
        template.name = name;
      }
      if (input.projectTypeId && input.projectTypeId !== template.projectType) {
        // تغییر نوع فقط در پیش‌نویس (۱۰)
        if (template.status !== 'draft') throw templateConflict('نوع پروژهٔ قالب منتشرشده عوض نمی‌شود.');
        template.projectType = input.projectTypeId;
      }
      template.draftContent = content;
      template.lastChangedAt = this.clock.now();
      this.audit.record(tx, { action: 'template.draft_saved', entityType: 'Template', entityId: id });
    });
    return this.store.detail(id);
  }
}
