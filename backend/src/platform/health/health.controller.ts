import { Controller, Get, HttpCode, HttpStatus, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MikroORM } from '@mikro-orm/postgresql';
import { DomainError } from '../http/errors.js';
import { RawResponse } from '../http/envelope.js';
import { Jobs } from '../jobs/jobs.js';
import { Public } from '../security/decorators.js';

// سلامت (F20 ۱۲؛ docs/backend/10 ۶). بیرون از /v1 و بی‌احراز هویت.
@ApiExcludeController()
@Public()
@RawResponse()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly orm: MikroORM,
    private readonly jobs: Jobs,
  ) {}

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<{ status: 'ready'; deadLetters: number }> {
    try {
      await this.orm.em.fork().getConnection().execute('select 1');
    } catch {
      throw new DomainError('DEPENDENCY_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, { dependency: 'database' }, true);
    }
    // کارهایی که همهٔ تلاش‌هایشان شکست خورد؛ آمادگی را نمی‌گیرد ولی پایش آن را می‌بیند.
    // تا ساخت F13 جای «هشدار به مدیر سیستم» است (تصمیم کاربر 1405/08/22؛ F20 ۳.۱).
    return { status: 'ready', deadLetters: await this.jobs.deadLetterCount() };
  }
}
