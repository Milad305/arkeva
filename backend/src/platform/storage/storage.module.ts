import { Global, Injectable, Module, type OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { AppConfig } from '../../config/config.js';
import { Clock } from '../clock/clock.js';
import { AppContext } from '../context/app-context.js';
import { ForbiddenError } from '../http/errors.js';
import { OnTick, type TickHandler } from '../scheduler/ticks.js';
import { DiskStorage } from './disk-storage.js';
import { LinkSigner } from './link-signer.js';
import { ObjectStorage, partPrefix } from './object-storage.js';
import { StorageController } from './storage.controller.js';
import { UploadKinds } from './upload-kinds.js';
import { Uploads } from './uploads.js';

// ذخیره‌سازی فایل (F20 ۷). راه‌انداز از پیکربندی؛ نوع «پیوست» عمومی اینجا ثبت می‌شود (عضو پروژه با project.view)، نوع‌های
// دامنه‌ای (عکس گزارش) در ماژول خودشان.

const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
class AttachmentKind implements OnModuleInit {
  constructor(
    private readonly kinds: UploadKinds,
    private readonly context: AppContext,
  ) {}

  onModuleInit(): void {
    const member = (projectId: string) => {
      const access = this.context.access;
      if (!access?.isOrgAdmin && !access?.projects.get(projectId)?.has('project.view')) throw new ForbiddenError();
    };
    this.kinds.register('attachment', {
      maxBytes: ATTACHMENT_MAX_BYTES,
      contentTypes: null,
      authorizeUpload: (_em, request) => {
        member(request.projectId);
        return Promise.resolve({ expectedSha256: null });
      },
      authorizeRead: (_em, file) => {
        member(file.projectId);
        return Promise.resolve();
      },
      completed: () => Promise.resolve(),
    });
  }
}

/** PurgeTick: نشست‌های ناتمام منقضی و پارچه‌هایشان (F20 ۷). */
@Injectable()
@OnTick('PurgeTick')
export class ExpiredUploads implements TickHandler {
  constructor(
    private readonly orm: MikroORM,
    private readonly clock: Clock,
    private readonly storage: ObjectStorage,
  ) {}

  async onTick(): Promise<number> {
    const expired = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ id: string; org_id: string }[]>('select id, org_id from purge_expired_uploads(?)', [this.clock.now()]);
    for (const row of expired) await this.storage.deletePrefix(partPrefix(row.org_id, row.id));
    return expired.length;
  }
}

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    LinkSigner,
    {
      provide: ObjectStorage,
      inject: [AppConfig, LinkSigner, Clock],
      // SDK S3 فقط با راه‌انداز s3 بارگذاری می‌شود (دیسک بی وابستگی سنگین)
      useFactory: async (config: AppConfig, signer: LinkSigner, clock: Clock): Promise<ObjectStorage> => {
        if (config.storage.driver === 's3' && config.storage.s3) {
          const { S3Storage } = await import('./s3-storage.js');
          return new S3Storage(config.storage.s3);
        }
        return new DiskStorage(config.storage.diskRoot, signer, clock);
      },
    },
    UploadKinds,
    Uploads,
    AttachmentKind,
    ExpiredUploads,
  ],
  exports: [ObjectStorage, UploadKinds],
})
export class StorageModule {}
