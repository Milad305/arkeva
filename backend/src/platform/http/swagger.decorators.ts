import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ERROR_CODES } from '@projeyar/shared';

// قالب‌های پاسخ در OpenAPI (docs/backend/06 ۸) تا تایپ تولیدی فرانت و Dart دقیق باشد.

export class ApiErrorResponse {
  @ApiProperty({ enum: ERROR_CODES, description: 'کد ماشینی؛ کلاینت روی این تصمیم می‌گیرد' })
  readonly code!: string;

  @ApiProperty({ description: 'پیام فارسی، بی‌سرزنش و با یک راه ادامه', example: 'کس دیگری این را تغییر داده است.' })
  readonly message!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  readonly details?: Record<string, unknown>;

  @ApiProperty({ example: 'ERR-7F3A-21', description: 'کد پیگیری W46؛ همان در لاگ' })
  readonly traceId!: string;

  @ApiProperty({ description: 'آیا تلاش دوباره ممکن است کار کند' })
  readonly retryable!: boolean;
}

/**
 * پاسخ شیء آزاد برای endpointهایی که شکلشان همان تایپ فرانت است و هنوز کلاس DTO جدا ندارند
 * (ویزارد و تنظیمات F02) `[پیش‌فرض فنی]` — README ۶. تایپ تولیدی برای این‌ها دقیق نیست.
 */
export class FreeformResponse {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'شکل در توضیح endpoint و تایپ فرانت' })
  readonly value?: Record<string, unknown>;
}

interface StandardOptions {
  readonly authenticated?: boolean;
  readonly notFound?: boolean;
  readonly conflict?: boolean;
  readonly unprocessable?: boolean;
  readonly rateLimited?: boolean;
}

/** خطاهای رایج هر endpoint با قالب استاندارد. */
export function ApiStandardResponses(options: StandardOptions = {}): MethodDecorator & ClassDecorator {
  const { authenticated = true, notFound, conflict, unprocessable, rateLimited } = options;
  const type = ApiErrorResponse;
  return applyDecorators(
    ApiBadRequestResponse({ type, description: 'ورودی نادرست (details.fields)' }),
    ApiInternalServerErrorResponse({ type, description: 'خطای سرور با کد پیگیری' }),
    ...(authenticated
      ? [ApiUnauthorizedResponse({ type, description: 'نیاز به ورود' }), ApiForbiddenResponse({ type, description: 'بی‌دسترسی؛ details.requiredPermission' })]
      : []),
    ...(notFound ? [ApiNotFoundResponse({ type, description: 'نیست یا مال سازمان دیگر است' })] : []),
    ...(conflict ? [ApiConflictResponse({ type, description: 'تعارض نسخه یا حالت' })] : []),
    ...(unprocessable ? [ApiUnprocessableEntityResponse({ type, description: 'قاعدهٔ دامنه' })] : []),
    ...(rateLimited ? [ApiTooManyRequestsResponse({ type, description: 'نرخ درخواست' })] : []),
  );
}

/** پاسخ موفق در پوشش `{ success: true, data }` (06 ۳). */
export function ApiEnvelopedOk(model: Type<unknown>, options: { readonly isArray?: boolean; readonly description?: string } = {}) {
  const data = options.isArray ? { type: 'array', items: { $ref: getSchemaPath(model) } } : { $ref: getSchemaPath(model) };
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: { success: { type: 'boolean', enum: [true] }, data },
      },
    }),
  );
}
