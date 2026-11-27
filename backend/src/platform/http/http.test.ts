import { Writable } from 'node:stream';
import { type ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import { ERROR_CODES } from '@projeyar/shared';
import pino, { type LoggerOptions } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../config/config.js';
import type { AppContext } from '../context/app-context.js';
import { traceIdFrom } from '../context/app-context.js';
import type { TracedRequest } from '../context/context.module.js';
import { ConflictError, DomainError, ValidationFailedError } from './errors.js';
import { AllExceptionsFilter, mapError } from './exception.filter.js';
import {
  buildLoggerOptions,
  cleanUrlPath,
  httpLogFields,
  httpLogLevel,
  httpLogMessage,
  resolveRoutePattern,
} from './logger.options.js';
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

describe('لاگ ساختاری و ثبت خطاها (10 ۵)', () => {
  it('سطح لاگ HTTP: سلامت ۲۰x بی‌صدا، ۴xx هشدار، ۵xx و خطای /ready سطح خطا', () => {
    expect(httpLogLevel({ url: '/health' }, 200)).toBe('silent');
    expect(httpLogLevel({ url: '/ready' }, 200)).toBe('silent');
    expect(httpLogLevel({ url: '/ready' }, 503)).toBe('error');
    expect(httpLogLevel({ url: '/v1/auth/login' }, 200)).toBe('info');
    expect(httpLogLevel({ url: '/v1/auth/login' }, 422)).toBe('warn');
    expect(httpLogLevel({ url: '/v1/auth/login' }, 500)).toBe('error');
  });

  it('خلاصهٔ درخواست بدون query حساس، با الگوی مسیر و کد خطا ساخته می‌شود', () => {
    expect(cleanUrlPath('/v1/files/dl?sig=secret&exp=123')).toBe('/v1/files/dl');
    const request = {
      method: 'POST',
      baseUrl: '/v1/projects',
      route: { path: '/:projectId/reports' },
      originalUrl: '/v1/projects/01950000-0000-7000-8000-000000000001/reports?token=abc',
      url: '/01950000-0000-7000-8000-000000000001/reports?token=abc',
      ip: '138.124.3.126',
      params: { projectId: '01950000-0000-7000-8000-000000000001' },
      logActor: { orgId: 'org-1', userId: 'user-1' },
      logError: { errorCode: 'VALIDATION_FAILED', errorMessage: 'ورودی نامعتبر' },
    } as unknown as TracedRequest;

    expect(resolveRoutePattern(request)).toBe('/v1/projects/:projectId/reports');
    expect(httpLogMessage(request, 400, 12.4)).toBe(
      'POST /v1/projects/01950000-0000-7000-8000-000000000001/reports 400 VALIDATION_FAILED (12ms)',
    );
    expect(httpLogFields(request, 400, 12.4)).toEqual({
      context: 'HTTP',
      method: 'POST',
      route: '/v1/projects/:projectId/reports',
      url: '/v1/projects/01950000-0000-7000-8000-000000000001/reports',
      status: 400,
      durationMs: 12,
      ip: '138.124.3.126',
      orgId: 'org-1',
      userId: 'user-1',
      projectId: '01950000-0000-7000-8000-000000000001',
      errorCode: 'VALIDATION_FAILED',
      errorMessage: 'ورودی نامعتبر',
    });
  });

  it('AllExceptionsFilter علت خطاهای ۴xx و ۵xx را روی درخواست و پاسخ ثبت می‌کند', () => {
    const context = { traceId: 'ERR-1234-56' } as AppContext;
    const filter = new AllExceptionsFilter(context);
    const request: Partial<TracedRequest> = { log: {} as TracedRequest['log'] };
    const json = vi.fn();
    const response = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnValue({ json }),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new ValidationFailedError([{ field: 'mobile', message: 'شماره موبایل معتبر نیست.' }]), host);
    expect(request.logError).toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      errorDetails: { fields: [{ field: 'mobile', message: 'شماره موبایل معتبر نیست.' }] },
    });

    const dbError = new Error('connect ECONNREFUSED');
    filter.catch(dbError, host);
    expect(request.logError?.errorCode).toBe('INTERNAL');
    expect((response as { err?: Error }).err).toBe(dbError);
  });

  it('ماسک لاگ رمز و کد OTP را پنهان می‌کند اما err.code پایگاه داده/شبکه را نگه می‌دارد', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString('utf8'));
        callback();
      },
    });
    const config = loadConfig({
      DB_URL: 'postgres://app:secret@localhost:5432/projeyar',
      JWT_KEYS: 'k1:0123456789abcdef0123456789abcdef',
      LOG_PRETTY: 'false',
    });
    const fakeContext = {
      isHttp: false,
      traceId: 'ERR-ABCD-12',
      orgId: 'org-99',
      actor: { orgId: 'org-99', userId: 'user-77', sessionId: 's-1', client: 'web' },
    } as unknown as AppContext;

    const opts = buildLoggerOptions(config, fakeContext).pinoHttp as LoggerOptions;
    const logger = pino(opts, stream);
    const pgErr = Object.assign(new Error('duplicate key'), { code: '23505' });
    logger.error({ err: pgErr, body: { password: 'p1', code: '123456' }, payload: { otpToken: 'tok' } }, 'db failure');

    expect(lines).toHaveLength(1);
    const raw = lines[0] ?? '';
    expect(raw.match(/"traceId":/g)).toHaveLength(1);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['level']).toBe('ERROR');
    expect(parsed['traceId']).toBe('ERR-ABCD-12');
    expect(parsed['orgId']).toBe('org-99');
    expect(parsed['userId']).toBe('user-77');
    expect((parsed['body'] as Record<string, unknown>)['password']).toBe('[پنهان]');
    expect((parsed['body'] as Record<string, unknown>)['code']).toBe('[پنهان]');
    expect((parsed['payload'] as Record<string, unknown>)['otpToken']).toBe('[پنهان]');
    expect((parsed['err'] as Record<string, unknown>)['code']).toBe('23505');
  });
});
