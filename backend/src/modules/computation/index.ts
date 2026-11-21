// API عمومی ماژول computation (docs/backend/01 ۶). تنها جای فرمول (D07): فرمول‌های خالصی که ماژول‌های دیگر برای پیش‌نمایش
// لازم دارند و Entityهای جدول‌های مشتق. خواندن عددهای مشتق از `reads.ts` و ماژول Nest از `module.ts` (بی چرخهٔ ESM).
export { cbsShare, contingencyReserve } from './domain/formulas/budget.js';
export { type DayMode, type ScheduleSpan, scheduleSpan, type WorkCalendar } from './domain/formulas/schedule.js';
export {
  allocationState,
  amountOf,
  cbsLeafBudget,
  closingQuantity,
  divRoundHalfUp,
  linkSubBudget,
  type PricedItem,
  type PricingMode,
  quantityScaled,
} from './domain/formulas/cbs.js';
export {
  approvedQuantity,
  type LeafShape,
  leafPercent,
  plannedLeafPercent,
  type ProgressEntry,
  type ProgressStep,
  type ReportMethod,
  stepPercents,
} from './domain/formulas/progress.js';
export { bearingDeg, distanceM } from './domain/formulas/geo.js';
export { type EacMethod, evm, type ItemStatus } from './domain/formulas/evm.js';

import { PlanVersionCurve } from './domain/curve.entity.js';
import { PeriodSnapshot, ReportingPeriod } from './domain/period.entities.js';
import { COMPUTATION_ENTITY_LIST } from './domain/progress.entities.js';

export const COMPUTATION_ENTITIES = [...COMPUTATION_ENTITY_LIST, ReportingPeriod, PeriodSnapshot, PlanVersionCurve];
export const COMPUTATION_TENANT_ENTITIES = COMPUTATION_ENTITIES;
