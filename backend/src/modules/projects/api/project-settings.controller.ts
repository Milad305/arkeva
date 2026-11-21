import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidationFailedError } from '../../../platform/http/errors.js';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Authenticated, Permission } from '../../../platform/security/decorators.js';
import { OfficialHolidays } from '../application/official-holidays.js';
import { type SettingsPatch, ProjectSettingsService } from '../application/project-settings.js';
import { CalendarRequest, SettingsPatchRequest } from './dto/project-settings.dto.js';
import { OfficialHolidaysQuery, OrgHolidayRequest } from './dto/wizard.dto.js';

// تنظیمات پروژه (F02 ۶–۷؛ W28 و رکورد W29) و تعطیلات رسمی.

const projectId = new ParseUUIDPipe();

@ApiTags('تنظیمات پروژه')
@Controller('projects/:projectId')
export class ProjectSettingsController {
  constructor(private readonly settings: ProjectSettingsService) {}

  @Get('settings')
  @Permission('project.view')
  @ApiOperation({
    summary: 'تنظیمات پروژه',
    operationId: 'getProjectSettings',
    description: 'بخش‌های F02: general، calendar، progress، field، workflow. حوزه‌ها، دوره‌ها، اعلان و هشدار با ماژول خودشان.',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  get(@Param('projectId', projectId) id: string) {
    return this.settings.get(id);
  }

  @Patch('settings')
  @Permission('project.settings.edit')
  @ApiOperation({
    summary: 'ذخیرهٔ یک بخش تنظیمات',
    operationId: 'patchProjectSettings',
    description: 'بدنه دقیقاً یکی از general، progress، field یا workflow؛ ProjectSettingsChanged و ممیزی (AC-PS-10، AC-PS-11)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  patch(@Param('projectId', projectId) id: string, @Body() body: SettingsPatchRequest) {
    const sections = Object.entries(body).filter(([, value]) => value !== undefined);
    if (sections.length !== 1) throw new ValidationFailedError([{ field: 'body', message: 'هر بار فقط یک بخش تنظیمات را ذخیره کنید.' }]);
    return this.settings.patch(id, Object.fromEntries(sections) as SettingsPatch);
  }

  @Put('calendar')
  @Permission('project.settings.edit')
  @ApiOperation({ summary: 'ذخیرهٔ تقویم پروژه', operationId: 'saveProjectCalendar', description: 'F02 ۶؛ W28' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  putCalendar(@Param('projectId', projectId) id: string, @Body() body: CalendarRequest) {
    return this.settings.putCalendar(id, body);
  }

  @Post('calendar/official-holidays/:year')
  @HttpCode(HttpStatus.OK)
  @Permission('project.settings.edit')
  @ApiOperation({ summary: 'افزودن تعطیلات رسمی یک سال', operationId: 'addOfficialHolidays', description: 'F02 ۶' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  addOfficial(@Param('projectId', projectId) id: string, @Param('year', ParseIntPipe) year: number) {
    if (year < 1300 || year > 1500) throw new ValidationFailedError([{ field: 'year', message: 'سال شمسی را درست بدهید.' }]);
    return this.settings.addOfficialYear(id, year);
  }
}

@ApiTags('تنظیمات پروژه')
@Controller()
export class OfficialHolidaysController {
  constructor(private readonly holidays: OfficialHolidays) {}

  @Get('calendar/official-holidays')
  @Authenticated()
  @ApiOperation({ summary: 'تعطیلات رسمی یک سال شمسی', operationId: 'getOfficialHolidays', description: 'ثابت‌های خورشیدی + افزوده‌های سازمان' })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  list(@Query() query: OfficialHolidaysQuery) {
    return this.holidays.forYear(query.year);
  }

  @Post('org/official-holidays')
  @Permission('org.settings')
  @ApiOperation({ summary: 'افزودن تعطیلی رسمی سازمان', operationId: 'addOrgOfficialHoliday', description: 'قمری یا ناگهانی (تصمیم کاربر 1405/08/22)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  add(@Body() body: OrgHolidayRequest) {
    return this.holidays.add(body);
  }
}
