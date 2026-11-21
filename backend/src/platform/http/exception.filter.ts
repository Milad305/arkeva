import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConnectionException, DeadlockException, LockWaitTimeoutException, OptimisticLockError } from '@mikro-orm/core';
import type { ApiErrorBody, ErrorCode } from '@projeyar/shared';
import type { Response } from 'express';
import { AppContext } from '../context/app-context.js';
import { DomainError } from './errors.js';
import { messageFor } from './messages.fa.js';

// تبدیل هر خطا به قالب `{code, message(fa), details?, traceId, retryable}` (docs/backend/06 ۶).
// خطای ۵۰۰ هیچ پیام داخلی، stack یا SQL به بیرون نمی‌دهد و کد پیگیری‌اش در لاگ است (AC-PL-10).

const HTTP_CODE: Readonly<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_REQUIRED',
  [HttpStatus.FORBIDDEN]: 'PERMISSION_DENIED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'VALIDATION_FAILED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'DEPENDENCY_UNAVAILABLE',
};

interface Mapped {
  readonly status: HttpStatus;
  readonly code: ErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly retryable: boolean;
}

export function mapError(error: unknown): Mapped | null {
  if (error instanceof DomainError) {
    return { status: error.status, code: error.code, details: error.details, retryable: error.retryable };
  }
  if (error instanceof OptimisticLockError) {
    return { status: HttpStatus.CONFLICT, code: 'VERSION_CONFLICT', retryable: false };
  }
  if (error instanceof LockWaitTimeoutException || error instanceof DeadlockException) {
    return { status: HttpStatus.CONFLICT, code: 'LOCK_TIMEOUT', retryable: true };
  }
  if (error instanceof ConnectionException) {
    return { status: HttpStatus.SERVICE_UNAVAILABLE, code: 'DEPENDENCY_UNAVAILABLE', retryable: true };
  }
  if (error instanceof HttpException) {
    const status: HttpStatus = error.getStatus();
    const code = HTTP_CODE[status];
    if (code) return { status, code, retryable: status === HttpStatus.TOO_MANY_REQUESTS || status >= HttpStatus.INTERNAL_SERVER_ERROR };
  }
  return null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  constructor(private readonly context: AppContext) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const traceId = this.context.traceId;
    const mapped = mapError(exception);

    if (!mapped) {
      this.logger.error({ traceId, err: exception }, 'unhandled error');
    }

    const { status, code, details, retryable } = mapped ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL' as const,
      retryable: true,
    };
    const body: ApiErrorBody = {
      code,
      message: messageFor(code, details),
      ...(details ? { details: { ...details } } : {}),
      traceId,
      retryable,
    };
    if (status === HttpStatus.TOO_MANY_REQUESTS || code === 'OTP_RESEND_TOO_SOON') {
      const retryAfter = details?.['retryAfterSec'];
      if (typeof retryAfter === 'number') response.setHeader('Retry-After', String(retryAfter));
    }
    response.setHeader('X-Trace-Id', traceId);
    response.status(status).json(body);
  }
}
