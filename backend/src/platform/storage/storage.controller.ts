import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { Clock } from '../clock/clock.js';
import { DomainError, ForbiddenError } from '../http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../http/swagger.decorators.js';
import { Authenticated, Public } from '../security/decorators.js';
import { LinkSigner } from './link-signer.js';
import { FILE_KINDS, type FileKind, ObjectStorage } from './object-storage.js';
import { Uploads } from './uploads.js';

// بارگذاری و دانلود (F20 ۷). مسیرها `:projectId` ندارند؛ اجازه را رجیستری نوع فایل با کد همان موضوع می‌سنجد (عکس:
// report.submit و report.view در پروژه) `[پیش‌فرض فنی]` — access-control کد جدایی برای فایل ندارد.

const uuid = new ParseUUIDPipe();

export class CreateUploadDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly projectId!: string;
  @ApiProperty({ enum: FILE_KINDS }) @IsIn(FILE_KINDS) readonly kind!: FileKind;
  @ApiPropertyOptional({ format: 'uuid', description: 'موضوع نوع فایل؛ عکس: شناسهٔ FieldPhoto' }) @IsOptional() @IsUUID() readonly subjectId?: string;
  @ApiProperty() @IsString() @MaxLength(200) readonly fileName!: string;
  @ApiProperty({ example: 'image/jpeg' }) @IsString() @MaxLength(100) readonly contentType!: string;
  @ApiProperty({ description: 'بایت' }) @IsInt() @Min(1) readonly size!: number;
}

export class CompleteUploadDto {
  @ApiProperty({ description: 'SHA-256 کل فایل، hex' })
  @Matches(/^[0-9a-fA-F]{64}$/, { message: 'هش SHA-256 باید ۶۴ نویسهٔ هگز باشد.' })
  readonly sha256!: string;
}

@ApiTags('فایل')
@Controller()
export class StorageController {
  constructor(
    private readonly uploads: Uploads,
    private readonly signer: LinkSigner,
    private readonly storage: ObjectStorage,
    private readonly clock: Clock,
  ) {}

  @Post('uploads')
  @Authenticated()
  @ApiOperation({ summary: 'شروع بارگذاری', operationId: 'createUpload', description: 'شناسه، اندازهٔ پارچه و شمار پارچه‌ها (F20 ۷)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  create(@Body() body: CreateUploadDto) {
    return this.uploads.create(body);
  }

  @Get('uploads/:uploadId')
  @Authenticated()
  @ApiOperation({ summary: 'وضعیت بارگذاری', operationId: 'getUpload', description: 'پارچه‌های رسیده و جاافتاده برای ادامه (AC-PL-06)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  status(@Param('uploadId', uuid) id: string) {
    return this.uploads.status(id);
  }

  @Put('uploads/:uploadId/parts/:part')
  @Authenticated()
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiOperation({ summary: 'ارسال یک پارچه', operationId: 'putUploadPart', description: 'بدنهٔ خام؛ تکرار همان پارچه بی‌اثر' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  part(@Param('uploadId', uuid) id: string, @Param('part', ParseIntPipe) part: number, @Req() request: Request) {
    const body: unknown = request.body;
    if (!Buffer.isBuffer(body)) throw new DomainError('UPLOAD_INVALID', 422, { reason: 'پارچه باید با Content-Type: application/octet-stream فرستاده شود.' });
    return this.uploads.putPart(id, part, body);
  }

  @Post('uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'تکمیل بارگذاری', operationId: 'completeUpload', description: 'بررسی SHA-256؛ ناهمخوانی ← ارسال دوباره (۴۲۲، retryable)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  complete(@Param('uploadId', uuid) id: string, @Body() body: CompleteUploadDto) {
    return this.uploads.complete(id, body.sha256);
  }

  @Get('files/:fileId/link')
  @Authenticated()
  @ApiOperation({ summary: 'لینک دانلود', operationId: 'getFileLink', description: 'امضاشده و ۵ دقیقه‌ای، پس از بررسی پروژه و دسترسی (AC-PL-07)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  link(@Param('fileId', uuid) id: string) {
    return this.uploads.link(id);
  }

  /** محتوای لینک امضاشدهٔ راه‌انداز دیسک؛ بی توکن معتبر هیچ (AC-PL-07). با S3 لینک مستقیم خود S3 است. */
  @Get('files/content')
  @Public()
  @ApiOperation({ summary: 'دانلود با لینک امضاشده', operationId: 'getFileContent', description: 'فقط راه‌انداز دیسک' })
  async content(@Query('token') token: string | undefined, @Res() response: Response): Promise<void> {
    const claims = token ? this.signer.verify(token, Math.floor(this.clock.now().getTime() / 1000)) : null;
    if (!claims) throw new ForbiddenError('FILE_LINK_INVALID');
    // جریانی تا خروجی چندگیگابایتی (F20 ۱۲) در حافظه بار نشود
    const body = await this.storage.openRead(claims.key);
    if (!body) throw new DomainError('FILE_NOT_FOUND', 404);
    response.setHeader('Content-Type', claims.contentType);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(claims.fileName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    await pipeline(body, response);
  }
}
