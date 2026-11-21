import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Authenticated } from '../../../platform/security/decorators.js';
import { GlobalSearch, SEARCH_KINDS, type SearchKind } from '../application/global-search.js';

// جستجوی سریع (W43؛ platform.md ۹). کد جدا ندارد: هر نتیجه با دسترسی خودِ موضوع فیلتر می‌شود، پس فقط احراز هویت.

class SearchQuery {
  @ApiPropertyOptional({ maxLength: 200 }) @IsOptional() @IsString() @MaxLength(200) readonly q?: string;
  @ApiPropertyOptional({ enum: ['all', ...SEARCH_KINDS], default: 'all' }) @IsOptional() @IsIn(['all', ...SEARCH_KINDS]) readonly kind?: SearchKind | 'all';
  @ApiPropertyOptional({ format: 'uuid', description: 'پروژهٔ باز برای دستور زمینه‌ای «ثبت ریسک»' }) @IsOptional() @IsUUID() readonly projectId?: string;
}

@ApiTags('جستجو')
@Controller('search')
export class SearchController {
  constructor(private readonly searcher: GlobalSearch) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'جستجوی سراسری', operationId: 'search', description: 'W43؛ حداکثر ۸ نتیجه؛ بی مبلغ' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  search(@Query() query: SearchQuery) {
    return this.searcher.search({ q: query.q ?? '', kind: query.kind ?? 'all', projectId: query.projectId ?? null });
  }
}
