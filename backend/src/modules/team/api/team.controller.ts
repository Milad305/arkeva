import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { ApprovalRoutes } from '../application/approval-routes.js';
import { Assignments } from '../application/assignments.js';
import { TeamMembers } from '../application/team-members.js';
import { AddMemberDto, AssignDto, AssignPreviewQuery, RemoveMemberDto, SaveAreasDto, UpdateRolesDto } from './dto/team.dto.js';

// تیم، تخصیص و حوزه‌های تأیید (W16، W17، W42، W29؛ team-assignment.md ۹–۱۰). هر endpoint یک کد.

const projectId = new ParseUUIDPipe();
const uuid = new ParseUUIDPipe();

@ApiTags('تیم و تخصیص')
@Controller('projects/:projectId')
export class TeamController {
  constructor(
    private readonly members: TeamMembers,
    private readonly assignments: Assignments,
    private readonly routes: ApprovalRoutes,
  ) {}

  @Get('members')
  @Permission('team.view')
  @ApiOperation({ summary: 'اعضای پروژه، دعوت‌ها و خلاصه', operationId: 'getMembers', description: 'موبایل و هدف دعوت فقط با team.manage (D11)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  list(@Param('projectId', projectId) id: string) {
    return this.members.view(id);
  }

  @Post('members')
  @Permission('team.manage')
  @ApiOperation({ summary: 'افزودن عضو یا دعوت فرد تازه', operationId: 'addMember', description: 'W42؛ حوزهٔ مسئولیت ناظر ApprovalRoute می‌سازد' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  add(@Param('projectId', projectId) id: string, @Body() body: AddMemberDto) {
    return this.members.add(id, { userId: body.userId ?? null, invite: body.invite ?? null, roles: body.roles, area: body.area ?? null });
  }

  @Patch('members/:userId')
  @Permission('team.manage')
  @ApiOperation({ summary: 'تغییر نقش‌های عضو', operationId: 'updateMemberRoles', description: '۴۰۹ اگر سرپرست برگ تخصیص‌یافته دارد (تصمیم 1405/08/23)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  updateRoles(@Param('projectId', projectId) id: string, @Param('userId', uuid) userId: string, @Body() body: UpdateRolesDto) {
    return this.members.updateRoles(id, userId, body.roles);
  }

  @Get('members/:userId/removal-impact')
  @Permission('team.manage')
  @ApiOperation({ summary: 'پیامد حذف عضو', operationId: 'getRemovalImpact', description: '۴.۳' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  removalImpact(@Param('projectId', projectId) id: string, @Param('userId', uuid) userId: string) {
    return this.members.removalImpact(id, userId);
  }

  @Delete('members/:userId')
  @Permission('team.manage')
  @ApiOperation({ summary: 'حذف عضو', operationId: 'removeMember', description: 'حذف نرم؛ برگ‌ها به transferTo یا بی‌سرپرست؛ مدیر پروژه ۴۰۹ (AC-TM-05)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  remove(@Param('projectId', projectId) id: string, @Param('userId', uuid) userId: string, @Body() body: RemoveMemberDto) {
    return this.members.remove(id, userId, body?.transferTo ?? null);
  }

  @Get('approval-routes')
  @Permission('team.view')
  @ApiOperation({
    summary: 'حوزه‌های تأیید و تأییدکنندهٔ جایگزین',
    operationId: 'getAreas',
    description: 'شکل W29؛ getApprovalRoutes همان areas را می‌خواند (تصمیم 1405/08/23)',
  })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  areas(@Param('projectId', projectId) id: string) {
    return this.routes.view(id);
  }

  @Put('approval-routes')
  @Permission('approval_routes.manage')
  @ApiOperation({ summary: 'جایگزینی کامل حوزه‌ها', operationId: 'saveAreas', description: 'W29؛ هر بخش WBS فقط یک حوزه؛ ApprovalRouteChanged' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  saveAreas(@Param('projectId', projectId) id: string, @Body() body: SaveAreasDto) {
    return this.routes.replace(id, {
      areas: body.areas.map((area) => ({ id: area.id ?? null, areaName: area.areaName, rootIds: area.rootIds, reviewerUserId: area.reviewerUserId ?? null })),
      fallbackApproverId: body.fallbackApproverId,
    });
  }

  @Get('assignments')
  @Permission('assignment.manage')
  @ApiOperation({ summary: 'درخت تخصیص و بار کاری سرپرستان', operationId: 'getAssignments', description: 'W17' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  assignmentsView(@Param('projectId', projectId) id: string) {
    return this.assignments.view(id);
  }

  @Get('assignments/preview')
  @Permission('assignment.manage')
  @ApiOperation({ summary: 'پیش‌نمایش بار کاری پس از تخصیص', operationId: 'previewAssign', description: '۵.۳؛ AL-RES-01' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  preview(@Param('projectId', projectId) id: string, @Query() query: AssignPreviewQuery) {
    return this.assignments.preview(id, { wbsItemIds: query.wbsItemIds ?? [], supervisorUserId: query.supervisorUserId ?? null });
  }

  @Post('assignments')
  @HttpCode(HttpStatus.OK)
  @Permission('assignment.manage')
  @ApiOperation({ summary: 'تخصیص گروهی', operationId: 'assign', description: 'AC-TM-01، AC-TM-08' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true, unprocessable: true })
  assign(@Param('projectId', projectId) id: string, @Body() body: AssignDto) {
    return this.assignments.assign(id, { wbsItemIds: body.wbsItemIds, supervisorUserId: body.supervisorUserId ?? null });
  }
}
