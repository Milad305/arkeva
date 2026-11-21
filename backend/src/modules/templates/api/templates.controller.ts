import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { IMPORT_MAX_BYTES, type UploadedCsv } from '../../wbs/index.js';
import { TemplateIntake } from '../application/template-intake.js';
import { TemplateLibrary } from '../application/template-library.js';

// F16 — کتابخانهٔ قالب‌ها (W31؛ templates.md ۹). کدها: templates.view، templates.manage، templates.publish (۸).

const id = new ParseUUIDPipe();
const upload = FileFieldsInterceptor(
  [
    { name: 'wbs', maxCount: 1 },
    { name: 'cbs', maxCount: 1 },
  ],
  { limits: { fileSize: IMPORT_MAX_BYTES + 1, files: 2 } },
);

class ListQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) readonly type?: string;
  @ApiPropertyOptional({ enum: ['all', 'active'] }) @IsOptional() @IsIn(['all', 'active']) readonly status?: 'all' | 'active';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) readonly search?: string;
}

class PreviewQuery {
  @ApiProperty({ description: 'ریال' }) @Matches(/^\d{1,20}$/) readonly cbsBudget!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(100_000) readonly workdays!: number;
}

class PublishDto {
  @ApiProperty() @IsString() @MaxLength(1000) readonly note!: string;
}

class DefaultDto {
  @ApiProperty() @IsBoolean() readonly isDefaultForType!: boolean;
}

class DraftDto {
  @ApiProperty({ description: 'محتوای قالب (templates.md ۴)' }) @IsObject() readonly content!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) readonly name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) readonly projectTypeId?: string;
}

class FromProjectDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly projectId!: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly name!: string;
}

class ImportFormDto {
  @ApiProperty() @IsString() @MaxLength(200) readonly name!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly projectTypeId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) readonly referenceDurationWd!: number;
}

class ImportQuery {
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() readonly commit?: boolean;
}

@ApiTags('قالب‌ها')
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly library: TemplateLibrary,
    private readonly intake: TemplateIntake,
  ) {}

  @Get()
  @Permission('templates.view')
  @ApiOperation({ summary: 'فهرست قالب‌ها', operationId: 'getTemplates', description: 'W31؛ پیش‌فرض اول، بعد پراستفاده‌تر' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  list(@Query() query: ListQuery) {
    return this.library.list({ type: query.type || null, includeArchived: query.status === 'all', search: query.search ?? '' });
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Permission('templates.manage')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        projectTypeId: { type: 'string' },
        referenceDurationWd: { type: 'integer' },
        wbs: { type: 'string', format: 'binary', description: 'برگهٔ WBS، CSV UTF-8' },
        cbs: { type: 'string', format: 'binary', description: 'برگهٔ CBS، CSV UTF-8 (اختیاری)' },
      },
    },
  })
  @ApiOperation({ summary: 'ساخت قالب از فایل', operationId: 'importTemplate', description: '۵.۱ راه سوم؛ commit=false فقط پیش‌نمایش' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  importFiles(@UploadedFiles() files: { wbs?: UploadedCsv[]; cbs?: UploadedCsv[] } | undefined, @Body() body: ImportFormDto, @Query() query: ImportQuery) {
    return this.intake.importFiles({
      name: body.name,
      projectTypeId: body.projectTypeId,
      referenceDurationWd: body.referenceDurationWd,
      wbsFile: files?.wbs?.[0],
      cbsFile: files?.cbs?.[0],
      commit: query.commit === true,
    });
  }

  @Post('from-project')
  @Permission('templates.manage')
  @ApiOperation({ summary: 'ذخیرهٔ پروژه به‌عنوان قالب', operationId: 'createTemplateFromProject', description: '۵.۱ راه اول؛ AC-TP-07' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  fromProject(@Body() body: FromProjectDto) {
    return this.intake.fromProject(body);
  }

  @Get(':templateId')
  @Permission('templates.view')
  @ApiOperation({ summary: 'جزئیات قالب', operationId: 'getTemplate', description: 'با تاریخچهٔ نسخه‌ها' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  detail(@Param('templateId', id) templateId: string) {
    return this.library.detail(templateId);
  }

  @Get(':templateId/versions')
  @Permission('templates.view')
  @ApiOperation({ summary: 'تاریخچهٔ نسخه‌ها', operationId: 'getTemplateVersions', description: '۵.۴' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses({ notFound: true })
  async versions(@Param('templateId', id) templateId: string) {
    return (await this.library.detail(templateId)).versions;
  }

  @Get(':templateId/preview')
  @Permission('templates.view')
  @ApiOperation({ summary: 'پیش‌نمایش ساخت پروژه', operationId: 'getTemplatePreview', description: '۵.۳ بی ساخت پروژه؛ AC-TP-01، ۰۲، ۰۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  preview(@Param('templateId', id) templateId: string, @Query() query: PreviewQuery) {
    return this.library.preview(templateId, query);
  }

  @Put(':templateId/draft')
  @Permission('templates.manage')
  @ApiOperation({ summary: 'ذخیرهٔ پیش‌نویس نسخهٔ بعد', operationId: 'saveTemplateDraft', description: '۵.۴؛ AC-TP-06' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  putDraft(@Param('templateId', id) templateId: string, @Body() body: DraftDto) {
    return this.library.putDraft(templateId, body);
  }

  @Post(':templateId/validate')
  @HttpCode(HttpStatus.OK)
  @Permission('templates.manage')
  @ApiOperation({ summary: 'بررسی قالب', operationId: 'validateTemplate', description: '۵.۲؛ AC-TP-03' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  validate(@Param('templateId', id) templateId: string) {
    return this.library.validate(templateId);
  }

  @Post(':templateId/publish')
  @HttpCode(HttpStatus.OK)
  @Permission('templates.publish')
  @ApiOperation({ summary: 'انتشار نسخهٔ تازه', operationId: 'publishTemplate', description: '۵.۴؛ AC-TP-03، AC-TP-06' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  publish(@Param('templateId', id) templateId: string, @Body() body: PublishDto) {
    return this.library.publish(templateId, body.note);
  }

  @Post(':templateId/archive')
  @HttpCode(HttpStatus.OK)
  @Permission('templates.manage')
  @ApiOperation({ summary: 'بایگانی قالب', operationId: 'archiveTemplate', description: '۵.۴؛ AC-TP-08' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  archive(@Param('templateId', id) templateId: string) {
    return this.library.archive(templateId, true);
  }

  @Delete(':templateId/archive')
  @Permission('templates.manage')
  @ApiOperation({ summary: 'بیرون آوردن از بایگانی', operationId: 'unarchiveTemplate', description: '۵.۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  unarchive(@Param('templateId', id) templateId: string) {
    return this.library.archive(templateId, false);
  }

  @Patch(':templateId')
  @Permission('templates.manage')
  @ApiOperation({ summary: 'قالب پیش‌فرض نوع', operationId: 'setDefaultTemplate', description: '۵.۴' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  setDefault(@Param('templateId', id) templateId: string, @Body() body: DefaultDto) {
    return this.library.setDefault(templateId, body.isDefaultForType);
  }

  @Delete(':templateId')
  @Permission('templates.manage')
  @ApiOperation({ summary: 'حذف قالب', operationId: 'deleteTemplate', description: 'فقط قالب هرگز استفاده‌نشده (۵.۴)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  remove(@Param('templateId', id) templateId: string) {
    return this.library.remove(templateId);
  }
}
