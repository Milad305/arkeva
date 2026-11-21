import { defineEntity, p } from '@mikro-orm/postgresql';

// منحنی روزانهٔ هر نسخهٔ اعمال‌شده (charts.md ۵ `PlanVersionCurve`؛ تصمیم 1405/08/25). واقعیت: با تقویم لحظهٔ اعمال یک بار ساخته
// و دیگر عوض نمی‌شود تا خط «برنامهٔ اولیه» پس از بازنگری یا تغییر تقویم ثابت بماند (AC-CH-03).

const PlanVersionCurveSchema = defineEntity({
  name: 'PlanVersionCurve',
  tableName: 'plan_version_curve',
  properties: {
    planVersionId: p.uuid().primary(),
    date: p.date().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    plannedPercent: p.decimal('number'),
    pv: p.bigint('string'),
    cumulativeBac: p.bigint('string'),
  },
});
export class PlanVersionCurve extends PlanVersionCurveSchema.class {}
PlanVersionCurveSchema.setClass(PlanVersionCurve);
