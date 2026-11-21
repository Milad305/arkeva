import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { BackupSettings } from '../application/backup-settings.js';
import { FullExports } from '../application/full-exports.js';
import { BACKUP_SCHEDULES, type BackupScheduleKind } from '../domain/backup.entities.js';

// F20 ۱۲ — پشتیبان پروژه و خروجی کامل (W30 «پشتیبان و خروجی»؛ تصمیم‌های 1405/08/26). برنامه و پشتیبان دستی با
// `project.settings.edit`، خروجی کامل با `export.full`.

const uuid = new ParseUUIDPipe();

class ScheduleDto {
  @ApiProperty({ enum: BACKUP_SCHEDULES }) @IsIn(BACKUP_SCHEDULES) readonly schedule!: BackupScheduleKind;
}

class ManualDto {
  @ApiPropertyOptional({ maxLength: 200 }) @IsOptional() @IsString() @MaxLength(400) readonly note?: string;
}

@ApiTags('Backups')
@Controller('projects/:projectId')
export class BackupsController {
  constructor(
    private readonly settings: BackupSettings,
    private readonly exports: FullExports,
  ) {}

  @Get('backups')
  @Permission('project.view')
  @ApiOperation({ summary: 'پشتیبان‌های پروژه', operationId: 'getBackups', description: 'W30؛ برنامه، نسخه‌ها و آخرین خروجی کامل' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  view(@Param('projectId', uuid) projectId: string) {
    return this.settings.view(projectId);
  }

  @Patch('backups')
  @Permission('project.settings.edit')
  @ApiOperation({ summary: 'برنامهٔ پشتیبان خودکار', operationId: 'setBackupSchedule', description: 'روزانه ۰۲:۰۰، هفتگی بامداد جمعه، غیرفعال' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true })
  schedule(@Param('projectId', uuid) projectId: string, @Body() body: ScheduleDto) {
    return this.settings.setSchedule(projectId, body.schedule);
  }

  @Post('backups')
  @HttpCode(HttpStatus.CREATED)
  @Permission('project.settings.edit')
  @ApiOperation({ summary: 'پشتیبان دستی', operationId: 'manualBackup', description: 'پیش از کار حساس؛ ۱۰ نسخهٔ دستی آخر نگه داشته می‌شود' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ conflict: true, unprocessable: true })
  manual(@Param('projectId', uuid) projectId: string, @Body() body: ManualDto) {
    return this.settings.manual(projectId, body.note);
  }

  @Post('exports/full')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permission('export.full')
  @ApiOperation({ summary: 'خروجی کامل پروژه (ZIP)', operationId: 'requestFullExport', description: 'ساخت در صف؛ لینک تا ۲۴ ساعت؛ ممیزی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({})
  requestFull(@Param('projectId', uuid) projectId: string) {
    return this.exports.request(projectId);
  }

  @Get('exports/full/:exportId/download')
  @Permission('export.full')
  @ApiOperation({ summary: 'لینک دانلود خروجی کامل', operationId: 'downloadFullExport', description: 'امضاشده تا پایان مهلت ۲۴ ساعته؛ ممیزی' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  download(@Param('projectId', uuid) projectId: string, @Param('exportId', uuid) exportId: string) {
    return this.exports.download(projectId, exportId);
  }
}
