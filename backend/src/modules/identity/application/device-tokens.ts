import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { DeviceToken } from '../domain/device-token.entity.js';
import { User } from '../domain/user.entity.js';

// توکن پوش دستگاه (`POST /me/devices`؛ notifications.md ۹) و نشانی تماس گیرندگان برای ارسال اعلان (F13). یک توکن یک
// کاربر دارد: ثبت دوباره روی گوشی دیگری توکن را به کاربر تازه می‌سپارد.

export interface Contact {
  readonly email: string | null;
  readonly mobile: string;
  readonly pushTokens: readonly string[];
  readonly isOrgAdmin: boolean;
}

@Injectable()
export class DeviceTokens {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
  ) {}

  async register(input: { readonly platform: 'android' | 'ios' | 'web'; readonly token: string }): Promise<{ registered: true }> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const existing = await tx.findOne(DeviceToken, { token: input.token });
      if (existing) Object.assign(existing, { userId: actor.userId, platform: input.platform, lastSeenAt: now, revokedAt: null });
      else
        tx.create(DeviceToken, {
          id: newId(),
          orgId: actor.orgId,
          userId: actor.userId,
          platform: input.platform,
          token: input.token,
          createdAt: now,
          lastSeenAt: now,
        });
    });
    return { registered: true };
  }

  /** ایمیل، موبایل و توکن‌های فعال کاربران فعال. */
  async contacts(userIds: readonly string[]): Promise<Map<string, Contact>> {
    if (userIds.length === 0) return new Map();
    const ids = [...new Set(userIds)];
    const [users, tokens] = await Promise.all([
      this.em.find(User, { id: { $in: ids } }, { fields: ['email', 'mobile', 'isOrgAdmin'] }),
      this.em.find(DeviceToken, { userId: { $in: ids }, revokedAt: null }, { fields: ['userId', 'token'] }),
    ]);
    return new Map(
      users.map((user) => [
        user.id,
        {
          email: user.email ?? null,
          mobile: user.mobile,
          pushTokens: tokens.filter((token) => token.userId === user.id).map((token) => token.token),
          isOrgAdmin: user.isOrgAdmin,
        },
      ]),
    );
  }

  /** مدیران فعال سازمان (هشدار کار dead؛ code-mapping §۷.۲ ردیف ۲۶). */
  async orgAdminIds(): Promise<string[]> {
    return (await this.em.find(User, { isOrgAdmin: true, status: 'active' }, { fields: ['id'] })).map((user) => user.id);
  }
}
