import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Authenticated } from '../../../platform/security/decorators.js';
import { MyNotifications } from '../application/my-notifications.js';
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from '../domain/notification.entity.js';

// اعلان‌های من (W06؛ notifications.md ۹). `notifications.view_own` را همه دارند و داده مال خود کاربر است،
// پس مثل «حساب من» فقط احراز هویت (F01 ۸) — کاربر بی عضویت پروژه هم اعلان‌هایش را می‌بیند.

class ListQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES, description: 'زبانه؛ خالی = همه' })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES, { message: 'زبانهٔ اعلان درست نیست.' })
  readonly type?: NotificationCategory;

  @ApiPropertyOptional({ enum: ['unread'] })
  @IsOptional()
  @IsIn(['unread'])
  readonly status?: 'unread';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Matches(/^\d{1,3}$/)
  readonly limit?: string;
}

class ReadAllDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORIES, description: 'فقط همین زبانه؛ خالی = همه' })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES, { message: 'زبانهٔ اعلان درست نیست.' })
  readonly type?: NotificationCategory;
}

@ApiTags('اعلان‌ها')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: MyNotifications) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'اعلان‌های من', operationId: 'getNotifications', description: 'W06؛ صفحه‌بندی cursor؛ شمار هر زبانه' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  list(@Query() query: ListQueryDto) {
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    return this.notifications.list({ type: query.type, unreadOnly: query.status === 'unread', cursor: query.cursor, limit });
  }

  @Get('unread-count')
  @Authenticated()
  @ApiOperation({ summary: 'شمار خوانده‌نشده', operationId: 'getUnreadCount' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  unreadCount() {
    return this.notifications.unreadCount();
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'همه خوانده شد', operationId: 'readAllNotifications', description: 'فقط زبانهٔ جاری' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  readAll(@Body() body: ReadAllDto) {
    return this.notifications.readAll(body.type);
  }

  @Post(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: 'خواندن یک اعلان', operationId: 'readNotification' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  read(@Param('notificationId', new ParseUUIDPipe()) id: string) {
    return this.notifications.read(id);
  }
}
