import { Global, Logger, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AppConfig, loadConfig } from '../../config/config.js';
import { mapError } from '../http/exception.filter.js';
import { MessagingModule } from './messaging.module.js';
import { describeSmsIrStatus } from './sms-ir.codes.js';
import { SMS_IR_VERIFY_URL, SmsIrSender, SmsSendError, toSmsIrMobile } from './sms-ir.sender.js';
import { ConsoleSmsSender, SmsSender } from './sms-sender.js';

const BASE_ENV = {
  DB_URL: 'postgres://app:secret@localhost:5432/projeyar',
  JWT_KEYS: 'k1:0123456789abcdef0123456789abcdef',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function configModule(config: AppConfig) {
  @Global()
  @Module({ providers: [{ provide: AppConfig, useValue: config }], exports: [AppConfig] })
  class TestConfigModule {}
  return TestConfigModule;
}

describe('SmsIrSender و تعویض ارائه‌دهندهٔ پیامک', () => {
  it('AC-PL-13 — تعویض ارائه‌دهندهٔ پیامک در MessagingModule فقط با متغیر محیطی', async () => {
    const devModule = await Test.createTestingModule({
      imports: [configModule(loadConfig(BASE_ENV)), MessagingModule],
    }).compile();
    expect(devModule.get(SmsSender)).toBeInstanceOf(ConsoleSmsSender);
    await devModule.close();

    const prodModule = await Test.createTestingModule({
      imports: [
        configModule(
          loadConfig({
            ...BASE_ENV,
            SMS_PROVIDER: 'sms.ir',
            OTP_SMS_KEY: 'secret-sms-key',
            OTP_TEMPLATE_ID: '554433',
            OTP_TEMPLATE_PARAM: 'Code',
          }),
        ),
        MessagingModule,
      ],
    }).compile();
    expect(prodModule.get(SmsSender)).toBeInstanceOf(SmsIrSender);
    await prodModule.close();
  });

  it('قالب شمارهٔ موبایل ایران را به شکل ۱۰ رقمی مستند sms.ir تبدیل می‌کند', () => {
    expect(toSmsIrMobile('09123454321')).toBe('9123454321');
    expect(toSmsIrMobile('+989123454321')).toBe('9123454321');
    expect(toSmsIrMobile('00989123454321')).toBe('9123454321');
    expect(toSmsIrMobile('989123454321')).toBe('9123454321');
    expect(toSmsIrMobile('9123454321')).toBe('9123454321');
  });

  it('کد OTP شش‌رقمی وب و پنج‌رقمی اپ را به /v1/send/verify می‌فرستد و کد یا کلید را در لاگ افشا نمی‌کند', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { status: 1, message: 'موفق', data: { messageId: 991122, cost: 1.5 } }),
    );
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const sender = new SmsIrSender({
      apiKey: 'super-secret-api-key',
      otpTemplateId: 778899,
      otpTemplateParam: 'Code',
      fetchFn,
    });

    await sender.send({
      to: '09123454321',
      text: 'کد ورود پروژه‌یار: 654321\nاین کد را به کسی ندهید.',
      otpCode: '654321',
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(SMS_IR_VERIFY_URL);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Accept: 'text/plain',
      'x-api-key': 'super-secret-api-key',
    });
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({
      mobile: '9123454321',
      templateId: 778899,
      parameters: [{ name: 'Code', value: '654321' }],
    });

    const logged = logSpy.mock.calls.map((args) => String(args[0])).join('\n');
    expect(logged).toContain('*******4321');
    expect(logged).not.toContain('09123454321');
    expect(logged).not.toContain('654321');
    expect(logged).not.toContain('super-secret-api-key');
    logSpy.mockRestore();
  });

  it('پیامک متنی غیراُتی‌پی (قفل حساب، دعوت، اعلان) را بدون فراخوانی درگاه رد می‌کند', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const sender = new SmsIrSender({
      apiKey: 'key',
      otpTemplateId: 100,
      otpTemplateParam: 'Code',
      fetchFn,
    });

    await expect(
      sender.send({ to: '09123454321', text: 'هشدار پروژه‌یار: حساب شما پس از چند ورود ناموفق موقتاً قفل شد.' }),
    ).resolves.toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('خطای شبکه و خطای گیرنده را به SmsSendError (503 DEPENDENCY_UNAVAILABLE) با retryable دقیق نگاشت می‌کند', async () => {
    const errSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const offlineSender = new SmsIrSender({
      apiKey: 'key',
      otpTemplateId: 100,
      otpTemplateParam: 'Code',
      fetchFn: vi.fn<typeof fetch>().mockRejectedValue(new Error('connect ETIMEDOUT')),
    });
    let caught: unknown;
    try {
      await offlineSender.send({ to: '09123454321', text: 'OTP', otpCode: '123456' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SmsSendError);
    expect(mapError(caught)).toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE', details: undefined, retryable: true });

    const recipientSender = new SmsIrSender({
      apiKey: 'key',
      otpTemplateId: 100,
      otpTemplateParam: 'Code',
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(400, { status: 104, message: 'invalid mobile' })),
    });
    let recipientErr: unknown;
    try {
      await recipientSender.send({ to: '09120000000', text: 'OTP', otpCode: '123456' });
    } catch (error) {
      recipientErr = error;
    }
    expect(recipientErr).toBeInstanceOf(SmsSendError);
    expect((recipientErr as SmsSendError).recipientError).toBe(true);
    expect(mapError(recipientErr)).toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE', details: undefined, retryable: false });
    expect(describeSmsIrStatus(102, undefined)).toContain('اعتبار');

    errSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
