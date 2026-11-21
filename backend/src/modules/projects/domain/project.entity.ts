import { defineEntity, p } from '@mikro-orm/postgresql';
import { PROJECT_STATUSES, type ProjectStatus } from '@projeyar/shared';
import { createdAtColumn, mutableBase, tenantBase } from '../../../platform/database/base-properties.js';

/**
 * Project — `02` ۳ (بخش لازم برای برش اول). مالک: F02. فیلدهای برنامه و GPS با ویژگی‌های
 * خودشان و migration جدا می‌آیند؛ تاریخ‌های برنامه از نسخهٔ جاری F04 پر می‌شوند (D05).
 */
const ProjectSchema = defineEntity({
  name: 'Project',
  tableName: 'project',
  properties: {
    ...mutableBase(),
    /** C05: PRJ-<سال شمسی>-<سه رقم>؛ تغییرناپذیر؛ یکتا در سازمان. */
    code: p.string(),
    name: p.string(),
    clientName: p.string(),
    /** کلید نوع از فهرست سازمان (`02` ۳: projectType رشته است، نه موجودیت). */
    projectType: p.string(),
    description: p.text().nullable(),
    status: p.enum(PROJECT_STATUSES).default('draft'),
    managerUserId: p.uuid(),
    plannedStart: p.date().nullable(),
    plannedFinish: p.date().nullable(),
    mspLinked: p.boolean().default(false),
    activatedAt: p.datetime().nullable(),
    /** C02: ریال صحیح؛ بیرون از CBS و BAC (W47). */
    contingencyReserve: p.bigint('string').default('0'),
    displayCurrencyUnit: p.enum(['rial', 'toman'] as const).default('rial'),
    // چرخهٔ عمر (F02 ۴، ۸): لحظهٔ ورود به هر حالت
    pausedAt: p.datetime().nullable(),
    completedAt: p.datetime().nullable(),
    archivedAt: p.datetime().nullable(),
    /** حذف با مهلت (F02 ۸.۴): پروژه از این لحظه پنهان است و در deletionPurgeAt پاک می‌شود. */
    deletionRequestedAt: p.datetime().nullable(),
    deletionPurgeAt: p.datetime().nullable(),
    // افزوده‌های F02 ۴
    location: p.text().nullable(),
    /** کلید فایل تصویر؛ تا ذخیره‌سازی فایل F20 ۷ تهی (تصمیم کاربر 1405/08/22). */
    imageKey: p.string().nullable(),
    /** بودجهٔ کل ویزارد؛ راهنما تا پیش از فعال‌سازی (C02: ریال صحیح). */
    plannedTotalBudget: p.bigint('string').nullable(),
    /** `templateRef` (templates.md ۴) — فقط آمار W31. */
    templateId: p.uuid().nullable(),
    templateVersion: p.integer().nullable(),
    contingencyPct: p.decimal('number').nullable(),
    siteLat: p.decimal('number').nullable(),
    siteLng: p.decimal('number').nullable(),
    gpsRadiusM: p.integer().default(300),
    /** تاریخ کامل بودن هزینه‌ها (OD-19)؛ مال cost-ledger، نوشتن فقط از ProjectCostCutoff. */
    costsCompleteThrough: p.date().nullable(),
    costsCompleteSetBy: p.uuid().nullable(),
    costsCompleteSetAt: p.datetime().nullable(),
    /** فقط تا ساخت ساختار؛ F03 به برگ‌های نقطهٔ عطف با وزن ۰ تبدیلشان می‌کند (F02 ۵.۲). */
    keyMilestones: p.json<KeyMilestone[]>().default([]),
    createdByUserId: p.uuid().nullable(),
    /** F04 ۵.۳ گام ۷: نسخهٔ مبنا، جاری و مرجع PV؛ فقط planning از راه ProjectPlanAccess می‌نویسد. */
    baselineVersionId: p.uuid().nullable(),
    currentVersionId: p.uuid().nullable(),
    pvReferenceVersionId: p.uuid().nullable(),
  },
});

export interface KeyMilestone {
  readonly title: string;
  readonly date: string;
}

export class Project extends ProjectSchema.class {
  /** فقط موتور گردش کار صدا می‌زند (docs/backend/08 ۶). */
  markStatus(to: ProjectStatus, at: Date): void {
    const from = this.status;
    this.status = to;
    if (from === 'draft' && to === 'active') this.activatedAt = at;
    if (to === 'paused') this.pausedAt = at;
    if (from === 'paused') this.pausedAt = null;
    if (to === 'completed') this.completedAt = at;
    // بایگانیِ پروژهٔ تمام‌شده تاریخ پایان را نگه می‌دارد؛ فقط بازگشت از پایان آن را پاک می‌کند
    if (from === 'completed' && to === 'active') this.completedAt = null;
    if (to === 'archived') this.archivedAt = at;
    if (from === 'archived') this.archivedAt = null;
  }
}
ProjectSchema.setClass(Project);

/** فهرست انواع پروژهٔ سازمان (F02 ۴). کلید پایدار؛ نام قابل‌ویرایش. */
const ProjectTypeSchema = defineEntity({
  name: 'ProjectType',
  tableName: 'project_type',
  properties: {
    ...tenantBase(),
    key: p.string(),
    name: p.string(),
    sortOrder: p.integer().default(0),
  },
});

export class ProjectType extends ProjectTypeSchema.class {}
ProjectTypeSchema.setClass(ProjectType);

/** دفتر کدهای پروژه (F02 ۸.۴: کد پس از حذف دوباره استفاده نمی‌شود). فقط‌درج؛ بی کلید خارجی به پروژه. */
const ProjectCodeRegisterSchema = defineEntity({
  name: 'ProjectCodeRegister',
  tableName: 'project_code_register',
  properties: {
    orgId: p.uuid().primary(),
    code: p.string().primary(),
    projectId: p.uuid(),
    createdAt: createdAtColumn(),
  },
});

export class ProjectCodeRegister extends ProjectCodeRegisterSchema.class {}
ProjectCodeRegisterSchema.setClass(ProjectCodeRegister);
