// تایپ‌های پروژه — هم‌خوان با DTO بک‌اند (مطابق docs/rules/frontend-react.md بخش ۱۲).
// وقتی بک‌اند آماده شد، این تایپ‌ها باید دقیقاً ساختار DTO را منعکس کنند.

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Mountain,
  Cross,
  Sun,
  Car,
  Landmark,
  Store,
  Route,
  Factory,
} from 'lucide-react';

// ────────── Enums ──────────

export type ProjectStatus =
  | 'active'
  | 'completed'
  | 'draft'
  | 'critical'
  | 'paused';

export type ProjectType =
  | 'building'
  | 'commercial'
  | 'industrial'
  | 'road'
  | 'tunnel'
  | 'hospital'
  | 'energy'
  | 'parking'
  | 'heritage';

export type Currency = 'rial' | 'toman' | 'dollar' | 'euro';

// رنگ آواتار (مطابق designs/Projects.html avatarColors map)
export type AvatarColorKey =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'info'
  | 'gray';

// ────────── DTO objects ──────────

// مدیر پروژه — snapshot برای نمایش در لیست
export interface ProjectManagerDto {
  id: number;
  fullName: string;
  initials: string;
  avatarColor: AvatarColorKey;
}

// موجودیت پروژه — مطابق ساختار بک‌اند (Project entity)
// نکته: فیلدهای نمایشی مثل planned/actual/deviation ممکن است در DTO محاسبه‌شده بیایند.
export interface ProjectDto {
  id: number;
  code: string; // PRJ-1404-021 — یکتا در سازمان
  name: string;
  employer: string; // کارفرمای کامل
  employerShort: string; // کارفرمای مختصر (برای جدول شلوغ)
  type: ProjectType;
  status: ProjectStatus;
  manager: ProjectManagerDto;
  // پیشرفت (محاسبه‌شده از WBS)
  plannedProgress: number; // %
  actualProgress: number; // %
  deviation: number; // actual - planned، علامت‌دار
  // بودجه (به میلیارد ریال — مطابق designs، برای نمایش)
  budget: number; // کل بودجه (میلیارد ریال)
  budgetUsedPct: number; // % مصرف‌شده
  // زمان — ISO string، تبدیل به شمسی در نمایش
  startDate: string;
  endDate: string;
  // متادیتا
  memberCount: number;
  organizationId: number;
}

// ────────── Filters / pagination ──────────

export interface ProjectFilters {
  search: string;
  status: ProjectStatus | 'all';
  employer: string | 'all';
  managerId: number | 'all';
  type: ProjectType[]; // چندتایی (chip «نوع»)
  dateRange?: { from: string; to: string };
}

export interface ProjectQueryParams {
  page: number;
  pageSize: number;
  sort: ProjectSortField;
  sortDir: 'asc' | 'desc';
  filters: ProjectFilters;
}

export type ProjectSortField =
  | 'name'
  | 'plannedProgress'
  | 'actualProgress'
  | 'deviation'
  | 'endDate'
  | 'budget';

// نتیجه صفحه‌بندی‌شده
export interface ProjectListResult {
  items: ProjectDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ────────── KPI strip (محاسبه‌شده در بک‌اند) ──────────

export interface ProjectKpi {
  totalProjects: number;
  activeCount: number;
  pausedCount: number;
  draftCount: number;
  completedCount: number;
  avgProgress: number; // %
  avgProgressDelta: number; // نسبت به ماه قبل
  totalBudget: number; // میلیارد ریال
  totalBudgetUsedPct: number;
  atRiskCount: number; // انحراف > 10٪
  atRiskDelta: number; // نسبت به هفته قبل
}

// ────────── آیکن نوع پروژه ──────────

// نگاشت نوع پروژه به آیکن Lucide (مطابق designs/Projects.html icon field).
// نکته: lucide-react آیکن‌های Road/Bridge ندارد — از Route/Mountain استفاده می‌کنیم.
export const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  building: Building2,
  commercial: Store,
  industrial: Factory,
  road: Route,
  tunnel: Mountain,
  hospital: Cross,
  energy: Sun,
  parking: Car,
  heritage: Landmark,
};

// ────────── DTO mutation ──────────

export interface CreateProjectDto {
  name: string;
  code: string;
  employer: string;
  type: ProjectType;
  startDate: string; // ISO
  endDate: string; // ISO
  budget: number; // میلیارد ریال
  currency: Currency;
  managerId: number;
}

// ────────── جزئیات پروژه (Overview tab) ──────────

// اطلاعات بودجه برای stat card
export interface ProjectBudgetDto {
  totalBudget: number; // میلیارد ریال (مطابق designs)
  usedBudget: number; // میلیارد ریال
  usedPct: number; // %
}

// اطلاعات زمانی برای stat card
export interface ProjectTimelineDto {
  startDate: string; // ISO
  endDate: string; // ISO
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
}

// شاخص‌های عملکرد (EVM)
export interface ProjectKpisDto {
  cpi: number; // Cost Performance Index
  spi: number; // Schedule Performance Index
  // پیام تفسیری انسان‌خوانا (مطابق designs/Project.html)
  summary: string;
}

// aggregated snapshot برای صفحهٔ Overview — بخش‌های بالای صفحه
export interface ProjectOverviewKpis {
  progress: {
    actual: number; // %
    planned: number; // %
    deviation: number; // actual - planned
  };
  budget: ProjectBudgetDto;
  timeline: ProjectTimelineDto;
  kpis: ProjectKpisDto;
}

// ────────── آیتم بحرانی WBS (مطابق critical-wbs در Project.html) ──────────

export interface CriticalWbsItemDto {
  id: number;
  code: string; // 1.2.4
  name: string;
  plannedProgress: number; // %
  actualProgress: number; // %
  owner: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: AvatarColorKey;
  };
}

// ────────── آیتم CBS با بیشترین مصرف ──────────

export interface TopCbsItemDto {
  id: number;
  code: string; // CBS-001
  name: string;
  budget: number; // میلیارد ریال
  used: number; // میلیارد ریال
}

// ────────── Activity feed ──────────

export type ActivityFeedKind =
  | 'info'
  | 'success'
  | 'warn'
  | 'error'
  | 'primary';

export interface ActivityFeedItemDto {
  id: number;
  kind: ActivityFeedKind;
  // نام آیکن Lucide (مثلاً 'clipboard', 'check', 'alert-triangle')
  iconName: string;
  // عنوان با ذخیرهٔ بخش‌های strong/pill به‌صورت ساختاریافته
  // ساده‌ترین راه: رشتهٔ HTML-safe با قرارداد <strong>...</strong> و [[pill]]
  titleParts: Array<
    | { kind: 'text'; value: string }
    | { kind: 'strong'; value: string }
    | { kind: 'pill'; value: string }
  >;
  meta?: string;
  createdAt: string; // ISO
}

// ────────── S-Curve (منحنی پیشرفت) ──────────

export interface SCurvePointDto {
  // برچسب ماه شمسی برای نمایش روی محور X
  monthLabel: string;
  planned: number; // %
  actual: number | null; // تا امروز؛ بعد از امروز null
  forecast: number | null; // بعد از امروز؛ تا امروز null
  isToday: boolean;
}

export interface SCurveDataDto {
  points: SCurvePointDto[];
}

// ────────── تب‌های پروژه ──────────

export type ProjectTab =
  | 'overview'
  | 'wbs'
  | 'cbs'
  | 'links'
  | 'reports'
  | 'members'
  | 'charts'
  | 'settings';

// شمارش‌های روی تب‌ها (badge)
export interface ProjectTabCounts {
  reports: number;
  members: number;
}
