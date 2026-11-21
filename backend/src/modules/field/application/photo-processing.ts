import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import exifr from 'exifr';
import sharp from 'sharp';
import { Clock } from '../../../platform/clock/clock.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { ObjectStorage } from '../../../platform/storage/object-storage.js';
import { FieldPhoto } from '../domain/field.entities.js';

// پردازش پس‌زمینهٔ عکس (F20 ۷؛ تصمیم 1405/08/24 با برش ۱۱): بندانگشتی ۳۲۰ و ۱۲۸۰ پیکسل (ضلع بزرگ) بی متادیتا، و EXIF فقط ثبت
// (زمان، دستگاه، مختصات). نسخهٔ اصلی دست نمی‌خورد. کار صف بعد از commit تکمیل بارگذاری؛ تکرار بی‌اثر.

export const PHOTO_PROCESS_QUEUE: QueueDef = {
  name: 'field.photo-process',
  policy: 'standard',
  retryLimit: 3,
  retryDelaySec: 30,
  retryBackoff: true,
  expireInSeconds: 300,
  priority: 10,
  concurrency: 2,
};

export const THUMB_SIZES = { small: 320, large: 1280 } as const;

interface PhotoJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
  readonly photoId: string;
}

/** EXIF مجاز برای ثبت؛ نمایش موقعیت دقیق فقط برای نقش‌های مجاز (F20 ۷) — با صفحهٔ عکس. */
export async function exifOf(body: Buffer): Promise<Record<string, unknown> | null> {
  try {
    const raw = (await exifr.parse(body, { gps: true, pick: ['DateTimeOriginal', 'Make', 'Model', 'latitude', 'longitude', 'GPSHPositioningError'] })) as
      Record<string, unknown> | undefined;
    if (!raw) return null;
    const taken = raw['DateTimeOriginal'];
    return {
      takenAt: taken instanceof Date ? taken.toISOString() : null,
      make: typeof raw['Make'] === 'string' ? raw['Make'] : null,
      model: typeof raw['Model'] === 'string' ? raw['Model'] : null,
      lat: typeof raw['latitude'] === 'number' ? raw['latitude'] : null,
      lng: typeof raw['longitude'] === 'number' ? raw['longitude'] : null,
      accuracyM: typeof raw['GPSHPositioningError'] === 'number' ? raw['GPSHPositioningError'] : null,
    };
  } catch {
    return null;
  }
}

/** بندانگشتی JPEG بی متادیتا (sharp پیش‌فرض متادیتا را نمی‌نویسد). */
export function thumbnail(body: Buffer, size: number): Promise<Buffer> {
  return sharp(body).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

@Injectable()
export class PhotoProcessing implements OnModuleInit {
  private readonly logger = new Logger('PhotoProcessing');

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
    private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    this.jobs.work<PhotoJob>(PHOTO_PROCESS_QUEUE, (job) => this.process(job.data.projectId, job.data.photoId));
  }

  /** درون تراکنش تکمیل بارگذاری؛ اجرا پس از commit. */
  async enqueue(tx: EntityManager, photo: { readonly orgId: string; readonly projectId: string; readonly id: string }): Promise<void> {
    await this.jobs.send(tx, PHOTO_PROCESS_QUEUE, { orgId: photo.orgId, projectId: photo.projectId, photoId: photo.id }, { singletonKey: photo.id });
  }

  async process(projectId: string, photoId: string): Promise<void> {
    const photo = await this.em.findOne(FieldPhoto, { id: photoId, projectId });
    if (!photo || photo.uploadStatus !== 'complete' || photo.processedAt) return;
    const body = await this.storage.get(photo.storageKey);
    if (!body) return;
    const thumbs = await this.thumbnails(photo.id, photo.storageKey, body);
    await this.em.nativeUpdate(
      FieldPhoto,
      { id: photo.id },
      { thumbSmallKey: thumbs?.small ?? null, thumbLargeKey: thumbs?.large ?? null, exif: await exifOf(body), processedAt: this.clock.now() },
    );
  }

  /** فایل خراب یا قالب ناشناخته (مثلاً HEIC بی رمزگشا): نسخهٔ اصلی می‌ماند، بندانگشتی نه. */
  private async thumbnails(photoId: string, key: string, body: Buffer): Promise<{ small: string; large: string } | null> {
    try {
      const small = `${key}-t${THUMB_SIZES.small}`;
      const large = `${key}-t${THUMB_SIZES.large}`;
      await this.storage.put(small, await thumbnail(body, THUMB_SIZES.small), 'image/jpeg');
      await this.storage.put(large, await thumbnail(body, THUMB_SIZES.large), 'image/jpeg');
      return { small, large };
    } catch (error) {
      this.logger.warn({ err: error, photoId }, 'thumbnail failed');
      return null;
    }
  }
}
