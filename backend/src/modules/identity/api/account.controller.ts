import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidationFailedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Authenticated } from '../../../platform/security/decorators.js';
import { Account } from '../application/account.js';
import { DeviceTokens } from '../application/device-tokens.js';
import { DeviceTokenRequest } from './dto/device.dto.js';
import { ChangePasswordRequest, Disable2faRequest, Enable2faRequest, LoginHistoryQuery, UpdateMeRequest } from './dto/users.dto.js';

// حساب من (W32؛ F01 ۵.۷). همه فقط احراز هویت؛ روی حساب خود کاربر (F01 ۸).

@ApiTags('حساب من')
@Controller('me')
export class AccountController {
  constructor(
    private readonly account: Account,
    private readonly devices: DeviceTokens,
  ) {}

  @Post('devices')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'ثبت توکن پوش دستگاه', operationId: 'registerDevice', description: 'notifications.md ۹؛ کاربر اپ = توکن فعال دارد' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  registerDevice(@Body() body: DeviceTokenRequest) {
    return this.devices.register(body);
  }

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'حساب من', operationId: 'getAccount' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  get() {
    return this.account.get();
  }

  @Patch()
  @Authenticated()
  @ApiOperation({
    summary: 'پروفایل یا ترجیحات نمایش',
    operationId: 'updateMe',
    description: 'بدنه یا پروفایل (fullName، jobTitle، department) یا preferences',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  update(@Body() body: UpdateMeRequest) {
    if (body.preferences) return this.account.updatePreferences(body.preferences);
    if (body.fullName === undefined) throw new ValidationFailedError([{ field: 'fullName', message: 'نام و نام خانوادگی را بنویسید.' }]);
    return this.account.updateProfile({ fullName: body.fullName, jobTitle: body.jobTitle ?? '', department: body.department ?? null });
  }

  @Put('password')
  @Authenticated()
  @ApiOperation({ summary: 'تغییر رمز', operationId: 'changePassword', description: 'AC-AC-10، AC-AC-11' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  changePassword(@Body() body: ChangePasswordRequest) {
    return this.account.changePassword(body);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({
    summary: 'روشن کردن ورود دومرحله‌ای',
    operationId: 'enable2fa',
    description: 'اول POST /auth/step-up با purpose=account.enable_2fa و subjectId=شناسهٔ خود کاربر',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  enable2fa(@Body() body: Enable2faRequest) {
    return this.account.enable2fa(body.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'خاموش کردن ورود دومرحله‌ای', operationId: 'disable2fa' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true })
  disable2fa(@Body() body: Disable2faRequest) {
    return this.account.disable2fa(body.password);
  }

  @Post('2fa/backup-codes')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'کدهای پشتیبان تازه', operationId: 'regenerateBackupCodes' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true })
  backupCodes() {
    return this.account.regenerateBackupCodes();
  }

  @Delete('sessions')
  @Authenticated()
  @ApiOperation({ summary: 'خروج از همهٔ دستگاه‌های دیگر', operationId: 'revokeOtherSessions', description: 'AC-AC-11' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  revokeOthers() {
    return this.account.revokeOtherSessions();
  }

  @Delete('sessions/:sessionId')
  @Authenticated()
  @ApiOperation({ summary: 'خروج از یک دستگاه', operationId: 'revokeSession' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  revokeSession(@Param('sessionId', new ParseUUIDPipe()) id: string) {
    return this.account.revokeSession(id);
  }

  @Get('login-history')
  @Authenticated()
  @ApiOperation({ summary: 'تاریخچهٔ ورود', operationId: 'getLoginHistory', description: 'پیش‌فرض ۳۰ روز' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  loginHistory(@Query() query: LoginHistoryQuery) {
    return this.account.loginHistory(query.days ? Number(query.days) : 30);
  }
}
