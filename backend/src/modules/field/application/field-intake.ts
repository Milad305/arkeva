import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { distanceM } from '../../computation/index.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { FieldPhoto, FieldReport, FieldReportItem } from '../domain/field.entities.js';
import { InvalidValues, type ItemValues, type LeafForEntry, reportMethodOf, valuesFor, type ValuesInput } from '../domain/values.js';
import { leafForEntry } from './field-reads.js';
import { FieldRecords } from './field-records.js';
import { createPhoto, type RevisionPhotoInput } from './field-photos.js';
import { ReportPipeline } from './report-pipeline.js';

// دریافت گزارش کارگاه (F08 داده؛ D10) و ثبت دستی وب (G10؛ approval-workflow.md ۵.۳). API همگام‌سازی اپ (مرحلهٔ ۴) همین
// FieldIntake.receive را می‌پیچد (تصمیم کاربر 1405/08/23). محتوا اینجا ساخته می‌شود و خط پردازش با ReportPipeline.

export interface AppReportInput {
  /** شناسهٔ ساخته‌شده در گوشی؛ دریافت دوباره بی‌اثر است (D10). */
  readonly id: string;
  readonly projectId: string;
  readonly authorUserId: string;
  readonly workDate: string;
  readonly deviceRecordedAt: Date;
  readonly appVersion?: string | null;
  readonly gps?: { readonly lat: number; readonly lng: number; readonly accuracyM?: number | null } | null;
  readonly weather?: string | null;
  readonly temperatureC?: number | null;
  readonly note?: string | null;
  readonly attested?: boolean;
  readonly deviceFlags?: readonly string[];
  readonly items: readonly {
    readonly id: string;
    readonly wbsItemId: string;
    readonly values: ValuesInput;
    readonly crewCount?: number | null;
    readonly note?: string | null;
  }[];
  readonly photos?: readonly {
    readonly id: string;
    readonly itemId: string | null;
    readonly sha256: string;
    readonly takenAt: Date;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly accuracyM?: number | null;
    readonly caption?: string | null;
    readonly uploaded: boolean;
  }[];
}

const invalid = (reason: string) => new DomainError('FIELD_ENTRY_INVALID', 422, { reason });

/** ساعت گوشی بیش از ۵ دقیقه جلوتر از سرور (field-app.md ۶ `[تأییدشده]`). */
export const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * پرچم‌های گزارش: پرچم گوشی (مکان جعلی) به‌علاوهٔ آنچه سرور خودش می‌سنجد (field-app.md ۶): ساعت گوشی جلوتر و عکسی که روزش
 * با تاریخ کار نمی‌خواند. همه مانع تأیید خودکارند، نه رد (F09 ۳.۲).
 */
export function serverFlags(input: Pick<AppReportInput, 'deviceRecordedAt' | 'workDate' | 'photos' | 'deviceFlags'>, now: Date): string[] {
  const flags = new Set(input.deviceFlags ?? []);
  if (input.deviceRecordedAt.getTime() - now.getTime() > CLOCK_SKEW_MS) flags.add('clock_skew');
  if ((input.photos ?? []).some((photo) => tehranClock(photo.takenAt).date !== input.workDate)) flags.add('photo_time_mismatch');
  return [...flags];
}
const notAllowed = (reason: string) => new ConflictError('FIELD_ENTRY_NOT_ALLOWED', { reason });

@Injectable()
export class FieldIntake {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
    private readonly records: FieldRecords,
    private readonly pipeline: ReportPipeline,
  ) {}

  /** گزارش اپ (F08). پروژهٔ غیرفعال گزارش نمی‌پذیرد (approval-workflow.md ۹.۴). */
  async receive(input: AppReportInput): Promise<{ reportId: string; reportNo: string; duplicate: boolean }> {
    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(FieldReport, { id: input.id });
      if (existing) return { reportId: existing.id, reportNo: existing.reportNo, duplicate: true };
      const project = await this.rules.of(input.projectId, tx);
      if (project.status !== 'active') throw notAllowed('پروژه فعال نیست و گزارش تازه نمی‌پذیرد.');
      const now = this.clock.now();
      if (input.workDate > tehranClock(now).date) throw invalid('تاریخ کار نمی‌تواند در آینده باشد.');
      if (input.items.length === 0) throw invalid('گزارش آیتمی ندارد.');
      if (new Set(input.items.map((item) => item.wbsItemId)).size !== input.items.length) throw invalid('هر فعالیت در هر گزارش یک بار می‌آید (OD-15).');
      const leaves = new Map((await this.planning.currentItems(input.projectId, tx)).map((item) => [item.id, item]));
      const deviceFlags = serverFlags(input, now);
      const site = project.siteLat !== null && project.siteLng !== null ? { lat: project.siteLat, lng: project.siteLng } : null;
      const report = tx.create(FieldReport, {
        id: input.id,
        orgId: project.orgId,
        projectId: project.id,
        source: 'app',
        authorUserId: input.authorUserId,
        workDate: input.workDate,
        reportNo: await this.records.nextReportNo(tx, project.orgId, now),
        deviceRecordedAt: input.deviceRecordedAt,
        serverReceivedAt: now,
        appVersion: input.appVersion ?? null,
        gpsLat: input.gps?.lat ?? null,
        gpsLng: input.gps?.lng ?? null,
        gpsAccuracyM: input.gps?.accuracyM ?? null,
        distanceFromSiteM: site && input.gps ? distanceM(site, input.gps) : null,
        weather: input.weather ?? null,
        temperatureC: input.temperatureC ?? null,
        note: input.note ?? null,
        attestedAt: input.attested ? input.deviceRecordedAt : null,
        flags: deviceFlags,
      });
      await tx.flush();
      const removed = new Set<string>();
      const items = input.items.map((entry) => {
        const leaf = leaves.get(entry.wbsItemId);
        let values: ItemValues;
        if (!leaf) {
          // برگ حذف‌شده: محتوا نگه داشته می‌شود و approvals آن را needs_resolution می‌کند (۴.۸)
          removed.add(entry.wbsItemId);
          values = inferValues(entry.values);
        } else values = this.values(leafForEntry(leaf), entry.values);
        return tx.create(FieldReportItem, {
          id: entry.id,
          orgId: project.orgId,
          projectId: project.id,
          reportId: report.id,
          wbsItemId: entry.wbsItemId,
          ...values,
          status: 'submitted',
          currentStage: null,
          flags: [],
          resolution: null,
          supersedesItemId: null,
          crewCount: entry.crewCount ?? null,
          note: entry.note ?? null,
          approvedAt: null,
        });
      });
      await tx.flush();
      const photos = (input.photos ?? []).map((photo) => createPhoto(tx, report, site, photo, photo.itemId, photo.uploaded));
      await tx.flush();
      await this.outbox.emit(tx, {
        type: 'FieldReportReceived',
        projectId: project.id,
        payload: { v: 1, reportId: report.id, reportNo: report.reportNo, itemCount: items.length, source: 'app' },
      });
      await this.pipeline.received(tx, { report, items, photos, removedLeafIds: removed, deviceFlags });
      return { reportId: report.id, reportNo: report.reportNo, duplicate: false };
    });
  }

  /** پایان بارگذاری یک عکس (D10). وقتی عکس در انتظاری نماند، آیتم‌ها وارد بررسی می‌شوند (AC-AP-05). */
  async photoUploaded(projectId: string, photoId: string): Promise<void> {
    await this.em.transactional((tx) => this.markPhotoUploaded(tx, projectId, photoId, null));
  }

  /** درون تراکنش تکمیل بارگذاری (F20 ۷): کلید نهایی، وضعیت کامل و اگر آخرین عکس گزارش بود ورود به خط تأیید (D10). */
  async markPhotoUploaded(tx: EntityManager, projectId: string, photoId: string, storageKey: string | null): Promise<void> {
    const photo = await tx.findOne(FieldPhoto, { id: photoId, projectId });
    if (!photo) throw new NotFoundError('FIELD_REPORT_NOT_FOUND');
    if (photo.uploadStatus === 'complete') return;
    Object.assign(photo, { uploadStatus: 'complete', ...(storageKey ? { storageKey } : {}) });
    await tx.flush();
    if ((await tx.count(FieldPhoto, { reportId: photo.reportId, uploadStatus: 'pending' })) > 0) return;
    await this.pipeline.photosCompleted(tx, await this.records.report(tx, projectId, photo.reportId));
  }

  /**
   * ارسال دوباره پس از درخواست اصلاح (approval-workflow.md ۴.۵؛ AC-AP-07). عکس‌های تازهٔ اصلاح (field-app.md ۴.۷؛ AC-FA-09؛
   * تصمیم 1405/08/30) مثل عکس گزارش ثبت می‌شوند و جدا با `/uploads` می‌آیند؛ تا رسیدنشان آیتم منتظر عکس می‌ماند.
   * تکرار همان درخواست (پاسخ گم‌شده در گوشی) وقتی همهٔ عکس‌هایش پیش‌تر برای همین آیتم ثبت شده‌اند بی‌اثر است.
   */
  async resubmit(
    projectId: string,
    itemId: string,
    input: {
      readonly authorUserId: string;
      readonly values: ValuesInput;
      readonly note?: string | null;
      readonly photos?: readonly RevisionPhotoInput[];
    },
  ): Promise<void> {
    await this.em.transactional(async (tx) => {
      const item = await this.records.lockItem(tx, projectId, itemId);
      const report = await this.records.report(tx, projectId, item.reportId);
      if (report.authorUserId !== input.authorUserId) throw notAllowed('فقط نویسندهٔ گزارش آن را دوباره می‌فرستد.');
      const photos = input.photos ?? [];
      const existing = photos.length === 0 ? [] : await tx.find(FieldPhoto, { id: { $in: photos.map((photo) => photo.id) } });
      if (existing.some((photo) => photo.itemId !== item.id)) throw invalid('شناسهٔ عکس تکراری است.');
      if (item.status !== 'needs_revision') {
        if (photos.length > 0 && existing.length === photos.length) return;
        throw notAllowed('این آیتم منتظر اصلاح نیست.');
      }
      const leaf = (await this.planning.currentItems(projectId, tx)).find((entry) => entry.id === item.wbsItemId);
      if (!leaf) throw notAllowed('این فعالیت دیگر در برنامه نیست.');
      Object.assign(item, this.values(leafForEntry(leaf), input.values), {
        revisionCount: item.revisionCount + 1,
        ...(input.note !== undefined ? { note: input.note } : {}),
      });
      const known = new Set(existing.map((photo) => photo.id));
      const fresh = photos.filter((photo) => !known.has(photo.id));
      if (fresh.length > 0) {
        const project = await this.rules.of(projectId, tx);
        const site = project.siteLat !== null && project.siteLng !== null ? { lat: project.siteLat, lng: project.siteLng } : null;
        for (const photo of fresh) createPhoto(tx, report, site, photo, item.id, false);
      }
      await tx.flush();
      await this.pipeline.resubmitted(tx, report, item);
    });
  }

  /** `POST /projects/:pid/field-reports/manual` — G10؛ فقط پروژهٔ فعال (OD-F09-01)؛ تاریخ آینده رد (۹.۷). */
  async manual(
    projectId: string,
    input: { readonly wbsItemId: string; readonly workDate: string; readonly note: string; readonly values: ValuesInput },
  ): Promise<{ reportId: string }> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const note = input.note.trim();
    if (note.length < 3) throw invalid('یادداشت ثبت دستی لازم است: بنویسید این پیشرفت از کجا آمده است.');
    return this.em.transactional(async (tx) => {
      const project = await this.rules.of(projectId, tx);
      if (project.status !== 'active') throw notAllowed('ثبت دستی فقط در پروژهٔ فعال پذیرفته می‌شود.');
      const now = this.clock.now();
      if (input.workDate > tehranClock(now).date) throw invalid('تاریخ کار نمی‌تواند در آینده باشد.');
      const leaf = (await this.planning.currentItems(projectId, tx)).find((entry) => entry.id === input.wbsItemId);
      if (!leaf) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
      const values = this.values(leafForEntry(leaf), input.values);
      const report = tx.create(FieldReport, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        source: 'web_manual',
        authorUserId: actor.userId,
        workDate: input.workDate,
        reportNo: await this.records.nextReportNo(tx, project.orgId, now),
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
      const item = tx.create(FieldReportItem, {
        id: newId(),
        orgId: project.orgId,
        projectId,
        reportId: report.id,
        wbsItemId: leaf.id,
        ...values,
        status: 'submitted',
        currentStage: null,
        flags: [],
        resolution: null,
        supersedesItemId: null,
        crewCount: null,
        note,
        approvedAt: null,
      });
      await tx.flush();
      await this.outbox.emit(tx, {
        type: 'FieldReportReceived',
        projectId,
        payload: { v: 1, reportId: report.id, reportNo: report.reportNo, itemCount: 1, source: 'web_manual' },
      });
      await this.pipeline.received(tx, { report, items: [item], photos: [], removedLeafIds: new Set(), deviceFlags: [] });
      return { reportId: report.id };
    });
  }

  private values(leaf: LeafForEntry, input: ValuesInput): ItemValues {
    try {
      reportMethodOf(leaf);
      return valuesFor(leaf, input);
    } catch (error) {
      if (error instanceof InvalidValues) throw invalid(error.message);
      throw error;
    }
  }
}

function inferValues(input: ValuesInput): ItemValues {
  if (input.quantityToday !== undefined && input.quantityToday !== null) {
    return { method: 'quantity', quantityToday: input.quantityToday, reportedPercent: null, reportedQuantityInfo: null, stepsProgress: null };
  }
  if (input.steps) return { method: 'steps', quantityToday: null, reportedPercent: null, reportedQuantityInfo: null, stepsProgress: { ...input.steps } };
  return {
    method: 'percent',
    quantityToday: null,
    reportedPercent: input.reportedPercent ?? 0,
    reportedQuantityInfo: input.reportedQuantityInfo ?? null,
    stepsProgress: null,
  };
}
