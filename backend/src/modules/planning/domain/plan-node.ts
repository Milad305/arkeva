import type { CostType, MeasurementMethod, PricingModeCode, StoredStep } from './plan.entities.js';

/**
 * یک آیتم برنامه، تخت (wbs.md ۱۲: فهرست تخت با `parentId` و `sortOrder`) — قرارداد میان planning (ذخیره در
 * جاری و عکس نسخه) و موتور درخت wbs. اعداد اعشاری رشته‌اند تا دقت numeric بماند (C04).
 */
export interface PlanNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
  readonly code: string;
  readonly codeMode: 'auto' | 'custom';
  readonly title: string;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  /** «36.8421» */
  readonly weightInParent: string;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  readonly unit: string | null;
  readonly totalQuantity: string | null;
  readonly measurementMethod: MeasurementMethod | null;
  readonly steps: readonly StoredStep[] | null;
  readonly isCritical: boolean | null;
  readonly totalFloatDays: string | null;
}

/** فیلدهای برنامه‌ای یک ردیف جاری یا عکس نسخه — همان نام‌های Entity. */
export function planNodeOf(row: {
  readonly id?: string;
  readonly wbsItemId?: string;
  readonly parentId?: string | null;
  readonly sortOrder: number;
  readonly code: string;
  readonly codeMode: 'auto' | 'custom';
  readonly title: string;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  readonly weightInParent: string;
  readonly plannedStart?: string | null;
  readonly plannedFinish?: string | null;
  readonly unit?: string | null;
  readonly totalQuantity?: string | null;
  readonly measurementMethod?: MeasurementMethod | null;
  readonly steps?: readonly StoredStep[] | null;
  readonly isCritical?: boolean | null;
  readonly totalFloatDays?: string | null;
}): PlanNode {
  return {
    id: (row.wbsItemId ?? row.id) as string,
    parentId: row.parentId ?? null,
    sortOrder: row.sortOrder,
    code: row.code,
    codeMode: row.codeMode,
    title: row.title,
    isLeaf: row.isLeaf,
    isMilestone: row.isMilestone,
    weightInParent: row.weightInParent,
    plannedStart: row.plannedStart ?? null,
    plannedFinish: row.plannedFinish ?? null,
    unit: row.unit ?? null,
    totalQuantity: row.totalQuantity ?? null,
    measurementMethod: row.measurementMethod ?? null,
    steps: row.steps ?? null,
    isCritical: row.isCritical ?? null,
    totalFloatDays: row.totalFloatDays ?? null,
  };
}

/** یک قلم CBS، تخت (cbs.md ۴؛ `02` ۵). مبالغ رشتهٔ ریال، مقدار رشتهٔ دهدهی. */
export interface CbsNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly costType: CostType;
  readonly unit: string | null;
  readonly estimatedQuantity: string | null;
  readonly pricingMode: PricingModeCode | null;
  readonly unitRate: string | null;
  readonly lumpSumAmount: string | null;
  readonly supplierNote: string | null;
}

/** اتصال برگ WBS ↔ برگ CBS (cbs.md ۵.۱): مقدار برای نرخ واحد، مبلغ برای مقطوع. */
export interface LinkNode {
  readonly wbsItemId: string;
  readonly cbsItemId: string;
  readonly quantity: string | null;
  readonly allocatedAmount: string | null;
}

export function cbsNodeOf(row: {
  readonly id?: string;
  readonly cbsItemId?: string;
  readonly parentId?: string | null;
  readonly sortOrder: number;
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly costType: CostType;
  readonly unit?: string | null;
  readonly estimatedQuantity?: string | null;
  readonly pricingMode?: PricingModeCode | null;
  readonly unitRate?: string | null;
  readonly lumpSumAmount?: string | null;
  readonly supplierNote?: string | null;
}): CbsNode {
  return {
    id: (row.cbsItemId ?? row.id) as string,
    parentId: row.parentId ?? null,
    sortOrder: row.sortOrder,
    code: row.code,
    title: row.title,
    isLeaf: row.isLeaf,
    costType: row.costType,
    unit: row.unit ?? null,
    estimatedQuantity: row.estimatedQuantity ?? null,
    pricingMode: row.pricingMode ?? null,
    unitRate: row.unitRate ?? null,
    lumpSumAmount: row.lumpSumAmount ?? null,
    supplierNote: row.supplierNote ?? null,
  };
}

export function linkNodeOf(row: {
  readonly wbsItemId: string;
  readonly cbsItemId: string;
  readonly quantity?: string | null;
  readonly allocatedAmount?: string | null;
}): LinkNode {
  return { wbsItemId: row.wbsItemId, cbsItemId: row.cbsItemId, quantity: row.quantity ?? null, allocatedAmount: row.allocatedAmount ?? null };
}
