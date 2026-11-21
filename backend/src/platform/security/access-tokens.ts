import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig, type JwtKey } from '../../config/config.js';
import type { SessionClient } from '@projeyar/shared';
import type { Actor } from '../context/app-context.js';
import { UnauthorizedError } from '../http/errors.js';

// توکن دسترسی کوتاه‌عمر (docs/backend/07 ۲). ادعاها فقط sub، org و sid — نه نقش و دسترسی،
// تا تغییر نقش بی‌درنگ اثر کند. چند کلید با kid برای چرخش بی‌قطع؛ اولی امضا می‌کند.

interface AccessClaims {
  readonly sub: string;
  readonly org: string;
  readonly sid: string;
  /** کلاینت نشست: web یا android. */
  readonly cli?: SessionClient;
}

@Injectable()
export class AccessTokens {
  private readonly keys: ReadonlyMap<string, JwtKey>;
  private readonly signer: JwtKey;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {
    const [first] = config.auth.jwtKeys;
    if (!first) throw new Error('JWT_KEYS خالی است');
    this.signer = first;
    this.keys = new Map(config.auth.jwtKeys.map((key) => [key.kid, key]));
  }

  async sign(actor: Actor): Promise<{ token: string; expiresInSec: number }> {
    const expiresInSec = this.config.auth.accessTtlSec;
    const claims: AccessClaims = { sub: actor.userId, org: actor.orgId, sid: actor.sessionId, cli: actor.client };
    const token = await this.jwt.signAsync(claims, {
      secret: this.signer.secret,
      algorithm: 'HS256',
      keyid: this.signer.kid,
      expiresIn: expiresInSec,
    });
    return { token, expiresInSec };
  }

  async verify(token: string): Promise<Actor> {
    const header = this.jwt.decode<{ header?: { kid?: unknown } } | null>(token, { complete: true });
    const kid = typeof header?.header?.kid === 'string' ? header.header.kid : null;
    const key = kid ? this.keys.get(kid) : undefined;
    if (!key) throw new UnauthorizedError('SESSION_EXPIRED');
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token, { secret: key.secret, algorithms: ['HS256'] });
      return { userId: claims.sub, orgId: claims.org, sessionId: claims.sid, client: claims.cli === 'android' ? 'android' : 'web' };
    } catch {
      throw new UnauthorizedError('SESSION_EXPIRED');
    }
  }
}
