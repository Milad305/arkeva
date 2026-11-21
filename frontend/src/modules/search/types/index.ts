import type { EntityId } from '@/shared/types/api';
import type { Tone } from '@/shared/types/tone';
import type { IconName } from '@/shared/components/ui/Icon';

// F20 — جستجوی سریع (W43؛ `features/platform.md` ۹).
// نتیجه‌ها زنده از همهٔ پروژه‌های کاربرند و فقط موضوع‌هایی را دارند که با کد دسترسی
// و دامنهٔ داده می‌بیند؛ هیچ مبلغی در نتیجه نمی‌آید.

export type SearchKind = 'wbs' | 'risk' | 'report' | 'person' | 'command';

export interface SearchResultDto {
  id: string;
  kind: SearchKind;
  /** خط اول — «۱.۲.۳.۱ · قالب‌بندی سقف طبقهٔ دوم». */
  title: string;
  /** خط دوم — پروژه، سرپرست، وضعیت. */
  subtitle: string;
  icon: IconName;
  iconTone: Tone;
  badge: { text: string; tone: Tone } | null;
  /** میان‌بر دستور، مثل `G W`. */
  shortcut: string | null;
  /** مسیر مقصد در اپ. */
  to: string;
}

export interface SearchGroupDto {
  kind: SearchKind;
  label: string;
  items: SearchResultDto[];
}

export interface SearchResponseDto {
  groups: SearchGroupDto[];
  total: number;
  /** شمار هر دسته برای تراشه‌های بالای پالت. */
  counts: Array<{ kind: SearchKind | 'all'; label: string; count: number }>;
}

/** دسترسی‌هایی که فهرست دستورها را می‌سازند (سرور با نقش کاربر می‌سنجد). */
export interface SearchAccess {
  projectCreate: boolean;
  riskCreate: boolean;
  mspImport: boolean;
  templatesView: boolean;
  reportsView: boolean;
  usersInvite: boolean;
  riskView: boolean;
  fieldReportView: boolean;
}

export interface SearchQuery {
  text: string;
  kind: SearchKind | 'all';
  access: SearchAccess;
  /** پروژهٔ باز، برای دستورهای زمینه‌ای. */
  projectId: EntityId | null;
}

/** یک بازدید اخیر — فقط در مرورگر همین کاربر می‌ماند. */
export interface RecentEntryDto {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  iconTone: Tone;
  to: string;
}
