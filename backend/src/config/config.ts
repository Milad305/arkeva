import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bool, ConfigErrors, decimal, type Env, int, oneOf, optional, required } from './env-readers.js';

// پیکربندی نوع‌دار از متغیرهای محیطی (docs/backend/04 ۹، 10 ۲).
//
// تنها جای مجاز خواندن `process.env`. متغیر نادرست یعنی برنامه بالا نمی‌آید، نه خطای دیرهنگام.
// رمز و نشانی هیچ‌وقت پیش‌فرض ندارند.

export const APP_ROLES = ['api', 'worker', 'all', 'migrate'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const STORAGE_DRIVERS = ['disk', 's3'] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

export interface JwtKey {
  readonly kid: string;
  readonly secret: string;
}

export type SmsConfig =
  | { readonly provider: 'console' }
  | {
      readonly provider: 'sms.ir';
      readonly otpSmsKey: string;
      readonly otpTemplateId: number;
      readonly otpTemplateParam: string;
    };

const SMS_IR_ALIASES: ReadonlySet<string> = new Set(['sms.ir', 'smsir', 'sms-ir', 'sms_ir']);
const DEFAULT_OTP_TEMPLATE_PARAM = 'Code';

/** کلید رمزنگاری پشتیبان (F20 ۱۲): ۳۲ بایت؛ نخستین کلید فعال است و بقیه فقط برای خواندن نسخه‌های قدیمی. */
export interface BackupKey {
  readonly kid: string;
  readonly secret: Buffer;
}

/** توکن DI و شکل پیکربندی؛ کلاس انتزاعی تا Nest بتواند تزریقش کند. */
export abstract class AppConfig {
  abstract readonly env: NodeEnv;
  abstract readonly role: AppRole;
  abstract readonly port: number;
  abstract readonly corsOrigins: readonly string[];
  abstract readonly trustProxyHops: number;
  abstract readonly swaggerEnabled: boolean;
  abstract readonly db: {
    readonly url: string;
    readonly migrationUrl: string | null;
    readonly adminUrl: string | null;
    readonly poolMax: number;
    readonly statementTimeoutMs: number;
    readonly debug: boolean;
  };
  abstract readonly auth: {
    readonly jwtKeys: readonly JwtKey[];
    readonly accessTtlSec: number;
    readonly refreshIdleTtlMin: number;
    readonly refreshAbsoluteTtlHours: number;
    readonly cookieSecure: boolean;
    readonly otpTtlSec: number;
    readonly otpResendSec: number;
    readonly otpMaxAttempts: number;
    readonly loginMaxFailed: number;
    readonly loginLockMin: number;
    /** فقط توسعه با پیامک console (تصمیم 1405/08/21). */
    readonly otpDevCode: string | null;
    /** نشست اپ: توکن تازه‌سازی ۳۰ روزه که با هر تازه‌سازی تمدید می‌شود (F08 ۷؛ 07 ۲.۲). */
    readonly appRefreshTtlDays: number;
    /** درخواست کد ورود اپ برای هر شماره در ساعت (07 ۲.۲). */
    readonly appOtpPerHour: number;
  };
  abstract readonly sms: SmsConfig;
  /** اپ کارگاه (F08 ۵.۳): حداقل نسخهٔ پذیرفتنی؛ null ← بی بررسی. */
  abstract readonly fieldApp: { readonly minVersion: string | null };
  /** صف pg-boss (docs/backend/08 ۳). */
  abstract readonly jobs: {
    /** فاصلهٔ poll کارگرها؛ کمینهٔ pg-boss نیم ثانیه است. */
    readonly pollIntervalSec: number;
    readonly poolMax: number;
  };
  abstract readonly log: { readonly level: string; readonly pretty: boolean };
  /** گزارش مدیریتی (F18 ۷.۲): مسیر Chromium یا Chrome برای PDF؛ null ← جای‌های رایج. */
  abstract readonly reports: {
    readonly browserPath: string | null;
    /** نشانی عمومی API برای لینک امضاشدهٔ ایمیل گیرندهٔ بیرونی (۷.۴). */
    readonly publicBaseUrl: string;
  };
  /** پشتیبان پروژه (F20 ۱۲): `BACKUP_KEYS=kid:base64` (۳۲ بایت)؛ در production الزامی. */
  abstract readonly backup: { readonly keys: readonly BackupKey[] };
  /** ذخیره‌سازی فایل (F20 ۷؛ تصمیم کاربر 1405/08/24: دیسک محلی برای توسعه و تست، S3/MinIO برای استقرار). */
  abstract readonly storage: {
    readonly driver: StorageDriver;
    /** ریشهٔ راه‌انداز دیسک. */
    readonly diskRoot: string;
    readonly s3: {
      readonly endpoint: string | null;
      readonly region: string;
      readonly bucket: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
      /** MinIO: مسیر به‌جای زیردامنه. */
      readonly forcePathStyle: boolean;
    } | null;
    /** عمر لینک امضاشده (F20 ۷: ۵ دقیقه). */
    readonly linkTtlSec: number;
  };
}

function jwtKeys(env: Env, errors: ConfigErrors): JwtKey[] {
  const raw = required(env, 'JWT_KEYS', errors);
  const keys = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(':');
      return { kid: part.slice(0, separator), secret: part.slice(separator + 1) };
    });
  for (const key of keys) {
    if (!key.kid || key.secret.length < 32) {
      errors.add('هر کلید JWT_KEYS باید به شکل kid:secret و secret دست‌کم ۳۲ نویسه باشد');
    }
  }
  if (raw && keys.length === 0) errors.add('JWT_KEYS خالی است');
  return keys;
}

/**
 * `BACKUP_KEYS=k1:<base64 32 بایت>[,k0:…]`. بیرون از production بی این متغیر کلیدی از JWT_KEYS مشتق می‌شود تا توسعه و تست
 * راه بیفتند؛ پشتیبان آن محیط‌ها فقط با همان JWT_KEYS باز می‌شود.
 */
function backupKeys(env: Env, production: boolean, jwt: readonly JwtKey[], errors: ConfigErrors): BackupKey[] {
  const raw = optional(env, 'BACKUP_KEYS');
  if (!raw) {
    if (production) errors.add('در production باید BACKUP_KEYS (kid:base64 با ۳۲ بایت) تعیین شود');
    const seed = jwt[0]?.secret ?? 'projeyar';
    return [{ kid: 'dev', secret: createHash('sha256').update(`projeyar:backup-dev:${seed}`).digest() }];
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(':');
      const kid = part.slice(0, separator);
      const secret = Buffer.from(part.slice(separator + 1), 'base64');
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(kid) || secret.length !== 32) errors.add('هر کلید BACKUP_KEYS باید به شکل kid:base64 و دقیقاً ۳۲ بایت باشد');
      return { kid, secret };
    });
}

/** `APP_MIN_VERSION=1.2.0` — یک تا سه بخش عددی. */
function appVersion(env: Env, key: string, errors: ConfigErrors): string | null {
  const value = optional(env, key);
  if (value !== null && !/^\d+(\.\d+){0,2}$/.test(value)) errors.add(`${key} باید نسخه‌ای مثل 1.2.0 باشد`);
  return value;
}

/** پیکربندی را از env می‌سازد و هر ناسازگاری را یک‌جا گزارش می‌کند. */
export function loadConfig(env: Env): AppConfig {
  const errors = new ConfigErrors();
  const nodeEnv = oneOf(env, 'NODE_ENV', NODE_ENVS, 'development', errors);
  const production = nodeEnv === 'production';
  const sms = smsConfig(env, production, errors);
  const otpDevCode = optional(env, 'OTP_DEV_CODE');

  if (otpDevCode !== null && (production || sms.provider !== 'console')) {
    errors.add('OTP_DEV_CODE فقط در توسعه و با SMS_PROVIDER=console مجاز است');
  }
  if (otpDevCode !== null && !/^\d{6}$/.test(otpDevCode)) {
    errors.add('OTP_DEV_CODE باید شش رقم لاتین باشد');
  }
  const cookieSecure = bool(env, 'COOKIE_SECURE', true, errors);
  if (production && !cookieSecure) errors.add('در production باید COOKIE_SECURE=true باشد');

  const jwt = jwtKeys(env, errors);
  const config: AppConfig = {
    env: nodeEnv,
    role: oneOf(env, 'APP_ROLE', APP_ROLES, 'all', errors),
    port: int(env, 'PORT', 3000, errors, 1),
    corsOrigins: (optional(env, 'CORS_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxyHops: int(env, 'TRUST_PROXY_HOPS', 0, errors),
    swaggerEnabled: bool(env, 'SWAGGER_ENABLED', !production, errors),
    db: {
      url: required(env, 'DB_URL', errors),
      migrationUrl: optional(env, 'DB_MIGRATION_URL'),
      adminUrl: optional(env, 'DB_ADMIN_URL'),
      poolMax: int(env, 'DB_POOL_MAX', 10, errors, 1),
      statementTimeoutMs: int(env, 'DB_STATEMENT_TIMEOUT_MS', 15_000, errors, 100),
      debug: bool(env, 'DB_DEBUG', false, errors),
    },
    auth: {
      jwtKeys: jwt,
      accessTtlSec: int(env, 'JWT_ACCESS_TTL_SEC', 600, errors, 60),
      refreshIdleTtlMin: int(env, 'REFRESH_IDLE_TTL_MIN', 30, errors, 1),
      refreshAbsoluteTtlHours: int(env, 'REFRESH_ABSOLUTE_TTL_HOURS', 12, errors, 1),
      cookieSecure,
      otpTtlSec: int(env, 'OTP_TTL_SEC', 300, errors, 30),
      otpResendSec: int(env, 'OTP_RESEND_SEC', 60, errors, 0),
      otpMaxAttempts: int(env, 'OTP_MAX_ATTEMPTS', 5, errors, 1),
      loginMaxFailed: int(env, 'LOGIN_MAX_FAILED', 5, errors, 1),
      loginLockMin: int(env, 'LOGIN_LOCK_MIN', 15, errors, 1),
      otpDevCode,
      appRefreshTtlDays: int(env, 'APP_REFRESH_TTL_DAYS', 30, errors, 1),
      appOtpPerHour: int(env, 'APP_OTP_PER_HOUR', 3, errors, 1),
    },
    sms,
    fieldApp: { minVersion: appVersion(env, 'APP_MIN_VERSION', errors) },
    jobs: {
      pollIntervalSec: decimal(env, 'JOB_POLL_INTERVAL_SEC', 2, errors, 0.5),
      poolMax: int(env, 'JOB_POOL_MAX', 4, errors, 1),
    },
    log: { level: optional(env, 'LOG_LEVEL') ?? 'info', pretty: bool(env, 'LOG_PRETTY', !production, errors) },
    storage: storageConfig(env, production, errors),
    backup: { keys: backupKeys(env, production, jwt, errors) },
    reports: {
      browserPath: optional(env, 'REPORT_BROWSER_PATH'),
      publicBaseUrl: (optional(env, 'PUBLIC_BASE_URL') ?? 'http://localhost:3000').replace(/\/$/, ''),
    },
  };

  errors.throwIfAny();
  return config;
}

function smsConfig(env: Env, production: boolean, errors: ConfigErrors): SmsConfig {
  const raw = optional(env, 'SMS_PROVIDER')?.toLowerCase();
  if (!raw || raw === 'console') {
    if (production) errors.add('در production باید SMS_PROVIDER واقعی (مثل sms.ir) تعیین شود');
    return { provider: 'console' };
  }
  if (SMS_IR_ALIASES.has(raw)) {
    const otpSmsKey = required(env, 'OTP_SMS_KEY', errors);
    const templateRaw = required(env, 'OTP_TEMPLATE_ID', errors);
    const otpTemplateId = templateRaw ? int(env, 'OTP_TEMPLATE_ID', 0, errors, 1) : 0;
    const paramRaw = optional(env, 'OTP_TEMPLATE_PARAM')?.replace(/^#+|#+$/g, '').trim();
    return {
      provider: 'sms.ir',
      otpSmsKey,
      otpTemplateId,
      otpTemplateParam: paramRaw || DEFAULT_OTP_TEMPLATE_PARAM,
    };
  }
  errors.add('SMS_PROVIDER باید یکی از console، sms.ir باشد');
  return { provider: 'console' };
}

function storageConfig(env: Env, production: boolean, errors: ConfigErrors): AppConfig['storage'] {
  // در production راه‌انداز صریح لازم است؛ توسعه و تست پیش‌فرض دیسک
  const explicit = optional(env, 'STORAGE_DRIVER');
  if (production && !explicit) errors.add('در production باید STORAGE_DRIVER (disk یا s3) تعیین شود');
  const driver = oneOf(env, 'STORAGE_DRIVER', STORAGE_DRIVERS, 'disk', errors);
  const diskRoot = optional(env, 'STORAGE_DISK_ROOT');
  if (driver === 'disk' && production && !diskRoot) errors.add('در production با STORAGE_DRIVER=disk باید STORAGE_DISK_ROOT تعیین شود');
  return {
    driver,
    diskRoot: diskRoot ?? join(BACKEND_ROOT, 'var', 'storage'),
    s3:
      driver === 's3'
        ? {
            endpoint: optional(env, 'S3_ENDPOINT'),
            region: optional(env, 'S3_REGION') ?? 'us-east-1',
            bucket: required(env, 'S3_BUCKET', errors),
            accessKeyId: required(env, 'S3_ACCESS_KEY_ID', errors),
            secretAccessKey: required(env, 'S3_SECRET_ACCESS_KEY', errors),
            forcePathStyle: bool(env, 'S3_FORCE_PATH_STYLE', true, errors),
          }
        : null,
    linkTtlSec: int(env, 'STORAGE_LINK_TTL_SEC', 300, errors, 30),
  };
}

/** خواندن env فرایند — فقط از راه‌انداز و اسکریپت‌ها صدا زده می‌شود. */
export function loadProcessConfig(): AppConfig {
  return loadConfig(process.env);
}

/** ریشهٔ پکیج بک‌اند (src/config یا dist/config دو سطح پایین‌تر)؛ مستقل از پوشهٔ اجرا. */
const BACKEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * فایل‌های env پروفایل را بارگذاری می‌کند (Node 20.12+؛ بی‌نیاز از dotenv). پروفایل = NODE_ENV فرایند،
 * پیش‌فرض development. ترتیب برنده: متغیر واقعی فرایند ← `.env.<profile>.local` ← `.env.<profile>` ← `.env`
 * (loadEnvFile متغیر موجود را بازنویسی نمی‌کند، پس اولین بارگذاری برنده است).
 * در production فقط `.env.production*` و `.env` خوانده می‌شود، هرگز فایل توسعه.
 */
export function loadDotEnv(root: string = BACKEND_ROOT): { profile: string; files: string[] } {
  const profile = process.env.NODE_ENV?.trim() || 'development';
  const files: string[] = [];
  for (const name of [`.env.${profile}.local`, `.env.${profile}`, '.env']) {
    try {
      process.loadEnvFile(join(root, name));
      files.push(name);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause;
    }
  }
  return { profile, files };
}

/** متغیر خام برای ابزارهای جانبی (اسکریپت تست) که پیکربندی کامل لازم ندارند. */
export function rawEnv(key: string): string | undefined {
  return process.env[key];
}
