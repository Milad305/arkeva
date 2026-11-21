import type { ErrorCode } from '@projeyar/shared';

// خطاهای دامنه (docs/backend/04 ۷). domain و application فقط این‌ها را پرتاب می‌کنند؛
// تبدیل به HTTP فقط در فیلتر سراسری است. پیام فارسی در کاتالوگ است، نه در throw.

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number = 422,
    readonly details?: Readonly<Record<string, unknown>>,
    readonly retryable = false,
  ) {
    super(code);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(code: ErrorCode = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(code, 404, details);
  }
}

export class ConflictError extends DomainError {
  constructor(code: ErrorCode, details?: Record<string, unknown>, retryable = false) {
    super(code, 409, details, retryable);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code: ErrorCode = 'AUTH_REQUIRED', details?: Record<string, unknown>) {
    super(code, 401, details);
  }
}

export class ForbiddenError extends DomainError {
  constructor(code: ErrorCode = 'PERMISSION_DENIED', details?: Record<string, unknown>) {
    super(code, 403, details);
  }
}

export class ValidationFailedError extends DomainError {
  constructor(fields: readonly FieldError[]) {
    super('VALIDATION_FAILED', 400, { fields });
  }
}

export class TooManyRequestsError extends DomainError {
  constructor(code: ErrorCode = 'RATE_LIMITED', details?: Record<string, unknown>) {
    super(code, 429, details, true);
  }
}
