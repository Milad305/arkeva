import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Argon2id با پارامترهای پیش‌فرض OWASP (docs/backend/07 ۲.۱).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordHasher {
  /** هش ساختگی تا زمان پاسخ برای کاربر ناموجود و رمز غلط یکی باشد (F01 ۵.۱). */
  private dummy: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string | null | undefined, password: string): Promise<boolean> {
    if (!passwordHash) {
      this.dummy ??= hash('projeyar-timing-equalizer', OPTIONS);
      await verify(await this.dummy, password).catch(() => false);
      return false;
    }
    return verify(passwordHash, password).catch(() => false);
  }
}
