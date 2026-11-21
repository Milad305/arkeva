import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConsoleLogger, Logger, type Provider } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../../../src/app.module.js';
import { configureApp } from '../../../src/bootstrap/app.js';
import { runMigrations } from '../../../src/bootstrap/migrate.js';
import { type AppConfig, loadConfig } from '../../../src/config/config.js';
import { Clock, FixedClock } from '../../../src/platform/clock/clock.js';
import { type EmailMessage, EmailSender, type PushMessage, PushSender } from '../../../src/platform/messaging/channel-senders.js';
import { type SmsMessage, SmsSender } from '../../../src/platform/messaging/sms-sender.js';
import { createTestDatabase, type TestDatabase } from './database.js';

/** پیامک‌ها به‌جای ارسال جمع می‌شوند تا کد ورود و هشدار قفل خوانده شوند. */
export class RecordingSms extends SmsSender {
  readonly sent: SmsMessage[] = [];
  /** شکست ارائه‌دهنده (AC-NT-06): تا وقتی true است هر ارسال خطا می‌دهد. */
  failing = false;

  send(message: SmsMessage): Promise<void> {
    if (this.failing) return Promise.reject(new Error('ارائه‌دهندهٔ پیامک پاسخ نداد'));
    this.sent.push(message);
    return Promise.resolve();
  }

  /** آخرین کد شش‌رقمی پیامک‌شده به این شماره. */
  lastCode(mobile: string): string {
    const message = [...this.sent].reverse().find((item) => item.to === mobile);
    const code = /\d{6}/.exec(message?.text ?? '')?.[0];
    if (!code) throw new Error(`پیامک کدی برای ${mobile} پیدا نشد`);
    return code;
  }
}

/** ایمیل و پوش به‌جای ارسال جمع می‌شوند (برش ۱۲ب). */
export class RecordingEmail extends EmailSender {
  readonly sent: EmailMessage[] = [];
  failing = false;

  send(message: EmailMessage): Promise<void> {
    if (this.failing) return Promise.reject(new Error('ارائه‌دهندهٔ ایمیل پاسخ نداد'));
    this.sent.push(message);
    return Promise.resolve();
  }
}

export class RecordingPush extends PushSender {
  readonly sent: PushMessage[] = [];
  failing = false;

  send(message: PushMessage): Promise<void> {
    if (this.failing) return Promise.reject(new Error('ارائه‌دهندهٔ پوش پاسخ نداد'));
    this.sent.push(message);
    return Promise.resolve();
  }
}

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly config: AppConfig;
  readonly db: TestDatabase;
  readonly clock: FixedClock;
  readonly sms: RecordingSms;
  readonly email: RecordingEmail;
  readonly push: RecordingPush;
  /** اتصال نقش مالک برای ساخت داده و بررسی ردیف‌ها (بیرون از RLS). */
  readonly owner: pg.Pool;
  /** درخواست از یک IP مشخص؛ هر سناریو IP خودش را دارد تا محدودیت ۵ ورود در دقیقه تداخل نکند. */
  http(ip: string): TestAgent;
  close(): Promise<void>;
}

export interface TestAgent {
  get(path: string): request.Test;
  post(path: string): request.Test;
  put(path: string): request.Test;
  patch(path: string): request.Test;
  delete(path: string): request.Test;
}

export interface TestAppOptions {
  /** providerهای تست (مصرف‌کنندهٔ رویداد، تیک) که کشف خودکار آن‌ها را مثل providerهای ماژول‌ها می‌بیند. */
  readonly providers?: Provider[];
  /** متغیرهای env افزوده برای این اپ تست (مثل APP_MIN_VERSION). */
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * پایگاه دادهٔ موقت ← migration با نقش مالک ← اپ کامل (همان AppModule، لایهٔ HTTP و کارگرهای pg-boss)
 * با نقش اپ. فقط Clock و فرستنده‌های پیامک، ایمیل و پوش جایگزین می‌شوند.
 */
export async function startTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const db = await createTestDatabase();
  // هر اپ تست ریشهٔ فایل خودش را دارد (راه‌انداز دیسک؛ تصمیم 1405/08/24)
  const storageRoot = mkdtempSync(join(tmpdir(), 'projeyar-files-'));
  try {
    const config = loadConfig({
      NODE_ENV: 'test',
      DB_URL: db.appUrl,
      DB_MIGRATION_URL: db.ownerUrl,
      DB_POOL_MAX: '6',
      JWT_KEYS: `t1:${randomBytes(32).toString('hex')}`,
      COOKIE_SECURE: 'false',
      SWAGGER_ENABLED: 'false',
      TRUST_PROXY_HOPS: '1',
      SMS_PROVIDER: 'console',
      LOG_LEVEL: 'silent',
      LOG_PRETTY: 'false',
      JOB_POLL_INTERVAL_SEC: '0.5',
      JOB_POOL_MAX: '4',
      STORAGE_DRIVER: 'disk',
      STORAGE_DISK_ROOT: storageRoot,
      ...options.env,
    });
    await runMigrations(config);

    const clock = new FixedClock(new Date());
    const sms = new RecordingSms();
    const email = new RecordingEmail();
    const push = new RecordingPush();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(config)], providers: options.providers ?? [] })
      .overrideProvider(Clock)
      .useValue(clock)
      .overrideProvider(SmsSender)
      .useValue(sms)
      .overrideProvider(EmailSender)
      .useValue(email)
      .overrideProvider(PushSender)
      .useValue(push)
      .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app, config);
    await app.init();
    // عیب‌یابی: TEST_LOG_ERRORS=1 خطاهای ۵۰۰ را (که فیلتر سراسری لاگ می‌کند) در خروجی تست نشان می‌دهد
    if (process.env['TEST_LOG_ERRORS']) Logger.overrideLogger(new ConsoleLogger('test', { logLevels: ['error'] }));

    const owner = new pg.Pool({ connectionString: db.ownerUrl, max: 2 });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return {
      app,
      config,
      db,
      clock,
      sms,
      email,
      push,
      owner,
      http: (ip) => ({
        get: (path) => request(server).get(path).set('X-Forwarded-For', ip),
        post: (path) => request(server).post(path).set('X-Forwarded-For', ip),
        put: (path) => request(server).put(path).set('X-Forwarded-For', ip),
        patch: (path) => request(server).patch(path).set('X-Forwarded-For', ip),
        delete: (path) => request(server).delete(path).set('X-Forwarded-For', ip),
      }),
      async close() {
        await app.close();
        await owner.end();
        await db.drop();
        rmSync(storageRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await db.drop();
    rmSync(storageRoot, { recursive: true, force: true });
    throw error;
  }
}
