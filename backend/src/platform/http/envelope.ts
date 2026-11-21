import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, SetMetadata, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';

// قالب پاسخ موفق `{ success: true, data }` (docs/backend/06 ۳). فرانت با `unwrap` در
// `mockBaseQuery.ts` همین را باز می‌کند. سلامت و فایل پیچیده نمی‌شوند.

const RAW_RESPONSE = 'projeyar:raw-response';

/** پاسخ بدون پوشش — فقط برای /health، /ready و مانند آن. */
export const RawResponse = (): MethodDecorator & ClassDecorator => SetMetadata(RAW_RESPONSE, true);

export interface Envelope<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [context.getHandler(), context.getClass()]);
    if (raw) return next.handle();
    return next
      .handle()
      .pipe(map((data: unknown) => (data instanceof StreamableFile || data === undefined ? data : ({ success: true, data } satisfies Envelope<unknown>))));
  }
}
