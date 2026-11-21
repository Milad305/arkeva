import type { EntityId, IsoInstant } from '@/shared/types/api';

// F12 — موتور هشدار، فقط سمت خواندن (`04-alert-engine.md`، `02-domain-model.md` ۱۰).
// قاعده‌ها و ارزیابی در سرورند؛ متن راهنما (`guidance`) هم همان‌جا با مقادیر لحظهٔ
// ارزیابی ساخته و ذخیره می‌شود و اینجا فقط نمایش داده می‌شود.

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'seen' | 'resolved' | 'dismissed';

export interface AlertDto {
  id: EntityId;
  projectId: EntityId | null;
  /** برای نمایش در فهرست سطح سازمان. */
  projectName: string | null;
  /** کد قاعده، مثل `AL-PRG-02`. */
  ruleCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  subjectType: string;
  subjectId: EntityId;
  title: string;
  guidance: string;
  /** مسیر داخلی صفحهٔ اقدام. */
  actionLink: string;
  firstTriggeredAt: IsoInstant;
}

/** `GET /alerts/mine` — هشدارهای `open` و `seen` همهٔ پروژه‌های کاربر، مرتب بر شدت. */
export interface MyAlertsDto {
  total: number;
  criticalCount: number;
  items: AlertDto[];
}
