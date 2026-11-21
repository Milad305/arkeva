import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { type AppReportInput, FieldIntake, FieldRecords, type RevisionPhotoInput, type ValuesInput } from '../../field/index.js';

// ارسال گزارش و اصلاح از اپ (field-app.md ۵.۲؛ D10). نوشتن فقط از راه FieldIntake (مالک F08)؛ اینجا فقط زمینهٔ کاربر، دسترسی
// پروژه و شکل پاسخ. ارسال تکراری با همان UUID بی‌اثر است و همان وضعیت فعلی را برمی‌گرداند (AC-FA-01).

export type AppReportBody = Omit<AppReportInput, 'authorUserId' | 'photos' | 'deviceFlags'> & {
  readonly mockLocation?: boolean;
  readonly photos?: readonly Omit<NonNullable<AppReportInput['photos']>[number], 'uploaded'>[];
};

@Injectable()
export class AppReports {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly intake: FieldIntake,
    private readonly records: FieldRecords,
  ) {}

  private actor(projectId: string): string {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    // عضو نیست = پروژه برایش وجود ندارد (07 ۴)
    const codes = access.projects.get(projectId);
    if (!codes) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (!codes.has('report.submit')) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'report.submit' });
    return actor.userId;
  }

  /** `POST /field/reports` */
  async submit(body: AppReportBody) {
    const authorUserId = this.actor(body.projectId);
    const received = await this.intake.receive({
      ...body,
      authorUserId,
      deviceFlags: body.mockLocation ? ['mock_location'] : [],
      // عکس‌ها جدا و پس از گزارش بارگذاری می‌شوند (`/uploads`، تصمیم 1405/08/24)
      photos: (body.photos ?? []).map((photo) => ({ ...photo, uploaded: false })),
    });
    const [report] = await this.records.reports(this.em, { ids: [received.reportId] });
    if (report && report.authorUserId !== authorUserId) throw new NotFoundError('FIELD_REPORT_NOT_FOUND');
    return { ...received, ...(await this.state(body.projectId, received.reportId)) };
  }

  /** `PUT /field/items/:id` — فقط در needs_revision (F09 ۴.۵)؛ با عکس‌های تازهٔ اصلاح (AC-FA-09). */
  async resubmit(
    itemId: string,
    input: { readonly values: ValuesInput; readonly note?: string | null; readonly photos?: readonly RevisionPhotoInput[] },
  ) {
    const [item] = await this.records.items(this.em, { ids: [itemId] });
    if (!item) throw new NotFoundError('FIELD_ITEM_NOT_FOUND');
    const authorUserId = this.actor(item.projectId);
    await this.intake.resubmit(item.projectId, itemId, { authorUserId, values: input.values, note: input.note ?? null, photos: input.photos ?? [] });
    const state = await this.state(item.projectId, item.reportId);
    const updated = state.items.find((entry) => entry.id === itemId) ?? null;
    // عکس‌های همین آیتم با وضعیت بارگذاری تا گوشی بداند کدام را بفرستد
    return updated && { ...updated, photos: state.photos.filter((photo) => photo.itemId === itemId) };
  }

  /** وضعیت تازهٔ آیتم‌ها و عکس‌های گزارش برای پاسخ. */
  private async state(projectId: string, reportId: string) {
    // نقشهٔ هویت درخواست ممکن است ردیف قبل از تراکنش دریافت را داشته باشد
    this.em.clear();
    const [items, photos] = await Promise.all([this.records.items(this.em, { projectId, reportIds: [reportId] }), this.records.photos(this.em, [reportId])]);
    return {
      items: items.map((item) => ({ id: item.id, wbsItemId: item.wbsItemId, status: item.status, flags: item.flags, computedPercent: item.computedPercent })),
      photos: photos.map((photo) => ({ id: photo.id, itemId: photo.itemId ?? null, uploadStatus: photo.uploadStatus })),
    };
  }
}
