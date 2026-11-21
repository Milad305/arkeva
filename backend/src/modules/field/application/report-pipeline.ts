import type { EntityManager } from '@mikro-orm/postgresql';
import type { ItemRecord, PhotoRecord, ReportRecord } from './field-records.js';

// field زیر approvals است: دریافت محتوا را field انجام می‌دهد و ورود به خط پردازش (approval-workflow.md ۲) را approvals
// پیاده می‌کند (وارونگی وابستگی، همان الگوی PlanContentChecks).

export interface ReceivedBatch {
  readonly report: ReportRecord;
  readonly items: readonly ItemRecord[];
  readonly photos: readonly PhotoRecord[];
  /** برگ‌هایی که در برنامهٔ جاری نیستند (حذف شده‌اند) — needs_resolution. */
  readonly removedLeafIds: ReadonlySet<string>;
  /** پرچم‌های گوشی (mock_location، clock_skew، photo_time_mismatch). */
  readonly deviceFlags: readonly string[];
}

export abstract class ReportPipeline {
  /** گزارش تازه (اپ یا ثبت دستی وب) درون تراکنش دریافت. */
  abstract received(tx: EntityManager, batch: ReceivedBatch): Promise<void>;
  /** همهٔ عکس‌های گزارش بارگذاری شدند (D10؛ AC-AP-05). */
  abstract photosCompleted(tx: EntityManager, report: ReportRecord): Promise<void>;
  /** پیشرفت اولیهٔ ورود MSP (msp-integration.md ۷.۲): تأیید همان لحظه با `auto_approve` و یادداشت. */
  abstract opening(tx: EntityManager, batch: { readonly report: ReportRecord; readonly items: readonly ItemRecord[]; readonly note: string }): Promise<void>;
  /** ارسال دوباره پس از اصلاح (۴.۵). */
  abstract resubmitted(tx: EntityManager, report: ReportRecord, item: ItemRecord): Promise<void>;
}
