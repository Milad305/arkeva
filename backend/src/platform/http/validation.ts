import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { type FieldError, ValidationFailedError } from './errors.js';

// اعتبارسنجی سراسری (docs/backend/06 ۴): whitelist + forbidNonWhitelisted در برابر mass assignment.
// پیام هر قاعده در خود DTO فارسی نوشته می‌شود؛ اگر نبود، پیام عمومی فارسی.

const FALLBACK = 'مقدار این فیلد درست نیست.';
const UNKNOWN_FIELD = 'این فیلد در این درخواست پذیرفته نیست.';

/** وقتی چند قاعده با هم شکست می‌خورند، پیام مهم‌تر: «بنویسید» پیش از «بیش از اندازه بلند». */
const PRIORITY = ['whitelistValidation', 'isDefined', 'isNotEmpty', 'isString', 'isBoolean', 'isIn', 'isUuid', 'matches'];

function pickMessage(constraints: Record<string, string>): string {
  const key = PRIORITY.find((name) => name in constraints) ?? Object.keys(constraints)[0];
  if (key === 'whitelistValidation') return UNKNOWN_FIELD;
  return (key && constraints[key]) || FALLBACK;
}

function flatten(errors: readonly ValidationError[], prefix = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const own: FieldError[] = error.constraints ? [{ field, message: pickMessage(error.constraints) }] : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors) => new ValidationFailedError(flatten(errors)),
  });
}
