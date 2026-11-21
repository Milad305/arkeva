// کاتالوگ رویدادهای دامنه (D07؛ F20 ۳؛ docs/backend/08 ۲). منبع: ماتریس ج (`design/03-interaction-matrices.md` ۵)
// به‌علاوهٔ رویدادهای تازهٔ F20 ۳.۲. هر رویداد یک منتشرکننده دارد: ماژول مالک موجودیت (F20 ۳.۳).
// تیک‌ها (`DailyTick`، …) رویداد دامنه نیستند؛ زمان‌بندی pg-boss‌اند (`TICKS` در بک‌اند).

/** ماژول‌های بک‌اند (docs/backend/11 ۵). */
export type BackendModule =
  | 'identity'
  | 'projects'
  | 'planning'
  | 'cbs'
  | 'cost-ledger'
  | 'team'
  | 'field'
  | 'approvals'
  | 'computation'
  | 'alerts'
  | 'notifications'
  | 'risks'
  | 'msp'
  | 'integrations'
  | 'reporting';

interface EventSpec {
  /** منتشرکننده(ها). فقط یک ردیف دو منتشرکننده دارد که پرسش باز است (code-mapping §۷.۳ ردیف ۱۹). */
  readonly publishers: readonly BackendModule[];
  /** ویژگی سند. */
  readonly feature: string;
}

export const DOMAIN_EVENTS = {
  FieldReportReceived: { publishers: ['field'], feature: 'F08' },
  FieldReportItemApproved: { publishers: ['approvals'], feature: 'F09' },
  FieldReportItemReturned: { publishers: ['approvals'], feature: 'F09' },
  FieldReportItemRejected: { publishers: ['approvals'], feature: 'F09' },
  FieldReportItemRevoked: { publishers: ['approvals'], feature: 'F09' },
  FieldReportItemSuperseded: { publishers: ['approvals'], feature: 'F09' },
  CostEntryPosted: { publishers: ['cost-ledger'], feature: 'F06' },
  CostsCompleteThroughChanged: { publishers: ['cost-ledger'], feature: 'F06' },
  BudgetRevisionRequested: { publishers: ['cbs'], feature: 'F05' },
  BudgetRevisionDecided: { publishers: ['cbs'], feature: 'F05' },
  PlanVersionApplied: { publishers: ['planning'], feature: 'F04' },
  ScheduleChangeProposed: { publishers: ['planning'], feature: 'F04' },
  SyncSessionApplied: { publishers: ['msp'], feature: 'F15' },
  ImportBuilt: { publishers: ['msp'], feature: 'F15' },
  ImportRolledBack: { publishers: ['msp'], feature: 'F15' },
  // تصمیم کاربر 1405/08/26: همگام‌سازی MSP تعاملی است و شکست را همان لحظه به کاربر می‌گوید؛ فقط اتصال‌های خودکار (F19)
  IntegrationFailed: { publishers: ['integrations'], feature: 'F19' },
  MspProgressExported: { publishers: ['msp'], feature: 'F15' },
  ProjectCreated: { publishers: ['projects'], feature: 'F02' },
  ProjectActivated: { publishers: ['projects'], feature: 'F02' },
  ProjectStatusChanged: { publishers: ['projects'], feature: 'F02' },
  ProjectSettingsChanged: { publishers: ['projects'], feature: 'F02' },
  ProjectManagerTransferred: { publishers: ['projects'], feature: 'F02' },
  ProjectDeletionRequested: { publishers: ['projects'], feature: 'F02' },
  ProjectDeletionCancelled: { publishers: ['projects'], feature: 'F02' },
  AssignmentChanged: { publishers: ['team'], feature: 'F07' },
  ApprovalRouteChanged: { publishers: ['team'], feature: 'F07' },
  MemberChanged: { publishers: ['team'], feature: 'F07' },
  RiskChanged: { publishers: ['risks'], feature: 'F14' },
  RiskActionChanged: { publishers: ['risks'], feature: 'F14' },
  RiskNoteMention: { publishers: ['risks'], feature: 'F14' },
  SiteIssueReported: { publishers: ['field'], feature: 'F08' },
  DeviceQueueHeartbeat: { publishers: ['field'], feature: 'F08' },
  PeriodClosed: { publishers: ['computation'], feature: 'F10' },
  ComputeFinished: { publishers: ['computation'], feature: 'F10' },
  AlertRaised: { publishers: ['alerts'], feature: 'F12' },
  AlertResolved: { publishers: ['alerts'], feature: 'F12' },
  RolePermissionChanged: { publishers: ['identity'], feature: 'F01' },
  ReportGenerated: { publishers: ['reporting'], feature: 'F18' },
  NotificationFailed: { publishers: ['notifications'], feature: 'F13' },
} as const satisfies Record<string, EventSpec>;

export type DomainEventType = keyof typeof DOMAIN_EVENTS;

export const DOMAIN_EVENT_TYPES = Object.keys(DOMAIN_EVENTS) as DomainEventType[];

export function isDomainEventType(value: string): value is DomainEventType {
  return Object.hasOwn(DOMAIN_EVENTS, value);
}

/** سقف payload رویداد (F20 ۳.۱). */
export const EVENT_PAYLOAD_MAX_BYTES = 64 * 1024;
