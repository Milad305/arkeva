import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ProjectActivation } from '../application/project-activation.js';
import { ProjectLifecycle } from '../application/project-lifecycle.js';
import {
  DeleteProjectRequest,
  DeleteProjectResponse,
  ReasonRequest,
  TransferManagerRequest,
  TransferManagerResponse,
  TransitionResponse,
} from './dto/project-lifecycle.dto.js';

// چرخهٔ عمر و منطقهٔ خطر (F02 ۸، ۱۲؛ W30، W41). کنترلر نازک: ورودی ← فرمان ← DTO.

const projectId = new ParseUUIDPipe();

@ApiTags('پروژه‌ها')
@Controller('projects/:projectId')
export class ProjectLifecycleController {
  constructor(
    private readonly lifecycle: ProjectLifecycle,
    private readonly activation: ProjectActivation,
  ) {}

  @Get('activation-check')
  @Permission('project.activate')
  @ApiOperation({ summary: 'پیش‌شرط‌ها و هشدارهای فعال‌سازی', operationId: 'getActivationCheck', description: 'F02 ۸.۱؛ فقط پروژهٔ پیش‌نویس' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  activationCheck(@Param('projectId', projectId) id: string) {
    return this.activation.check(id);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Permission('project.activate')
  @ApiOperation({ summary: 'فعال‌سازی و ثبت برنامهٔ مبنا', operationId: 'activateProject', description: 'F02 ۸.۱؛ draft ← active؛ AC-PS-05، AC-PS-06' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  activate(@Param('projectId', projectId) id: string): Promise<TransitionResponse> {
    return this.activation.activate(id);
  }

  @Post('pause')
  @HttpCode(HttpStatus.OK)
  @Permission('project.pause')
  @ApiOperation({ summary: 'توقف پروژه', operationId: 'pauseProject', description: 'F02 ۸.۲؛ active ← paused' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  pause(@Param('projectId', projectId) id: string): Promise<TransitionResponse> {
    return this.lifecycle.transition(id, 'pause');
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  @Permission('project.pause')
  @ApiOperation({ summary: 'ادامهٔ پروژه', operationId: 'resumeProject', description: 'F02 ۸.۲؛ paused ← active' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  resume(@Param('projectId', projectId) id: string): Promise<TransitionResponse> {
    return this.lifecycle.transition(id, 'resume');
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @Permission('project.complete')
  @ApiOperation({ summary: 'اعلام پایان پروژه', operationId: 'completeProject', description: 'F02 ۸.۳؛ دلیل اجباری' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  complete(@Param('projectId', projectId) id: string, @Body() body: ReasonRequest): Promise<TransitionResponse> {
    return this.lifecycle.transition(id, 'complete', body.reason);
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  @Permission('project.archive')
  @ApiOperation({ summary: 'بایگانی پروژه', operationId: 'archiveProject', description: 'F02 ۸.۴؛ از تمام‌شده یا متوقف؛ دلیل اجباری' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  archive(@Param('projectId', projectId) id: string, @Body() body: ReasonRequest): Promise<TransitionResponse> {
    return this.lifecycle.transition(id, 'archive', body.reason);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @Permission('project.restore')
  @ApiOperation({
    summary: 'بازگردانی پروژه',
    operationId: 'restoreProject',
    description: 'F02 ۸.۳–۸.۴: بایگانی‌شده ← فعال؛ تمام‌شده ← فعال با دلیل اجباری (تصمیم کاربر 1405/08/22)',
  })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  restore(@Param('projectId', projectId) id: string, @Body() body: ReasonRequest): Promise<TransitionResponse> {
    return this.lifecycle.transition(id, 'restore_any', body.reason);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @Permission('project.delete')
  @ApiOperation({
    summary: 'حذف پروژه',
    operationId: 'deleteProject',
    description: 'F02 ۸.۴؛ W41: نام دقیق + کد پیامکی. پیش‌نویس فوراً؛ بایگانی‌شده (فقط مدیر سازمان) با مهلت ۱۴ روزه.',
  })
  @ApiEnvelopedOk(DeleteProjectResponse)
  @ApiStandardResponses({ conflict: true })
  delete(@Param('projectId', projectId) id: string, @Body() body: DeleteProjectRequest): Promise<DeleteProjectResponse> {
    return this.lifecycle.requestDeletion(id, body.confirmName, body.otp);
  }

  @Post('delete/cancel')
  @HttpCode(HttpStatus.OK)
  @Permission('project.delete')
  @ApiOperation({ summary: 'لغو حذف در مهلت ۱۴ روزه', operationId: 'cancelProjectDeletion', description: 'F02 ۸.۴؛ فقط مدیر سازمان' })
  @ApiEnvelopedOk(TransitionResponse)
  @ApiStandardResponses({ conflict: true })
  cancelDeletion(@Param('projectId', projectId) id: string): Promise<TransitionResponse> {
    return this.lifecycle.cancelDeletion(id);
  }

  @Post('transfer-manager')
  @HttpCode(HttpStatus.OK)
  @Permission('project.transfer_manager')
  @ApiOperation({ summary: 'انتقال مدیریت پروژه', operationId: 'transferManager', description: 'F02 ۸.۴؛ AC-PS-08؛ با کد پیامکی' })
  @ApiEnvelopedOk(TransferManagerResponse)
  @ApiStandardResponses({ conflict: true })
  transferManager(@Param('projectId', projectId) id: string, @Body() body: TransferManagerRequest): Promise<TransferManagerResponse> {
    return this.lifecycle.transferManager(id, body.userId, body.otp);
  }
}
