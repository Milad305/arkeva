// تایپ‌های WBS — هم‌خوان با DTO بک‌اند (مطابق docs/rules/frontend-react.md بخش ۱۲).
// وقتی بک‌اند آماده شد، این تایپ‌ها باید دقیقاً ساختار DTO را منعکس کنند.
// مرجع: backend-nestjs.md بخش ۳.۳ (entity WbsItem با ltree) + designs/WBS.html.

import type { AvatarColorKey } from '@/modules/projects/types';

// ────────── Enums ──────────

// منبع وزن (مطابق تصمیم معماری ۳ AGENTS.md)
//   manual: ادمین دستی وارد کرده
//   auto_duration: توزیع خودکار بر اساس مدت
//   auto_even: توزیع یکنواخت بین فرزندان
export type WeightSource = 'manual' | 'auto_duration' | 'auto_even';

// وضعیت نمایشی یک آیتم — محاسبه‌شده در فرانت (مطابق statusOf در WBS.html)
//   done:      actual >= 100
//   pending:   actual === 0
//   progress:  diff (actual - planned) >= -5
//   warn:      -15 <= diff < -5
//   late:      diff < -15
export type WbsStatus = 'done' | 'progress' | 'warn' | 'late' | 'pending';

// نوع گره (برای فیلتر)
export type WbsNodeTypeFilter = 'all' | 'leaves' | 'parents';

// فرمت خروجی
export type WbsExportFormat = 'xml' | 'xlsx';

// وضعیت آپلود import
export type WbsImportState = 'dropzone' | 'validating' | 'preview' | 'importing' | 'done';

// ────────── Snapshotها ──────────

// snapshot سرپرست (مثل ProjectManagerDto) — روی leaf
export interface WbsOwnerDto {
  id: number;
  fullName: string;
  initials: string;
  avatarColor: AvatarColorKey;
}

// اتصال CBS روی یک leaf (مطابق cbs در WBS.html node)
export interface WbsCbsLinkDto {
  id: number;
  cbsCode: string; // 'CBS-007'
  cbsTitle: string; // 'قالب فلزی مدولار'
  budget: number; // میلیارد ریال
  used: number; // میلیارد ریال
}

// ────────── موجودیت اصلی ──────────

// موجودیت WBS node — مطابق entity بک‌اند (backend-nestjs.md بخش ۳.۳).
// نکته: پیشرفت planned/actual/deviation ممکن است در DTO محاسبه‌شده بیاید.
export interface WbsNodeDto {
  id: number;
  code: string; // '1.2.3.1' — برچسب انسانی پایدار، یکتا در پروژه
  title: string;

  isLeaf: boolean;

  // وزن نسبی در والد (0-100)
  weight: number;
  weightSource: WeightSource;

  // درخت (adjacency list + ltree)
  parentId: number | null;
  // materialized_path (ltree) — برای debug. در فرانت فقط اطلاعاتی است.
  path: string;
  depth: number; // 1-based (ریشه = 1)
  sortOrder: number;

  // زمان‌بندی — Gregorian ISO در DB، تبدیل شمسی در نمایش
  startDate: string | null;
  endDate: string | null;

  // فقط leaf
  quantity: number | null; // مقدار کل
  quantityUnit: string | null; // 'متر مکعب'، 'تن'، ...
  doneQuantity: number | null; // مقدار انجام‌شده
  ownerId: number | null;
  owner: WbsOwnerDto | null; // snapshot (null برای parent)

  // پیشرفت (محاسبه‌شده از فرزندان در parent)
  plannedProgress: number; // %
  actualProgress: number; // %
  deviation: number; // actual - planned

  // اتصال CBS (فقط leaf)
  cbsLinks: WbsCbsLinkDto[];

  // تعداد گزارش‌های مرتبط (برای اعتبارسنجی حذف و badge در detail)
  reportsCount: number;

  // متادیتا
  notes: string | null;
  isCritical: boolean; // انحراف بحرانی (مطابق critical در WBS.html)

  organizationId: number;
  projectId: number;
}

// گره درختی برای render — فرزندان embed شده‌اند + state کلاینت
export interface WbsTreeNode extends WbsNodeDto {
  children: WbsTreeNode[];
  // محاسبه‌شده client-side (موقع flatten)
  weightSumOfChildren: number | null; // parents: مجموع وزن فرزندان؛ leaves: null
  hasWeightMismatch: boolean; // parent: فرزندان != 100
}

// ────────── Mutation DTOها ──────────

export interface CreateWbsNodeDto {
  projectId: number;
  parentId: number | null;
  title: string;
  code: string;
  isLeaf: boolean;
  weight: number;
  weightSource?: WeightSource;
  startDate?: string | null;
  endDate?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  ownerId?: number | null;
  notes?: string | null;
}

export interface UpdateWbsNodeDto {
  title?: string;
  weight?: number;
  weightSource?: WeightSource;
  startDate?: string | null;
  endDate?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  ownerId?: number | null;
  notes?: string | null;
}

export interface ReorderWbsNodeDto {
  projectId: number;
  nodeId: number;
  newParentId: number | null;
  newSortOrder: number;
}

export interface WbsImportDto {
  projectId: number;
  fileName: string;
  // file upload واقعی در فاز بک‌اند — فعلاً فقط نام فایل برای mock
}

export interface WbsExportDto {
  projectId: number;
  format: WbsExportFormat;
}

// ────────── Aggregations ──────────

// خلاصه ساختار (toolbar summary)
export interface WbsTreeSummary {
  totalNodes: number;
  leafCount: number;
  parentCount: number;
  rootWeightSum: number; // مجموع وزن ریشه‌ها — باید 100 باشه
  hasRootWeightOk: boolean; // rootWeightSum === 100
  unbalancedParents: number; // تعداد والدهایی که فرزندانشون != 100
}

// فیلترها (toolbar)
export interface WbsFilters {
  search: string;
  status: WbsStatus | 'all';
  ownerId: number | 'all';
  nodeType: WbsNodeTypeFilter;
}

export const DEFAULT_WBS_FILTERS: WbsFilters = {
  search: '',
  status: 'all',
  ownerId: 'all',
  nodeType: 'all',
};

// نتیجه اعتبارسنجی import (مطابق Modals.html #m-upload state 2)
export interface WbsImportValidation {
  totalDetected: number;
  emptyWeights: number; // آیتم‌های بدون وزن
  weightSumWarnings: Array<{ level: number; sum: number }>;
  duplicateCodes: string[];
  errors: string[];
  // ۱۰ آیتم اول برای preview
  preview: Array<{ code: string; title: string; weight: number | null }>;
}

// نتیجه اعتبارسنجی حذف (مطابق قاعده ۵.۶ AGENTS.md)
export interface WbsDeleteCheck {
  canDelete: boolean;
  reason: string | null; // پیام فارسی برای کاربر
  counts: {
    children: number;
    reports: number;
    cbsLinks: number;
  };
}
