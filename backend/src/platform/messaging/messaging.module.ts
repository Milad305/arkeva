import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../../config/config.js';
import { ConsoleEmailSender, ConsolePushSender, EmailSender, PushSender } from './channel-senders.js';
import { SmsIrSender } from './sms-ir.sender.js';
import { ConsoleSmsSender, SmsSender } from './sms-sender.js';

@Global()
@Module({
  providers: [
    {
      provide: SmsSender,
      inject: [AppConfig],
      useFactory: (config: AppConfig): SmsSender => {
        switch (config.sms.provider) {
          case 'console':
            return new ConsoleSmsSender();
          case 'sms.ir':
            return new SmsIrSender({
              apiKey: config.sms.otpSmsKey,
              otpTemplateId: config.sms.otpTemplateId,
              otpTemplateParam: config.sms.otpTemplateParam,
            });
        }
      },
    },
    { provide: EmailSender, useClass: ConsoleEmailSender },
    { provide: PushSender, useClass: ConsolePushSender },
  ],
  exports: [SmsSender, EmailSender, PushSender],
})
export class MessagingModule {}
