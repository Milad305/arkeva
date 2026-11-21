import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Public } from '../../../platform/security/decorators.js';
import { AppLogin } from '../application/app-login.js';
import type { RequestMeta } from '../application/session-issuer.js';
import { LogoutCommand, RefreshSessionCommand } from '../application/session.commands.js';

// ورود اپ کارگاه (access-control.md ۸ «اپ»؛ M01، M02). توکن تازه‌سازی در بدنه (اپ کوکی ندارد)؛ تازه‌سازی و خروج اپ مسیر جدا
// دارند تا کوکی وب و توکن اپ با هم قاطی نشوند `[پیش‌فرض فنی]`. ورود با کد یا QR دعوت (تصمیم 1405/08/24؛ OD-20): `invite-code` ← همان `verify`.

const APP_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const appMeta = (ip: string | undefined, userAgent: string | undefined): RequestMeta => ({ ip: ip ?? null, userAgent: userAgent ?? null, client: 'android' });

export class AppRequestCodeDto {
  @ApiProperty({ example: '09123456789' })
  @IsString({ message: 'شمارهٔ همراه را وارد کنید.' })
  @MaxLength(20)
  readonly mobile!: string;
}

export class AppVerifyDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'درخواست کد را از اول بفرستید.' }) @MaxLength(300) readonly otpToken!: string;
  @ApiProperty({ example: '12345' }) @Matches(/^\d{5}$/, { message: 'کد پنج‌رقمی پیامک را وارد کنید.' }) readonly code!: string;
}

export class AppInviteCodeDto {
  @ApiProperty({ example: 'K7M2Q9XA', description: 'کد ۸ نویسه‌ای دعوت یا محتوای QR `projeyar:invite:<کد>`' })
  @IsString({ message: 'کد دعوت را وارد کنید.' })
  @IsNotEmpty({ message: 'کد دعوت را وارد کنید.' })
  @MaxLength(64)
  readonly code!: string;
}

export class AppRefreshDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(300) readonly refreshToken!: string;
}

@ApiTags('ورود اپ')
@Controller('auth/app')
export class AppAuthController {
  constructor(
    private readonly login: AppLogin,
    private readonly refresher: RefreshSessionCommand,
    private readonly logouts: LogoutCommand,
  ) {}

  @Post('request-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(APP_LIMIT)
  @ApiOperation({
    summary: 'درخواست کد ورود اپ',
    operationId: 'appRequestCode',
    description: 'شماره + کد ۵ رقمی؛ ۳ در ساعت برای هر شماره؛ پاسخ یکسان برای شمارهٔ ناشناخته',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  requestCode(@Body() body: AppRequestCodeDto) {
    return this.login.requestCode(body);
  }

  @Post('invite-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(APP_LIMIT)
  @ApiOperation({
    summary: 'ورود اپ با کد دعوت',
    operationId: 'appInviteCode',
    description: 'کد دعوت یا QR ← کد پیامکی به شمارهٔ دعوت؛ ورود با appVerify که دعوت را می‌پذیرد (OD-20)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  inviteCode(@Body() body: AppInviteCodeDto) {
    return this.login.inviteCode(body);
  }

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(APP_LIMIT)
  @ApiOperation({ summary: 'ورود اپ با کد', operationId: 'appVerify', description: 'نشست android؛ توکن تازه‌سازی ۳۰ روزه در بدنه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  verify(@Body() body: AppVerifyDto, @Ip() ip: string | undefined, @Headers('user-agent') userAgent: string | undefined) {
    return this.login.verify(body, appMeta(ip, userAgent));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تازه‌سازی نشست اپ', operationId: 'appRefresh', description: 'چرخشی؛ عمر ۳۰ روزه با هر تازه‌سازی تمدید می‌شود (F08 ۷)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ authenticated: false })
  async refresh(@Body() body: AppRefreshDto) {
    const result = await this.refresher.execute(body.refreshToken, 'android');
    // مهلت هم‌زمانی بی چرخش: اپ همان توکن قبلی را نگه می‌دارد
    if (!result.session) throw new UnauthorizedError('SESSION_EXPIRED');
    return { session: result.session, refreshToken: result.refreshToken ?? body.refreshToken };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'خروج اپ', operationId: 'appLogout' })
  async logout(@Body() body: AppRefreshDto): Promise<void> {
    await this.logouts.execute(body.refreshToken);
  }
}
