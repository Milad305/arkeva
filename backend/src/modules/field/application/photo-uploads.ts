import { Injectable, type OnModuleInit } from '@nestjs/common';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError } from '../../../platform/http/errors.js';
import { UploadKinds } from '../../../platform/storage/upload-kinds.js';
import { FieldPhoto, FieldReport } from '../domain/field.entities.js';
import { FieldIntake } from './field-intake.js';
import { PhotoProcessing } from './photo-processing.js';

// نوع فایل «عکس» (F20 ۷؛ D10؛ AC-PL-06، AC-PL-07): فقط نویسندهٔ گزارش با report.submit برای عکس در انتظار همان پروژه؛ هش
// فایل باید همان هش ثبت‌شدهٔ گوشی باشد؛ تکمیل ← کلید نهایی و ورود گزارش به خط تأیید. دیدن عکس: report.view یا نویسنده.

/** F20 ۷ `[تأییدشده]`. */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

@Injectable()
export class PhotoUploads implements OnModuleInit {
  constructor(
    private readonly kinds: UploadKinds,
    private readonly context: AppContext,
    private readonly intake: FieldIntake,
    private readonly processing: PhotoProcessing,
  ) {}

  private has(projectId: string, code: 'report.submit' | 'report.view'): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has(code) ?? false));
  }

  onModuleInit(): void {
    this.kinds.register('photo', {
      maxBytes: PHOTO_MAX_BYTES,
      contentTypes: PHOTO_TYPES,
      authorizeUpload: async (em, request) => {
        if (!request.subjectId) throw new DomainError('UPLOAD_INVALID', 422, { reason: 'شناسهٔ عکس گزارش لازم است.' });
        const photo = await em.findOne(FieldPhoto, { id: request.subjectId, projectId: request.projectId });
        if (!photo) throw new DomainError('UPLOAD_INVALID', 422, { reason: 'این عکس در گزارش‌های این پروژه نیست.' });
        const report = await em.findOne(FieldReport, { id: photo.reportId, projectId: request.projectId });
        if (!report || report.authorUserId !== request.userId || !this.has(request.projectId, 'report.submit')) throw new ForbiddenError();
        if (photo.uploadStatus === 'complete') throw new ConflictError('UPLOAD_INVALID', { reason: 'این عکس پیش‌تر کامل بارگذاری شده است.' });
        return { expectedSha256: photo.sha256 };
      },
      authorizeRead: async (em, file, userId) => {
        if (this.has(file.projectId, 'report.view')) return;
        const photo = file.subjectId ? await em.findOne(FieldPhoto, { id: file.subjectId }) : null;
        const report = photo ? await em.findOne(FieldReport, { id: photo.reportId }) : null;
        if (report?.authorUserId !== userId) throw new ForbiddenError();
      },
      completed: async (tx, file) => {
        await this.intake.markPhotoUploaded(tx, file.projectId, file.subjectId as string, file.storageKey);
        await this.processing.enqueue(tx, { orgId: file.orgId, projectId: file.projectId, id: file.subjectId as string });
      },
    });
  }
}
