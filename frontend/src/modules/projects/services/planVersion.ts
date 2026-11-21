import { PLAN_VERSION_KIND } from '@/config/constants';
import type { PlanVersionRef } from '../types';

// برچسب نسخه‌های برنامه (D05). کدها لاتین می‌مانند: «R3».

/** «مبنا» / «R3» — برای جاهای تنگ مثل سربرگ پروژه. */
export function versionShortLabel(version: PlanVersionRef): string {
  return version.kind === 'baseline' ? 'مبنا' : `R${version.number}`;
}

/** «برنامهٔ مبنا» / «بازنگری R3». */
export function versionLabel(version: PlanVersionRef): string {
  return version.kind === 'baseline'
    ? PLAN_VERSION_KIND.baseline
    : `${PLAN_VERSION_KIND.revision} R${version.number}`;
}
