import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { ClientHeaderGuard } from '../../../platform/security/client-header.guard.js';
import { Authenticated, Public } from '../../../platform/security/decorators.js';
import { IdentitySessions } from '../application/identity-sessions.js';
import { PasswordRecovery } from '../application/password-recovery.js';
import { StepUpChallenges } from '../application/step-up.js';
import type { RequestMeta } from '../application/session-issuer.js';
import {
  LoginRequest,
  LoginResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  SessionResponse,
  StepUpRequest,
  StepUpResponse,
  VerifyOtpRequest,
} from './dto/auth.dto.js';
import { ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetTokenRequest, VerifyResetCodeRequest } from './dto/users.dto.js';
import { RefreshCookie } from './refresh-cookie.js';

// ورود و نشست وب (F01 ۵.۱، ۸). کنترلر نازک: ورودی ← فرمان ← DTO؛ کوکی فقط اینجا نوشته می‌شود.

const AUTH_LIMIT = { default: { limit: 5, ttl: 60_000 } };

const meta = (ip: string | undefined, userAgent: string | undefined): RequestMeta => ({
  ip: ip ?? null,
  userAgent: userAgent ?? null,
  client: 'web',
});

@ApiTags('ورود و نشست')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: IdentitySessions,
    private readonly cookie: RefreshCookie,
    private readonly context: AppContext,
    private readonly stepUp: StepUpChallenges,
    private readonly recovery: PasswordRecovery,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'ورود با شناسه و رمز', operationId: 'login', description: 'F01 ۵.۱؛ W01، W02' })
  @ApiEnvelopedOk(LoginResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true, conflict: true })
  async login(
    @Body() body: LoginRequest,
    @Req() request: Request,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const outcome = await this.auth.login({ ...body, deviceToken: this.cookie.readDevice(request) }, meta(ip, userAgent));
    if (outcome.outcome === 'otp_required') return outcome;
    this.cookie.write(response, outcome.refreshToken);
    return { outcome: 'success', session: outcome.session };
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'مرحلهٔ دوم ورود با کد پیامکی', operationId: 'verifyOtp', description: 'W03' })
  @ApiEnvelopedOk(SessionResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  async verifyOtp(
    @Body() body: VerifyOtpRequest,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.auth.verifyOtp(body, meta(ip, userAgent));
    this.cookie.write(response, result.refreshToken);
    if (result.deviceToken) this.cookie.writeDevice(response, result.deviceToken);
    return result.session;
  }

  @Post('otp/resend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'ارسال دوبارهٔ کد', operationId: 'resendOtp', description: 'W03: پس از ۶۰ ثانیه' })
  @ApiEnvelopedOk(ResendOtpResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  resendOtp(@Body() body: ResendOtpRequest): Promise<ResendOtpResponse> {
    return this.auth.resendOtp(body);
  }

  @Post('refresh')
  @Public()
  @UseGuards(ClientHeaderGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تازه‌سازی نشست از کوکی', operationId: 'refreshSession', description: 'چرخشی؛ 07 ۲' })
  @ApiEnvelopedOk(SessionResponse)
  @ApiStandardResponses({ authenticated: false })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<SessionResponse> {
    try {
      const result = await this.auth.refresh(this.cookie.read(request));
      if (result.refreshToken) this.cookie.write(response, result.refreshToken);
      return result.session;
    } catch (error) {
      if (error instanceof UnauthorizedError) this.cookie.clear(response);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @UseGuards(ClientHeaderGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'خروج از همین دستگاه', operationId: 'logout' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(this.cookie.read(request));
    this.cookie.clear(response);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({
    summary: 'بازیابی رمز: ارسال کد',
    operationId: 'forgotPassword',
    description: 'W04 مرحلهٔ ۱. برای شمارهٔ ناشناس هم پاسخ یکسان. کاربر دعوت‌شده با همین مسیر فعال می‌شود.',
  })
  @ApiEnvelopedOk(ForgotPasswordResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  forgotPassword(@Body() body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.recovery.forgot(body);
  }

  @Post('password/verify-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'بازیابی رمز: بررسی کد', operationId: 'verifyResetCode', description: 'W04 مرحلهٔ ۲؛ کد مصرف نمی‌شود' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  verifyResetCode(@Body() body: VerifyResetCodeRequest) {
    return this.recovery.verifyCode(body);
  }

  @Post('password/resend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'بازیابی رمز: ارسال دوبارهٔ کد', operationId: 'resendResetCode' })
  @ApiEnvelopedOk(ResendOtpResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  resendResetCode(@Body() body: ResetTokenRequest): Promise<ResendOtpResponse> {
    return this.recovery.resend(body);
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({
    summary: 'رمز تازه و ورود',
    operationId: 'resetPassword',
    description: 'W04 مرحلهٔ ۳. با توکن بازیابی کد لازم است؛ با توکن رمز منقضی (PASSWORD_EXPIRED) نه.',
  })
  @ApiEnvelopedOk(SessionResponse)
  @ApiStandardResponses({ authenticated: false, rateLimited: true })
  async resetPassword(
    @Body() body: ResetPasswordRequest,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.recovery.reset(body, meta(ip, userAgent));
    this.cookie.write(response, result.refreshToken);
    return result.session;
  }

  @Post('step-up')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({
    summary: 'کد تأیید دوباره برای عمل حساس',
    operationId: 'requestStepUp',
    description: 'F02 ۸.۴: انتقال مدیریت و حذف پروژه. کد به موبایل خود کاربر پیامک می‌شود.',
  })
  @ApiEnvelopedOk(StepUpResponse)
  @ApiStandardResponses({ rateLimited: true })
  requestStepUp(@Body() body: StepUpRequest): Promise<StepUpResponse> {
    return this.stepUp.request(body);
  }

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: 'نشست جاری بدون توکن تازه', operationId: 'getCurrentSession' })
  @ApiEnvelopedOk(SessionResponse)
  @ApiStandardResponses()
  me(): Promise<SessionResponse> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return this.auth.current(actor);
  }
}
