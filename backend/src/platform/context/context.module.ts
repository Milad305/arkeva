import { Global, Module } from '@nestjs/common';
import type { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { Clock } from '../clock/clock.js';
import { AppContext, newTraceId } from './app-context.js';

export interface RequestLogActor {
  readonly orgId: string;
  readonly userId: string;
}

export interface RequestLogError {
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly errorDetails?: Readonly<Record<string, unknown>>;
}

/** درخواستی که راه‌انداز کد پیگیری‌اش را گذاشته (bootstrap/app.ts) و خلاصهٔ کاربر/خطا برای لاگ روی آن ثبت می‌شود. */
export interface TracedRequest extends Request {
  traceId?: string;
  logActor?: RequestLogActor;
  logError?: RequestLogError;
}

// زمینهٔ هر درخواست با AsyncLocalStorage (nestjs-cls؛ 07 ۳). کد پیگیری همان شناسهٔ CLS است.
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (request: TracedRequest) => request.traceId ?? newTraceId(),
        setup: (cls, request: TracedRequest) => {
          cls.set('isHttp', true);
          cls.set('traceId', cls.getId());
          // برای ممیزی (F20 ۶)؛ با trust proxy همان IP واقعی کاربر
          cls.set('ip', request.ip ?? null);
        },
      },
    }),
  ],
  providers: [AppContext, Clock],
  exports: [AppContext, Clock],
})
export class ContextModule {}
