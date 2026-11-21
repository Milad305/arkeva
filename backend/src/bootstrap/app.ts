import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../app.module.js';
import type { AppConfig } from '../config/config.js';
import { traceIdFrom } from '../platform/context/app-context.js';
import type { TracedRequest } from '../platform/context/context.module.js';

// ساخت اپ HTTP (docs/backend/06، 07 ۸). تست یکپارچگی هم همین را با پیکربندی خودش می‌سازد.

export async function createApp(config: AppConfig, options: { logs?: boolean } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config), {
    bufferLogs: true,
    logger: options.logs === false ? false : undefined,
  });
  if (options.logs !== false) app.useLogger(app.get(Logger));
  configureApp(app, config);
  return app;
}

/**
 * لایهٔ HTTP مشترک: کد پیگیری، helmet، کوکی، بدنه، CORS، نسخه، Swagger. تست یکپارچگی اپ را با
 * `Test.createTestingModule` می‌سازد (برای جایگزینی Clock) و همین را رویش اعمال می‌کند.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.set('trust proxy', config.trustProxyHops);
  app.disable('x-powered-by');

  // کد پیگیری پیش از همه، تا CLS، لاگ و خطا یکی را ببینند (AC-PL-10)
  app.use((request: TracedRequest, response: Response, next: NextFunction) => {
    request.traceId = traceIdFrom(request.headers['x-request-id']);
    response.setHeader('X-Trace-Id', request.traceId);
    next();
  });
  // Swagger UI اسکریپت درون‌خطی دارد؛ CSP سخت فقط وقتی UI خاموش است
  app.use(helmet({ contentSecurityPolicy: config.swaggerEnabled ? false : undefined }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '1mb' });
  // پارچه‌های بارگذاری (F20 ۷): بدنهٔ خام؛ هر پارچه حداکثر ۱ مگابایت با کمی حاشیه
  app.useBodyParser('raw', { type: 'application/octet-stream', limit: '2mb' });
  if (config.corsOrigins.length > 0) app.enableCors({ origin: [...config.corsOrigins], credentials: true });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, openApiConfig());
    SwaggerModule.setup('v1/docs', app, document, { jsonDocumentUrl: 'v1/openapi.json' });
  }
}

export function openApiConfig() {
  return new DocumentBuilder()
    .setTitle('Projeyar API')
    .setDescription('بک‌اند پروژه‌یار — docs/backend/06-api-swagger.md')
    .setVersion('1')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addCookieAuth('pj_refresh', { type: 'apiKey', in: 'cookie' }, 'refresh-cookie')
    .build();
}
