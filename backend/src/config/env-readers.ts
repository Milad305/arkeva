// توابع پایهٔ خواندن و اعتبارسنجی متغیرهای محیطی (docs/backend/04 ۹).

export type Env = Readonly<Record<string, string | undefined>>;

export class ConfigErrors {
  private readonly errors: string[] = [];

  add(message: string): void {
    this.errors.push(message);
  }

  throwIfAny(): void {
    if (this.errors.length > 0) {
      throw new Error(`پیکربندی نادرست است:\n- ${this.errors.join('\n- ')}`);
    }
  }
}

export function required(env: Env, key: string, errors: ConfigErrors): string {
  const value = env[key]?.trim();
  if (!value) {
    errors.add(`${key} تنظیم نشده است`);
    return '';
  }
  return value;
}

export function optional(env: Env, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function int(env: Env, key: string, fallback: number, errors: ConfigErrors, min = 0): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    errors.add(`${key} باید عدد صحیح بزرگ‌تر یا مساوی ${min} باشد`);
    return fallback;
  }
  return value;
}

export function decimal(env: Env, key: string, fallback: number, errors: ConfigErrors, min: number): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) {
    errors.add(`${key} باید عدد بزرگ‌تر یا مساوی ${min} باشد`);
    return fallback;
  }
  return value;
}

export function bool(env: Env, key: string, fallback: boolean, errors: ConfigErrors): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  errors.add(`${key} باید true یا false باشد`);
  return fallback;
}

export function oneOf<T extends string>(env: Env, key: string, allowed: readonly T[], fallback: T, errors: ConfigErrors): T {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  errors.add(`${key} باید یکی از ${allowed.join('، ')} باشد`);
  return fallback;
}
