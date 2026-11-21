import { Injectable, Logger } from '@nestjs/common';

// ارائه‌دهندهٔ ایمیل و پوش پشت رابط (D12؛ notifications.md ۲ «ارائه‌دهنده»؛ تصمیم 1405/08/24). تا انتخاب ارائه‌دهندهٔ واقعی
// پیاده‌سازی console لاگ می‌کند؛ تعویض فقط با env (AC-PL-13).

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  /** پیوست (گزارش مدیریتی ۷.۴: تا ۱۰ مگابایت). */
  readonly attachments?: readonly { readonly fileName: string; readonly contentType: string; readonly content: Buffer }[];
}

export interface PushMessage {
  readonly tokens: readonly string[];
  readonly title: string;
  readonly body: string;
  readonly link: string;
}

export abstract class EmailSender {
  abstract send(message: EmailMessage): Promise<void>;
}

export abstract class PushSender {
  abstract send(message: PushMessage): Promise<void>;
}

@Injectable()
export class ConsoleEmailSender extends EmailSender {
  private readonly logger = new Logger('Email');

  send(message: EmailMessage): Promise<void> {
    const [user, domain] = message.to.split('@');
    this.logger.log(`to ${(user ?? '').slice(0, 2)}***@${domain ?? ''}: ${message.subject}`);
    return Promise.resolve();
  }
}

@Injectable()
export class ConsolePushSender extends PushSender {
  private readonly logger = new Logger('Push');

  send(message: PushMessage): Promise<void> {
    this.logger.log(`to ${message.tokens.length} device(s): ${message.title}`);
    return Promise.resolve();
  }
}
