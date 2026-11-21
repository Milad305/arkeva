import type { EntityId, Percent } from '@/shared/types/api';

// W39 — ورود WBS از Excel (`features/wbs.md` ۶). همیشه به نسخهٔ کاری، دو مرحله:
// پیش‌نمایش و گزارش اعتبارسنجی، سپس تأیید (۶.۲). XML و MPP مسیر MSP است (W34، F15).

export type WbsImportMode = 'replace' | 'append';

export interface WbsImportRequest {
  projectId: EntityId;
  draftRevision: number;
  file: File;
  mode: WbsImportMode;
  /** فقط `append`: آیتمی که ردیف‌های سطح اول فایل زیرش می‌روند؛ `null` = سطح اول. */
  parentId: EntityId | null;
}

export interface WbsImportRowDto {
  row: number;
  code: string;
  title: string;
  depth: number;
  isParent: boolean;
  /** وزن پس از پخش وزن‌های خالی (۶.۲). */
  weight: Percent | null;
  weightWasEmpty: boolean;
  status: 'ok' | 'warning' | 'error' | 'skipped';
}

export interface WbsImportIssueDto {
  severity: 'ok' | 'warning' | 'error' | 'info';
  message: string;
  /** کد ردیف‌هایی که این پیام به آن‌ها مربوط است. */
  codes: string[];
}

export interface WbsImportPreviewDto {
  fileName: string;
  fileSize: number;
  mode: WbsImportMode;
  parentId: EntityId | null;
  /** ۱۰ ردیف اول (wbs.md ۸ W39). */
  rows: WbsImportRowDto[];
  totalRows: number;
  /** آیتم‌هایی که وارد می‌شوند — «بارگذاری N آیتم». */
  importCount: number;
  issues: WbsImportIssueDto[];
}
