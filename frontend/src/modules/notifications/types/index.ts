import type { EntityId, IsoInstant } from '@/shared/types/api';

// F13 — اعلان‌های درون‌برنامه (`features/notifications.md`، `02-domain-model.md` ۱۰).
// عنوان، متن، پیوند، دسته و ادغام را سرور می‌سازد؛ صفحه فقط نمایش می‌دهد.

/** زبانه‌های W06 (تصمیم 1405/08/15): تأییدها = NT-APR، NT-FLD، AL-APR؛ ریسک‌ها = NT-RSK؛ بقیه سیستم. */
export type NotificationCategory = 'approvals' | 'risks' | 'system';
export type NotificationTab = 'all' | NotificationCategory;

export interface NotificationDto {
  id: EntityId;
  /** کد رویداد یا قاعده. */
  code: string;
  category: NotificationCategory;
  severity: 'info' | 'warning' | 'critical' | null;
  title: string;
  body: string;
  projectId: EntityId | null;
  projectName: string | null;
  /** مسیر داخلی صفحهٔ موضوع. */
  link: string;
  createdAt: IsoInstant;
  readAt: IsoInstant | null;
  /** ادغام (۵.۳): «N اعلان تازه». */
  mergedCount: number;
}

export interface NotificationListDto {
  items: NotificationDto[];
  nextCursor: string | null;
  unreadCount: number;
  /** شمار کل هر زبانه (W06: «همه (۱۲)»). */
  counts: Record<NotificationTab, number>;
}

export interface NotificationQuery {
  tab: NotificationTab;
  unreadOnly: boolean;
  cursor: string | null;
  limit: number;
}
