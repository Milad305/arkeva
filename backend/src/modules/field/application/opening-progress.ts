import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, UnauthorizedError } from '../../../platform/http/errors.js';
import { PlanningService } from '../../planning/index.js';
import { FieldReport, FieldReportItem } from '../domain/field.entities.js';
import { InvalidValues, type ValuesInput, valuesFor } from '../domain/values.js';
import { leafForEntry } from './field-reads.js';
import { FieldRecords } from './field-records.js';
import { ReportPipeline } from './report-pipeline.js';

// پیشرفت اولیهٔ ورود MSP (msp-integration.md ۷.۲؛ OD-16): یک گزارش `import_opening` با یک آیتم برای هر برگ انتخاب‌شده،
// تأییدشده با همان عمل «ساخت» برنامه‌ریز (استثنای منع خودتأییدی؛ تأیید با ReportPipeline). بی عکس و GPS. حذفش فقط در
// بازگردانی ورود و با تابع پایگاه داده‌ای که جز همین منبع را پاک نمی‌کند.

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

@Injectable()
export class OpeningProgress {
  constructor(
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly planning: PlanningService,
    private readonly records: FieldRecords,
    private readonly pipeline: ReportPipeline,
  ) {}

  /** درون تراکنش ساخت ورود؛ شناسهٔ گزارش یا null اگر چیزی نبود. */
  async create(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly projectId: string;
      readonly workDate: string;
      readonly entries: readonly { wbsItemId: string; percent: number }[];
    },
  ): Promise<string | null> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const entries = input.entries.filter((entry) => entry.percent > 0);
    if (entries.length === 0) return null;
    await tx.flush();
    const leaves = new Map((await this.planning.currentItems(input.projectId, tx)).map((leaf) => [leaf.id, leaf]));
    const now = this.clock.now();
    const note = 'پیشرفت اولیه از فایل';
    const report = tx.create(FieldReport, {
      id: newId(),
      orgId: input.orgId,
      projectId: input.projectId,
      source: 'import_opening',
      authorUserId: actor.userId,
      workDate: input.workDate,
      reportNo: await this.records.nextReportNo(tx, input.orgId, now),
      deviceRecordedAt: now,
      serverReceivedAt: now,
      appVersion: null,
      gpsLat: null,
      gpsLng: null,
      gpsAccuracyM: null,
      distanceFromSiteM: null,
      weather: null,
      temperatureC: null,
      note,
      attestedAt: null,
      flags: [],
    });
    await tx.flush();
    const items: FieldReportItem[] = [];
    for (const entry of entries) {
      const leaf = leaves.get(entry.wbsItemId);
      if (!leaf) continue;
      const shape = leafForEntry(leaf);
      const percent = Math.min(100, entry.percent);
      let values: ValuesInput;
      if (shape.measurementMethod === 'quantity') values = { quantityToday: round(((shape.totalQuantity ?? 0) * percent) / 100, 4) };
      else if (shape.measurementMethod === 'steps') {
        // گام‌ها به ترتیب پر می‌شوند تا درصد برسد؛ گام ناقص درصد خودش را می‌گیرد (۷.۲)
        let left = percent;
        const steps: Record<string, number> = {};
        for (const step of shape.steps ?? []) {
          const share = Math.min(step.weight, Math.max(0, left));
          steps[step.key] = step.weight > 0 ? round((share / step.weight) * 100, 2) : 0;
          left -= share;
        }
        values = { steps };
      } else values = { reportedPercent: round(percent, 2) };
      let parsed;
      try {
        parsed = valuesFor(shape, values);
      } catch (error) {
        if (error instanceof InvalidValues) throw new DomainError('MSP_IMPORT_INVALID', 422, { reason: `«${leaf.title}»: ${error.message}` });
        throw error;
      }
      items.push(
        tx.create(FieldReportItem, {
          id: newId(),
          orgId: input.orgId,
          projectId: input.projectId,
          reportId: report.id,
          wbsItemId: leaf.id,
          ...parsed,
          status: 'submitted',
          currentStage: null,
          flags: [],
          resolution: null,
          supersedesItemId: null,
          crewCount: null,
          note,
          approvedAt: null,
        }),
      );
    }
    await tx.flush();
    await this.pipeline.opening(tx, { report, items, note });
    return report.id;
  }

  /** بازگردانی ورود (AC-MS-04): گزارش و آیتم‌ها و بررسی‌هایش با هم (cascade). */
  async remove(tx: EntityManager, reportId: string): Promise<void> {
    await tx.flush();
    await tx.getConnection().execute('select delete_opening_report(?) as n', [reportId], 'all', tx.getTransactionContext());
  }

  /** شمار گزارش‌های پروژه جز گزارش پیشرفت اولیه (شرط بازگردانی؛ W49). */
  async otherReports(em: EntityManager, projectId: string, exceptReportId: string | null): Promise<number> {
    return em.count(FieldReport, { projectId, ...(exceptReportId ? { id: { $ne: exceptReportId } } : {}) });
  }
}
