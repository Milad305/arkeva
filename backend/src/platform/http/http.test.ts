import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import { ERROR_CODES } from '@projeyar/shared';
import { describe, expect, it } from 'vitest';
import { traceIdFrom } from '../context/app-context.js';
import { ConflictError, DomainError } from './errors.js';
import { mapError } from './exception.filter.js';
import { MESSAGES_FA, messageFor } from './messages.fa.js';

/** docs/backend/06 ۶ — قالب و نگاشت خطا. */

describe('نگاشت خطا', () => {
  it('06 ۶ — خطای دامنه همان کد و وضعیت را نگه می‌دارد', () => {
    expect(mapError(new ConflictError('VERSION_CONFLICT'))).toEqual({
      status: 409,
      code: 'VERSION_CONFLICT',
      details: undefined,
      retryable: false,
    });
  });

  it('AC-PL-11 — قفل خوش‌بینانهٔ MikroORM به ۴۰۹ با پیام فارسی', () => {
    const mapped = mapError(OptimisticLockError.lockFailed('Project'));
    expect(mapped?.status).toBe(409);
    expect(mapped?.code).toBe('VERSION_CONFLICT');
    expect(messageFor('VERSION_CONFLICT')).toContain('کس دیگری این را تغییر داده');
  });

  it('06 ۶ — خطاهای HTTP خود Nest کد کاتالوگ می‌گیرند؛ ناشناخته‌ها ۵۰۰ می‌شوند', () => {
    expect(mapError(new NotFoundException())?.code).toBe('NOT_FOUND');
    expect(mapError(new HttpException('x', HttpStatus.TOO_MANY_REQUESTS))?.retryable).toBe(true);
    expect(mapError(new Error('boom'))).toBeNull();
  });

  it('06 ۶ — هر کد خطا پیام فارسی دارد', () => {
    for (const code of ERROR_CODES) {
      expect(MESSAGES_FA[code], code).toBeDefined();
      expect(messageFor(code)).toMatch(/[؀-ۿ]/);
    }
  });

  it('W02 — پیام قفل دقیقه را با ارقام فارسی می‌گوید', () => {
    expect(messageFor('ACCOUNT_LOCKED', { lockMinutes: 15 })).toContain('۱۵ دقیقه');
  });

  it('DomainError پیش‌فرض ۴۲۲ و غیرقابل تکرار', () => {
    const error = new DomainError('PROJECT_NOT_FOUND');
    expect([error.status, error.retryable]).toEqual([422, false]);
  });
});

describe('کد پیگیری', () => {
  it('AC-PL-10 — قالب ERR-xxxx-nn؛ مقدار نامعتبر کلاینت پذیرفته نمی‌شود', () => {
    expect(traceIdFrom(undefined)).toMatch(/^ERR-[0-9A-F]{4}-\d{2}$/);
    expect(traceIdFrom('ERR-7F3A-21')).toBe('ERR-7F3A-21');
    expect(traceIdFrom('<script>')).not.toBe('<script>');
  });
});
