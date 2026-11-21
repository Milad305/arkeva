import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, mutableBase, updatedAtColumn } from '../../../platform/database/base-properties.js';

// نسخه‌های برنامه و WBS جاری (`02` ۴؛ D05). مالک: planning (F04)؛ `supervisorUserId` مال team (F07) و
// `statusNote` عملیاتی و بی نسخه است.

export const PLAN_VERSION_KINDS = ['baseline', 'revision'] as const;
export const PLAN_VERSION_STATUSES = ['draft', 'applied', 'discarded'] as const;
export const PLAN_VERSION_SOURCES = ['wizard', 'template', 'manual_edit', 'msp_import', 'msp_sync', 'budget_revision'] as const;
export const MEASUREMENT_METHODS = ['quantity', 'percent', 'steps', 'time_based'] as const;
export type PlanVersionKind = (typeof PLAN_VERSION_KINDS)[number];
export type PlanVersionSource = (typeof PLAN_VERSION_SOURCES)[number];
export type MeasurementMethod = (typeof MEASUREMENT_METHODS)[number];

/** گام برگ با روش `steps` (wbs.md ۴.۲)؛ `key` پایدار. */
export interface StoredStep {
  readonly key: string;
  readonly title: string;
  /** چهار رقم اعشار. */
  readonly weight: number;
}

const PlanVersionSchema = defineEntity({
  name: 'PlanVersion',
  tableName: 'plan_version',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    kind: p.enum(PLAN_VERSION_KINDS),
    /** مبنا ۰ از ساخت؛ بازنگری هنگام اعمال شماره می‌گیرد (F04 ۵.۳ گام ۴). */
    number: p.integer().nullable(),
    status: p.enum(PLAN_VERSION_STATUSES).default('draft'),
    source: p.enum(PLAN_VERSION_SOURCES),
    note: p.text().nullable(),
    /** قفل خوش‌بینانهٔ نسخهٔ کاری (F04 ۳). */
    draftRevision: p.integer().default(0),
    changeCount: p.integer().default(0),
    lastSavedAt: p.datetime().nullable(),
    lastSavedByUserId: p.uuid().nullable(),
    appliedByUserId: p.uuid().nullable(),
    appliedAt: p.datetime().nullable(),
    discardedAt: p.datetime().nullable(),
    createdByUserId: p.uuid().nullable(),
  },
});

export class PlanVersion extends PlanVersionSchema.class {}
PlanVersionSchema.setClass(PlanVersion);

/** فیلدهای برنامه‌ای مشترک جاری و عکس نسخه. */
function planFields() {
  return {
    parentId: p.uuid().nullable(),
    code: p.string(),
    codeMode: p.enum(['auto', 'custom'] as const).default('auto'),
    title: p.string(),
    sortOrder: p.integer().default(0),
    isLeaf: p.boolean().default(true),
    isMilestone: p.boolean().default(false),
    /** numeric(7,4) — رشته تا دقت کامل بماند (C04). */
    weightInParent: p.decimal('string').default('0'),
    plannedStart: p.date().nullable(),
    plannedFinish: p.date().nullable(),
    unit: p.string().nullable(),
    totalQuantity: p.decimal('string').nullable(),
    measurementMethod: p.enum(MEASUREMENT_METHODS).nullable(),
    steps: p.json<StoredStep[]>().nullable(),
    isCritical: p.boolean().nullable(),
    totalFloatDays: p.decimal('string').nullable(),
  };
}

const WbsItemSchema = defineEntity({
  name: 'WbsItem',
  tableName: 'wbs_item',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    ...planFields(),
    supervisorUserId: p.uuid().nullable(),
    statusNote: p.text().nullable(),
    removedAt: p.datetime().nullable(),
    removedInVersionId: p.uuid().nullable(),
  },
});

export class WbsItem extends WbsItemSchema.class {}
WbsItemSchema.setClass(WbsItem);

const WbsItemPlanSchema = defineEntity({
  name: 'WbsItemPlan',
  tableName: 'wbs_item_plan',
  properties: {
    planVersionId: p.uuid().primary(),
    wbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    ...planFields(),
    /** عکس بودجهٔ برگ در این نسخه (F05، برش ۴)؛ تا آن موقع ۰. */
    bac: p.bigint('string').default('0'),
  },
});

export class WbsItemPlan extends WbsItemPlanSchema.class {}
WbsItemPlanSchema.setClass(WbsItemPlan);

// ── CBS و اتصال‌ها (cbs.md ۴، ۵؛ `02` ۵) ──

/** فهرست ثابت نوع هزینه (cbs.md ۴.۲؛ تصمیم کاربر 1405/08/23: کدهای سند). */
export const COST_TYPES = ['materials', 'labor', 'equipment', 'transport', 'subcontract', 'overhead', 'other'] as const;
export type CostType = (typeof COST_TYPES)[number];
export const PRICING_MODES = ['unit_rate', 'lump_sum'] as const;
export type PricingModeCode = (typeof PRICING_MODES)[number];

function cbsFields() {
  return {
    parentId: p.uuid().nullable(),
    code: p.string(),
    title: p.string(),
    sortOrder: p.integer().default(0),
    isLeaf: p.boolean().default(true),
    costType: p.enum(COST_TYPES),
    unit: p.string().nullable(),
    estimatedQuantity: p.decimal('string').nullable(),
    pricingMode: p.enum(PRICING_MODES).nullable(),
    /** ریال؛ رشته تا bigint دقیق بماند (C02). */
    unitRate: p.bigint('string').nullable(),
    lumpSumAmount: p.bigint('string').nullable(),
    supplierNote: p.text().nullable(),
  };
}

const CbsItemSchema = defineEntity({
  name: 'CbsItem',
  tableName: 'cbs_item',
  properties: {
    ...mutableBase(),
    projectId: p.uuid(),
    ...cbsFields(),
    removedAt: p.datetime().nullable(),
    removedInVersionId: p.uuid().nullable(),
  },
});

export class CbsItem extends CbsItemSchema.class {}
CbsItemSchema.setClass(CbsItem);

const CbsItemPlanSchema = defineEntity({
  name: 'CbsItemPlan',
  tableName: 'cbs_item_plan',
  properties: {
    planVersionId: p.uuid().primary(),
    cbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    ...cbsFields(),
  },
});

export class CbsItemPlan extends CbsItemPlanSchema.class {}
CbsItemPlanSchema.setClass(CbsItemPlan);

const WbsCbsLinkSchema = defineEntity({
  name: 'WbsCbsLink',
  tableName: 'wbs_cbs_link',
  properties: {
    wbsItemId: p.uuid().primary(),
    cbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    /** `unit_rate`: مقدار به واحد قلم. */
    quantity: p.decimal('string').nullable(),
    /** `lump_sum`: مبلغ تخصیص (cbs.md ۴.۱). */
    allocatedAmount: p.bigint('string').nullable(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
});

export class WbsCbsLink extends WbsCbsLinkSchema.class {}
WbsCbsLinkSchema.setClass(WbsCbsLink);

const WbsCbsLinkPlanSchema = defineEntity({
  name: 'WbsCbsLinkPlan',
  tableName: 'wbs_cbs_link_plan',
  properties: {
    planVersionId: p.uuid().primary(),
    wbsItemId: p.uuid().primary(),
    cbsItemId: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    quantity: p.decimal('string').nullable(),
    allocatedAmount: p.bigint('string').nullable(),
    /** عکس زیربودجه در این نسخه (ب6). */
    subBudget: p.bigint('string').default('0'),
  },
});

export class WbsCbsLinkPlan extends WbsCbsLinkPlanSchema.class {}
WbsCbsLinkPlanSchema.setClass(WbsCbsLinkPlan);
