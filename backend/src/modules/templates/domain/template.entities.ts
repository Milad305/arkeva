import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase, tenantBase } from '../../../platform/database/base-properties.js';
import type { TemplateContent } from './content.js';

// Template و TemplateVersion (`02` ۱۲؛ templates.md ۴، ۵.۴). مالک: templates (F16).

export const TEMPLATE_STATUSES = ['draft', 'published', 'archived'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

const TemplateSchema = defineEntity({
  name: 'Template',
  tableName: 'template',
  properties: {
    ...mutableBase(),
    name: p.text(),
    icon: p.string().default('layout-template'),
    /** کلید ProjectType (فیلتر W31، پیشنهاد W37). */
    projectType: p.string(),
    status: p.enum(TEMPLATE_STATUSES),
    isDefaultForType: p.boolean().default(false),
    originNote: p.text().nullable(),
    maintainerUserId: p.uuid().nullable(),
    /** پیش‌نویس منتشرنشده (نسخهٔ بعد؛ ۵.۴)؛ null = همان آخرین نسخهٔ منتشرشده. */
    draftContent: p.json<TemplateContent>().nullable(),
    lastChangedAt: p.datetime(),
  },
});

export class Template extends TemplateSchema.class {}
TemplateSchema.setClass(Template);

const TemplateVersionSchema = defineEntity({
  name: 'TemplateVersion',
  tableName: 'template_version',
  properties: {
    ...tenantBase(),
    templateId: p.uuid(),
    number: p.integer(),
    content: p.json<TemplateContent>(),
    note: p.text(),
    authorUserId: p.uuid().nullable(),
    wbsCount: p.integer(),
    cbsCount: p.integer(),
    publishedAt: p.datetime(),
  },
});

export class TemplateVersion extends TemplateVersionSchema.class {}
TemplateVersionSchema.setClass(TemplateVersion);
