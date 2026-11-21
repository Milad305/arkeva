import type { RiskLevel, WbsProgressStatus } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent } from '@/shared/types/api';
import type { PersonRef } from '@/modules/projects/types';
import type { SCurvePoint } from '@/modules/charts/types';
import type { PendingApprovalDto } from '@/modules/reports/types';

// W05 — داشبورد سازمان (`features/charts.md` ۶.۱). F17 لایهٔ خواندن است: همهٔ اعداد
// از `ProjectProgress`، صف تأیید (F09) و دفتر ریسک (F14) می‌آیند و تجمیع ساده‌شان
// (شمارش، میانگین ساده) در سرور انجام می‌شود (`03` ۴، ب24).

export interface DashboardKpis {
  activeCount: number;
  totalCount: number;
  /** تغییر نسبت به ماه گذشته — مثل W07 (تصمیم 1405/08/15). */
  activeDelta: number | null;
  /** «در خطر» = انحراف ≤ −۱۵ یا CPI < ۰٫۹ (ب24). */
  atRiskCount: number;
  atRiskDelta: number | null;
  /** میانگین **ساده** پروژه‌های فعال `[تأییدشده]`. */
  avgActualPercent: Percent | null;
  avgPlannedPercent: Percent | null;
  avgActualDelta: number | null;
  /** دسته‌بندی سرور برای رنگ حلقه — همان آستانه‌های ۰۰ ۴.۴. */
  avgStatus: WbsProgressStatus | null;
}

export interface DashboardProjectRow {
  id: EntityId;
  code: string;
  name: string;
  clientName: string;
  projectTypeId: string;
  plannedPercent: Percent;
  actualPercent: Percent;
  deviation: Percent;
  /** وضعیت پیشرفت پروژه از سرور (۰۰ ۴.۴). */
  status: WbsProgressStatus;
  atRisk: boolean;
}

export interface DashboardRiskDto {
  id: EntityId;
  projectId: EntityId;
  projectName: string;
  code: string;
  title: string;
  score: number;
  level: RiskLevel;
  owner: PersonRef;
}

/** خانهٔ ماتریس ۵×۵ — شمار ریسک‌های باز با همین احتمال و اثر. */
export interface RiskMatrixCell {
  probability: number;
  impact: number;
  count: number;
  /** سطح خانه از امتیاز احتمال × اثر (risk.md)؛ سرور می‌دهد. */
  level: RiskLevel;
}

export interface DashboardDto {
  generatedAt: IsoInstant;
  /** تاریخ داده‌ای که میانگین‌ها و «امروز» نمودار روند روی آن است. */
  dataDate: IsoDate | null;
  kpis: DashboardKpis;
  /** پروژه‌های فعال کاربر. */
  projects: DashboardProjectRow[];
  /** میانگین ساده snapshotهای پروژه‌های فعال (تصمیم 1405/08/15). */
  trend: SCurvePoint[];
  /** فقط برای تأییدکننده‌ها؛ وگرنه `null`. */
  pendingApprovals: { total: number; overdue: number; overdueHours: number; items: PendingApprovalDto[] } | null;
  /** فقط با `risk.view`. فهرست = بالا و بحرانی (charts.md ۶.۱). */
  risks: { totalOpen: number; items: DashboardRiskDto[]; matrix: RiskMatrixCell[] } | null;
}
