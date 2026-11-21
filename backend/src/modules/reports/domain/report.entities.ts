import { defineEntity, p } from '@mikro-orm/postgresql';
import { CATEGORIES, type SectionKey } from './catalog.js';

// ReportTemplate و GeneratedReport (`02` ۱۲؛ management-reports.md ۶). مالک: reports (F18).

const TemplateSchema = defineEntity({
  name: 'ReportTemplate',
  tableName: 'report_template',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    name: p.text(),
    description: p.text(),
    category: p.enum(CATEGORIES),
    audience: p.enum(['internal', 'client'] as const),
    scope: p.enum(['project', 'portfolio'] as const),
    sections: p.json<SectionKey[]>(),
    formats: p.json<('pdf' | 'xlsx')[]>(),
    createdByUserId: p.uuid(),
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
    version: p.integer().version(),
  },
});
export class ReportTemplate extends TemplateSchema.class {}
TemplateSchema.setClass(ReportTemplate);

export const REPORT_STATUSES = ['queued', 'running', 'done', 'failed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

const GeneratedSchema = defineEntity({
  name: 'GeneratedReport',
  tableName: 'generated_report',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    /** null ← گزارش سطح سازمان (پرتفوی). */
    projectId: p.uuid().nullable(),
    templateId: p.text(),
    templateName: p.text(),
    scopeLabel: p.text(),
    rangeId: p.text(),
    rangeLabel: p.text(),
    rangeFrom: p.date(),
    rangeTo: p.date(),
    format: p.enum(['pdf', 'xlsx'] as const),
    sourceKind: p.enum(['live', 'period_snapshot'] as const),
    includesAmounts: p.boolean(),
    watermark: p.enum(['none', 'open_period'] as const),
    disabledSections: p.json<SectionKey[]>(),
    /** پرتفوی: پروژه‌های دیدنی درخواست‌کننده هنگام درخواست. */
    projectIds: p.json<string[]>(),
    status: p.enum(REPORT_STATUSES),
    error: p.text().nullable(),
    attempts: p.integer().default(0),
    requestedByUserId: p.uuid().nullable(),
    storageKey: p.text().nullable(),
    sizeBytes: p.integer().nullable(),
    pageCount: p.integer().default(0),
    createdAt: p.datetime(),
    finishedAt: p.datetime().nullable(),
    /** زمان‌بندی سازنده؛ null ← دستی یا ارسال. */
    scheduleId: p.uuid().nullable(),
    /** گیرندگان همین نسخه (۷.۳). */
    deliveries: p.json<{ users: string[]; emails: string[] }>(),
  },
});
export class GeneratedReport extends GeneratedSchema.class {}
GeneratedSchema.setClass(GeneratedReport);

export type RecipientKind = 'user' | 'role' | 'email';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'on_period_close';

const ScheduleSchema = defineEntity({
  name: 'ReportSchedule',
  tableName: 'report_schedule',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    templateId: p.text(),
    format: p.enum(['pdf', 'xlsx'] as const),
    frequency: p.enum(['daily', 'weekly', 'monthly', 'on_period_close'] as const),
    /** ۰ = یکشنبه … ۶ = شنبه (همان W25). */
    weekday: p.integer().nullable(),
    /** روز ماه شمسی. */
    dayOfMonth: p.integer().nullable(),
    timeOfDay: p.string(),
    timezone: p.string().default('Asia/Tehran'),
    workingDaysOnly: p.boolean().default(false),
    recipients: p.json<{ kind: RecipientKind; id: string }[]>(),
    enabled: p.boolean().default(true),
    nextRunAt: p.datetime().nullable(),
    lastRunAt: p.datetime().nullable(),
    lastRunStatus: p.enum(['ok', 'failed', 'never', 'paused'] as const),
    note: p.json<{ text: string; tone: string; icon: string }>().nullable(),
    createdByUserId: p.uuid(),
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
    version: p.integer().version(),
  },
});
export class ReportSchedule extends ScheduleSchema.class {}
ScheduleSchema.setClass(ReportSchedule);
