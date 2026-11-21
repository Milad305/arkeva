import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Authenticated, Permission } from '../../../platform/security/decorators.js';
import { Account } from '../../identity/index.js';
import { NotificationSettings } from '../application/notification-settings.js';
import { type Channel, CHANNELS } from '../domain/rules/channels.js';

// ماتریس اعلان پروژه (W30؛ notifications.configure_project) و ترجیح شخصی (W32؛ فقط احراز هویت، دادهٔ خود کاربر).

const uuid = new ParseUUIDPipe();

class MatrixCellDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  readonly code!: string;

  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  readonly channel!: Channel;

  @ApiProperty()
  @IsBoolean()
  readonly on!: boolean;
}

class PreferenceGroupDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  readonly key!: string;

  @ApiProperty({ description: 'کانال ← on | off (locked_on و na نادیده)' })
  @IsObject()
  readonly channels!: Partial<Record<Channel, string>>;

  // پنل همان گروه نمایشی را برمی‌گرداند؛ برچسب‌ها نادیده گرفته می‌شوند
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;
}

class QuietHoursDto {
  @ApiProperty()
  @IsBoolean()
  readonly enabled!: boolean;

  @ApiProperty({ example: '21:00' })
  @Matches(/^\d{2}:\d{2}$/)
  readonly from!: string;

  @ApiProperty({ example: '07:00' })
  @Matches(/^\d{2}:\d{2}$/)
  readonly to!: string;
}

class PreferencesDto {
  @ApiProperty({ type: [PreferenceGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceGroupDto)
  readonly groups!: PreferenceGroupDto[];

  @ApiPropertyOptional({ type: QuietHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  readonly quietHours?: QuietHoursDto;
}

@ApiTags('اعلان‌ها')
@Controller()
export class NotificationSettingsController {
  constructor(
    private readonly settings: NotificationSettings,
    private readonly context: AppContext,
    private readonly account: Account,
  ) {}

  @Get('projects/:projectId/notification-matrix')
  @Permission('notifications.configure_project')
  @ApiOperation({ summary: 'ماتریس اعلان پروژه', operationId: 'getNotificationMatrix', description: 'W30' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  matrix(@Param('projectId', uuid) projectId: string) {
    return this.settings.matrix(projectId);
  }

  @Put('projects/:projectId/notification-matrix')
  @Permission('notifications.configure_project')
  @ApiOperation({ summary: 'تنظیم یک خانهٔ ماتریس', operationId: 'setNotificationChannel', description: 'پیامک فقط رویداد فوری؛ na و الزامی عوض نمی‌شوند' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, unprocessable: true })
  setChannel(@Param('projectId', uuid) projectId: string, @Body() body: MatrixCellDto) {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return this.settings.setChannel(projectId, actor.orgId, body);
  }

  @Put('me/notification-preferences')
  @Authenticated()
  @ApiOperation({ summary: 'ترجیح اعلان من', operationId: 'saveNotificationPrefs', description: 'W32؛ فقط کاهنده؛ ساعت آرام' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ unprocessable: true })
  async savePrefs(@Body() body: PreferencesDto) {
    await this.settings.save(body);
    // همان پاسخ `GET /me` (AccountDto پنل) تا صفحهٔ حساب یک شکل بگیرد
    return this.account.get();
  }
}
