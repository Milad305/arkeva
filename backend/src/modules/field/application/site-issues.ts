import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { UploadKinds } from '../../../platform/storage/upload-kinds.js';
import { type IssueEffect, type IssueType, SiteIssue, SiteIssuePhoto } from '../domain/site-issue.entities.js';
import { PHOTO_MAX_BYTES } from './photo-uploads.js';

// مشکل کارگاه (M13؛ field-app.md ۴.۸؛ risk.md ۵.۳). مالک SiteIssue: field. ریسک را فراخوان (field-app) با سرویس F14 در همان
// تراکنش می‌سازد و `linkRisk` پیوند را می‌نشاند. SiteIssueReported در همان تراکنش (outbox).

export interface SiteIssueInput {
  readonly id: string;
  readonly projectId: string;
  readonly reporterUserId: string;
  readonly type: IssueType;
  readonly title: string;
  readonly description: string;
  readonly effect: IssueEffect;
  readonly wbsItemId: string | null;
  readonly deviceRecordedAt: Date;
  readonly photos: readonly { readonly id: string; readonly sha256: string; readonly takenAt: Date }[];
}

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

@Injectable()
export class SiteIssues implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly context: AppContext,
    private readonly kinds: UploadKinds,
  ) {}

  onModuleInit(): void {
    // عکس مشکل: فقط گزارش‌دهنده با هش اعلام‌شده؛ دیدن با report.view یا risk.view یا گزارش‌دهنده
    this.kinds.register('issue_photo', {
      maxBytes: PHOTO_MAX_BYTES,
      contentTypes: PHOTO_TYPES,
      authorizeUpload: async (em, request) => {
        if (!request.subjectId) throw new DomainError('UPLOAD_INVALID', 422, { reason: 'شناسهٔ عکس مشکل کارگاه لازم است.' });
        const photo = await em.findOne(SiteIssuePhoto, { id: request.subjectId, projectId: request.projectId });
        if (!photo) throw new DomainError('UPLOAD_INVALID', 422, { reason: 'این عکس در مشکل‌های کارگاه این پروژه نیست.' });
        const issue = await em.findOne(SiteIssue, { id: photo.issueId });
        if (issue?.reporterUserId !== request.userId) throw new ForbiddenError();
        if (photo.uploadStatus === 'complete') throw new ConflictError('UPLOAD_INVALID', { reason: 'این عکس پیش‌تر کامل بارگذاری شده است.' });
        return { expectedSha256: photo.sha256 };
      },
      authorizeRead: async (em, file, userId) => {
        const access = this.context.access;
        const codes = access?.projects.get(file.projectId);
        if (access?.isOrgAdmin || codes?.get('risk.view') === 'all') return;
        const photo = file.subjectId ? await em.findOne(SiteIssuePhoto, { id: file.subjectId }) : null;
        const issue = photo ? await em.findOne(SiteIssue, { id: photo.issueId }) : null;
        if (issue?.reporterUserId !== userId) throw new ForbiddenError();
      },
      completed: async (tx, file) => {
        await tx.nativeUpdate(SiteIssuePhoto, { id: file.subjectId as string }, { uploadStatus: 'complete', storageKey: file.storageKey });
      },
    });
  }

  /** همان مشکل قبلاً رسیده (ارسال دوباره، AC-RK-05). */
  find(issueId: string, em: EntityManager = this.em): Promise<SiteIssue | null> {
    return em.findOne(SiteIssue, { id: issueId });
  }

  /** درون تراکنش فراخوان؛ قفل مشورتی شناسهٔ گوشی تا دو ارسال هم‌زمان یک ردیف بسازند. */
  async lockId(tx: EntityManager, issueId: string): Promise<void> {
    await tx.getConnection().execute('select pg_advisory_xact_lock(hashtext(?))', [`site_issue:${issueId}`], 'all', tx.getTransactionContext());
  }

  async create(tx: EntityManager, orgId: string, input: SiteIssueInput): Promise<SiteIssue> {
    const now = this.clock.now();
    const issue = tx.create(SiteIssue, {
      id: input.id,
      orgId,
      projectId: input.projectId,
      reporterUserId: input.reporterUserId,
      wbsItemId: input.wbsItemId,
      type: input.type,
      title: input.title,
      description: input.description,
      effect: input.effect,
      deviceRecordedAt: input.deviceRecordedAt,
      serverReceivedAt: now,
      riskId: null,
      createdAt: now,
    });
    await tx.flush();
    for (const photo of input.photos) {
      tx.create(SiteIssuePhoto, {
        id: photo.id,
        orgId,
        projectId: input.projectId,
        issueId: issue.id,
        sha256: photo.sha256.toLowerCase(),
        storageKey: null,
        uploadStatus: 'pending',
        takenAt: photo.takenAt,
        createdAt: now,
      });
    }
    return issue;
  }

  async linkRisk(tx: EntityManager, issue: SiteIssue, riskId: string): Promise<void> {
    issue.riskId = riskId;
    await this.outbox.emit(tx, {
      type: 'SiteIssueReported',
      projectId: issue.projectId,
      payload: { v: 1, issueId: issue.id, riskId, reporterUserId: issue.reporterUserId, wbsItemId: issue.wbsItemId ?? null, effect: issue.effect },
    });
  }

  /** مشکل‌های گزارش‌شدهٔ یک سرپرست (M10؛ AC-RK-11). */
  mine(userId: string, projectIds: readonly string[]): Promise<SiteIssue[]> {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.em.find(SiteIssue, { reporterUserId: userId, projectId: { $in: [...projectIds] } }, { orderBy: { serverReceivedAt: 'desc' } });
  }

  photos(issueIds: readonly string[]): Promise<SiteIssuePhoto[]> {
    if (issueIds.length === 0) return Promise.resolve([]);
    return this.em.find(SiteIssuePhoto, { issueId: { $in: [...issueIds] } });
  }
}
