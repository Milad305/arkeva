import type { EntityManager } from '@mikro-orm/postgresql';
import { distanceM } from '../../computation/index.js';
import { FieldPhoto, type FieldReport } from '../domain/field.entities.js';

// ساخت ردیف عکس گزارش برای دریافت گزارش و ارسال دوباره (FieldIntake؛ field-app.md ۴.۷ و ۵.۲).

/** عکس تازهٔ اصلاح (`PUT /field/items/:id`). */
export interface RevisionPhotoInput {
  readonly id: string;
  readonly sha256: string;
  readonly takenAt: Date;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly accuracyM?: number | null;
  readonly caption?: string | null;
}

/** ردیف عکس گزارش؛ فایل جدا با `/uploads` می‌آید مگر `uploaded`. */
export function createPhoto(
  tx: EntityManager,
  report: FieldReport,
  site: { lat: number; lng: number } | null,
  photo: RevisionPhotoInput,
  itemId: string | null,
  uploaded: boolean,
): FieldPhoto {
  return tx.create(FieldPhoto, {
    id: photo.id,
    orgId: report.orgId,
    projectId: report.projectId,
    reportId: report.id,
    itemId,
    storageKey: `${report.orgId}/${report.projectId}/${report.id}/${photo.id}`,
    sha256: photo.sha256,
    takenAt: photo.takenAt,
    lat: photo.lat ?? null,
    lng: photo.lng ?? null,
    accuracyM: photo.accuracyM ?? null,
    distanceM: site && photo.lat != null && photo.lng != null ? distanceM(site, { lat: photo.lat, lng: photo.lng }) : null,
    caption: photo.caption ?? null,
    uploadStatus: uploaded ? 'complete' : 'pending',
    markedUnsuitable: false,
  });
}
