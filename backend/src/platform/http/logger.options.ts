import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import pino, { type LevelWithSilent } from 'pino';
import type { AppConfig } from '../../config/config.js';
import type { AppContext } from '../context/app-context.js';
import type { TracedRequest } from '../context/context.module.js';

// پیکربندی متمرکز لاگ ساختاری (docs/backend/10 ۵):
// - حذف هدرهای حجیم درخواست و پاسخ (CSP، کوکی، مرورگر) تا هر خط تک‌خطی، تمیز و قابل‌عیب‌یابی بماند.
// - تزریق خودکار traceId، orgId، userId و role در درخواست‌های HTTP و کارهای صف/تیک.
// - ثبت سطح WARN برای ۴xx و ERROR برای ۵xx همراه با کد و جزئیات خطای دامنه.
// - ماسک مقادیر حساس بدون پنهان‌کردن err.code در خطاهای پایگاه داده و شبکه.

export const LOG_REDACT_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.otp',
  '*.otpCode',
  '*.otpToken',
  'body.code',
  'query.code',
  'input.code',
  'payload.code',
  'data.code',
  '*.secret',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.amount',
];

interface DurationCarrier {
  readonly durationMs?: unknown;
}

export function cleanUrlPath(rawUrl: string | undefined): string {
  if (!rawUrl) return '/';
  const queryIndex = rawUrl.indexOf('?');
  return queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
}

export function resolveRoutePattern(request: Partial<Pick<TracedRequest, 'baseUrl' | 'route' | 'originalUrl' | 'url'>>): string {
  const route = request.route as { path?: unknown } | undefined;
  if (typeof route?.path === 'string') {
    const base = request.baseUrl ?? '';
    return `${base}${route.path}` || '/';
  }
  return cleanUrlPath(request.originalUrl ?? request.url);
}

export function httpLogLevel(
  request: Partial<Pick<TracedRequest, 'originalUrl' | 'url'>>,
  statusCode: number,
  error?: Error,
): LevelWithSilent {
  const path = cleanUrlPath(request.originalUrl ?? request.url);
  if ((path === '/health' || path === '/ready') && !error && statusCode < 400) return 'silent';
  if (error || statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

export function httpLogMessage(
  request: Partial<Pick<TracedRequest, 'method' | 'originalUrl' | 'url' | 'logError'>>,
  statusCode: number,
  durationMs?: number,
): string {
  const method = request.method ?? 'HTTP';
  const path = cleanUrlPath(request.originalUrl ?? request.url);
  const codePart = request.logError?.errorCode ? ` ${request.logError.errorCode}` : '';
  const timePart = typeof durationMs === 'number' ? ` (${Math.round(durationMs)}ms)` : '';
  return `${method} ${path} ${statusCode}${codePart}${timePart}`;
}

export function httpLogFields(
  request: TracedRequest,
  statusCode: number,
  durationMs?: number,
): Record<string, unknown> {
  const projectId = typeof request.params?.['projectId'] === 'string' ? request.params['projectId'] : undefined;
  return {
    context: 'HTTP',
    method: request.method,
    route: resolveRoutePattern(request),
    url: cleanUrlPath(request.originalUrl ?? request.url),
    status: statusCode,
    ...(typeof durationMs === 'number' ? { durationMs: Math.round(durationMs) } : {}),
    ...(request.ip ? { ip: request.ip } : {}),
    ...(request.logActor ? { orgId: request.logActor.orgId, userId: request.logActor.userId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(request.logError ?? {}),
  };
}

function readDuration(value: unknown): number | undefined {
  const raw = (value as DurationCarrier | null | undefined)?.durationMs;
  return typeof raw === 'number' ? raw : undefined;
}

export function buildLoggerOptions(config: AppConfig, context: AppContext): Params {
  return {
    pinoHttp: {
      level: config.log.level,
      base: { role: config.role },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(config.log.pretty
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
          }
        : {
            formatters: {
              level: (label: string) => ({ level: label.toUpperCase() }),
            },
          }),
      quietReqLogger: true,
      quietResLogger: true,
      customAttributeKeys: {
        reqId: 'traceId',
        responseTime: 'durationMs',
      },
      genReqId: (request: IncomingMessage) => (request as TracedRequest).traceId ?? 'ERR-0000-00',
      mixin: () => {
        const actor = context.actor;
        const orgId = actor?.orgId ?? context.orgId;
        const traceId = !context.isHttp && context.traceId !== 'ERR-0000-00' ? context.traceId : undefined;
        return {
          ...(traceId ? { traceId } : {}),
          ...(orgId ? { orgId } : {}),
          ...(actor?.userId ? { userId: actor.userId } : {}),
        };
      },
      redact: { paths: LOG_REDACT_PATHS, censor: '[پنهان]' },
      customLogLevel: (request: IncomingMessage, response: ServerResponse, error?: Error) =>
        httpLogLevel(request, response.statusCode, error),
      customSuccessMessage: (request: IncomingMessage, response: ServerResponse, responseTime: number) =>
        httpLogMessage(request, response.statusCode, responseTime),
      customErrorMessage: (request: IncomingMessage, response: ServerResponse, _error: Error, ...rest: unknown[]) =>
        httpLogMessage(request, response.statusCode, typeof rest[0] === 'number' ? rest[0] : undefined),
      customSuccessObject: (request: IncomingMessage, response: ServerResponse, value: unknown) =>
        httpLogFields(request as TracedRequest, response.statusCode, readDuration(value)),
      customErrorObject: (request: IncomingMessage, response: ServerResponse, error: Error, value: unknown) => ({
        ...httpLogFields(request as TracedRequest, response.statusCode, readDuration(value)),
        err: error,
      }),
    },
  };
}
