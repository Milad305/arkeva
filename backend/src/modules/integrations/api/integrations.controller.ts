import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { P6Export } from '../application/p6-export.js';

// F19 — مرز یکپارچه‌سازی (integrations.md ۹). نسخهٔ اول: خروجی XER برای P6 با `integrations.export_p6`؛ اتصال ERP و حسابداری
// در فاز بعد. کارت‌های W30 در پاسخ تنظیمات پروژه می‌آیند.

@ApiTags('Integrations')
@Controller('projects/:projectId/integrations')
export class IntegrationsController {
  constructor(private readonly p6: P6Export) {}

  @Post('p6/xer')
  @HttpCode(HttpStatus.OK)
  @Permission('integrations.export_p6')
  @ApiOperation({ summary: 'خروجی XER برای Primavera P6', operationId: 'exportXer', description: 'از نسخهٔ جاری؛ درصد تأییدشده و سرپرست‌ها؛ ممیزی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  exportXer(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.p6.export(projectId);
  }
}
