import { Injectable, Logger } from '@nestjs/common';

// ارائه‌دهندهٔ پیامک پشت رابط (D12؛ F20 ۸: SmsSender). تعویض فقط با env (AC-PL-13).

export interface SmsMessage {
  readonly to: string;
  readonly text: string;
}

export abstract class SmsSender {
  abstract send(message: SmsMessage): Promise<void>;
}

/**
 * توسعه: پیامک را در لاگ می‌نویسد. این تنها جایی است که متن پیامک (با کد) در لاگ می‌آید و
 * دقیقاً کارش همین است؛ پیکربندی در production این ارائه‌دهنده را نمی‌پذیرد.
 */
@Injectable()
export class ConsoleSmsSender extends SmsSender {
  private readonly logger = new Logger('SMS');

  send(message: SmsMessage): Promise<void> {
    const to = message.to.slice(-4).padStart(message.to.length, '*');
    // کد (۵ رقم اپ، ۶ رقم وب؛ ارقام لاتین) جدا و برجسته تا در کنسول توسعه پیدا شود
    const code = /(?<!\d)\d{5,6}(?!\d)/.exec(message.text)?.[0];
    if (code) this.logger.warn(`OTP ${code}  (to ${to})`);
    this.logger.log(`to ${to}: ${message.text.replace(/\n/g, ' | ')}`);
    return Promise.resolve();
  }
}
