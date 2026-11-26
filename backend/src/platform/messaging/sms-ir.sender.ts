import { Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../http/errors.js';
import { describeSmsIrStatus, SMS_IR_RECIPIENT_ERRORS, SMS_IR_SUCCESS } from './sms-ir.codes.js';
import { maskSmsRecipient, type SmsMessage, SmsSender } from './sms-sender.js';

export const SMS_IR_VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

const REQUEST_TIMEOUT_MS = 10_000;

interface SmsIrResponse {
  readonly status?: number;
  readonly message?: string;
  readonly data?: { readonly messageId?: number; readonly cost?: number } | null;
}

export interface SmsIrOptions {
  readonly apiKey: string;
  readonly otpTemplateId: number;
  readonly otpTemplateParam: string;
  readonly fetchFn?: typeof fetch;
}

/**
 * خطای ارسال پیامک. از DomainError با کد `DEPENDENCY_UNAVAILABLE` (۵۰۳) ارث می‌برد تا فیلتر سراسری
 * پیام امن و استاندارد فارسی به کاربر بدهد و جزئیات فنی درگاه فقط در لاگ سرور ثبت شود (AC-PL-10).
 */
export class SmsSendError extends DomainError {
  constructor(
    reason: string,
    readonly recipientError = false,
  ) {
    super('DEPENDENCY_UNAVAILABLE', 503, undefined, !recipientError);
    this.message = reason;
  }
}

/** `09123456789` / `+989123456789` ← `9123456789` (قالب مستند sms.ir). */
export function toSmsIrMobile(mobile: string): string {
  return mobile.replace(/^(\+98|0098|98|0)(?=9\d{9}$)/, '');
}

/**
 * درگاه پیامکی sms.ir (قالب Verify برای کدهای یک‌بارمصرف وب و اپ؛ AC-PL-13).
 *
 * طبق قواعد امنیت لاگ (`docs/backend/10-operations.md` ۵ و `README` ۳.۲۱)، کد OTP و کلید API هرگز
 * در لاگ نوشته نمی‌شوند و شمارهٔ موبایل همیشه ماسک می‌شود.
 */
@Injectable()
export class SmsIrSender extends SmsSender {
  private readonly logger = new Logger('SmsIrSender');
  private readonly apiKey: string;
  private readonly otpTemplateId: number;
  private readonly otpTemplateParam: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SmsIrOptions) {
    super();
    this.apiKey = options.apiKey;
    this.otpTemplateId = options.otpTemplateId;
    this.otpTemplateParam = options.otpTemplateParam;
    this.fetchImpl = options.fetchFn ?? globalThis.fetch;
  }

  async send(message: SmsMessage): Promise<void> {
    const masked = maskSmsRecipient(message.to);
    if (!message.otpCode) {
      // حساب فقط برای قالب OTP تنظیم شده و خط ارسال متنی ندارد؛ اعلان درون‌برنامه‌ای همچنان می‌رسد.
      this.logger.warn(`transactional SMS to=${masked} skipped: sms.ir is configured for OTP templates only`);
      return;
    }

    const res = await this.postVerify(
      {
        mobile: toSmsIrMobile(message.to),
        templateId: this.otpTemplateId,
        parameters: [{ name: this.otpTemplateParam, value: message.otpCode }],
      },
      masked,
    );
    this.logger.log(`OTP sent to=${masked} messageId=${res.data?.messageId ?? '-'} cost=${res.data?.cost ?? '-'}`);
  }

  private async postVerify(body: unknown, maskedRecipient: string): Promise<SmsIrResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(SMS_IR_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/plain',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`sms.ir unreachable for to=${maskedRecipient}: ${detail}`);
      throw new SmsSendError(`sms.ir unreachable: ${detail}`);
    }

    const parsed = (await response.json().catch(() => null)) as SmsIrResponse | null;
    if (response.ok && parsed?.status === SMS_IR_SUCCESS) return parsed;

    const status = parsed?.status;
    const recipientError = status !== undefined && SMS_IR_RECIPIENT_ERRORS.has(status);
    const reason =
      `sms.ir rejected the send (http ${response.status}, status ${status ?? '-'}): ` +
      describeSmsIrStatus(status, parsed?.message);
    this.logger.warn(`OTP send failed for to=${maskedRecipient}: ${reason}`);
    throw new SmsSendError(reason, recipientError);
  }
}
