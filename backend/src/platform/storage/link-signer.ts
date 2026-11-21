import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppConfig } from '../../config/config.js';

// امضای لینک دانلود راه‌انداز دیسک (S3 خودش امضا می‌کند). کلید از کلید فعال JWT مشتق می‌شود تا راز تازه‌ای لازم نباشد
// `[پیش‌فرض فنی]`؛ چرخش کلید JWT لینک‌های ۵ دقیقه‌ای را باطل می‌کند که بی‌اشکال است.

export interface LinkClaims {
  readonly key: string;
  /** ثانیهٔ یونیکس انقضا. */
  readonly exp: number;
  readonly fileName: string;
  readonly contentType: string;
}

const b64 = (value: Buffer | string): string => Buffer.from(value).toString('base64url');

@Injectable()
export class LinkSigner {
  private readonly secret: Buffer;

  constructor(config: AppConfig) {
    const active = config.auth.jwtKeys[0];
    if (!active) throw new Error('برای امضای لینک فایل کلید JWT لازم است');
    this.secret = createHmac('sha256', active.secret).update('projeyar:storage-link:v1').digest();
  }

  sign(claims: LinkClaims): string {
    const payload = b64(JSON.stringify({ k: claims.key, e: claims.exp, n: claims.fileName, t: claims.contentType }));
    return `${payload}.${b64(createHmac('sha256', this.secret).update(payload).digest())}`;
  }

  /** امضای نادرست یا منقضی ← null. */
  verify(token: string, nowSec: number): LinkClaims | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = createHmac('sha256', this.secret).update(payload).digest();
    const given = Buffer.from(signature, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    try {
      const raw = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { k: string; e: number; n: string; t: string };
      if (typeof raw.k !== 'string' || typeof raw.e !== 'number' || raw.e < nowSec) return null;
      return { key: raw.k, exp: raw.e, fileName: raw.n, contentType: raw.t };
    } catch {
      return null;
    }
  }
}
