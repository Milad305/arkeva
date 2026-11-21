import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClsService, type ClsStore } from 'nestjs-cls';
import type { SessionClient } from '@projeyar/shared';
import type { ResolvedAccess } from '../security/access.js';

// زمینهٔ درخواست (docs/backend/07 ۳). هر درخواست HTTP، کار صف و تیک زمینهٔ خودش را دارد؛
// orgId فقط از نشست می‌آید، هرگز از ورودی (07 ۴).

export interface AppContextStore extends ClsStore {
  traceId?: string;
  userId?: string;
  orgId?: string;
  sessionId?: string;
  client?: SessionClient;
  /** پس از گارد دسترسی؛ دسترسی‌ها از پایگاه داده، نه از توکن (07 ۳). */
  access?: ResolvedAccess;
  /** IP درخواست HTTP؛ در کار صف و تیک تهی. */
  ip?: string | null;
}

/** کاربر احرازشده. نقش و دسترسی عمداً اینجا نیست تا تغییرش فوراً اثر کند. */
export interface Actor {
  readonly userId: string;
  readonly orgId: string;
  readonly sessionId: string;
  /** پنل وب یا اپ؛ نقش فقط‌اپ در نشست وب حساب نمی‌شود (§۷.۳ ردیف ۱۷؛ تصمیم کاربر 1405/08/22). */
  readonly client: SessionClient;
}

/** کد پیگیری کوتاه W46: «ERR-7F3A-21» (F20 ۱۱.۱؛ AC-PL-10). */
export function newTraceId(): string {
  const hex = randomBytes(2).toString('hex').toUpperCase();
  const tail = String(randomBytes(1).readUInt8(0) % 100).padStart(2, '0');
  return `ERR-${hex}-${tail}`;
}

const TRACE_ID_PATTERN = /^ERR-[0-9A-F]{4}-\d{2}$/;

/** اگر کلاینت کد پیگیری معتبر فرستاده، همان؛ وگرنه تازه. */
export function traceIdFrom(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value && TRACE_ID_PATTERN.test(value) ? value : newTraceId();
}

@Injectable()
export class AppContext {
  constructor(private readonly cls: ClsService<AppContextStore>) {}

  get traceId(): string {
    return (this.cls.isActive() && this.cls.get('traceId')) || 'ERR-0000-00';
  }

  get orgId(): string | undefined {
    return this.cls.isActive() ? this.cls.get('orgId') : undefined;
  }

  get actor(): Actor | undefined {
    if (!this.cls.isActive()) return undefined;
    const userId = this.cls.get('userId');
    const orgId = this.cls.get('orgId');
    const sessionId = this.cls.get('sessionId');
    if (!userId || !orgId || !sessionId) return undefined;
    return { userId, orgId, sessionId, client: this.cls.get('client') ?? 'web' };
  }

  get ip(): string | null {
    return (this.cls.isActive() && this.cls.get('ip')) || null;
  }

  get access(): ResolvedAccess | undefined {
    return this.cls.isActive() ? this.cls.get('access') : undefined;
  }

  setTraceId(traceId: string): void {
    this.cls.set('traceId', traceId);
  }

  setActor(actor: Actor): void {
    this.cls.set('userId', actor.userId);
    this.cls.set('orgId', actor.orgId);
    this.cls.set('sessionId', actor.sessionId);
    this.cls.set('client', actor.client);
  }

  setAccess(access: ResolvedAccess): void {
    this.cls.set('access', access);
  }

  /** زمینهٔ کار صف یا تیک (08 ۳): سازمان و کد پیگیری از payload کار، بی‌کاربر. */
  setJobScope(scope: { orgId: string | null; traceId: string }): void {
    this.cls.set('traceId', scope.traceId);
    if (scope.orgId) this.cls.set('orgId', scope.orgId);
  }
}
