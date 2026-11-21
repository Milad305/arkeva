import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { Invitations } from '../application/invitations.js';
import { OrgUsers } from '../application/org-users.js';
import { UserAdmin } from '../application/user-admin.js';
import { UserImport } from '../application/user-import.js';
import {
  BulkUsersRequest,
  DisableUserRequest,
  ImportUsersQuery,
  ImportUsersRequest,
  InviteUserRequest,
  OrgSecurityRequest,
  UpdateUserRequest,
} from './dto/users.dto.js';

// کاربران سازمان (W26؛ F01 ۵.۶). مدیر پروژه با users.invite فقط پروژه‌های خودش را می‌بیند و دعوت می‌کند
// (own_projects)؛ سرویس سطرها را محدود می‌کند.

const uuid = new ParseUUIDPipe();

@ApiTags('کاربران سازمان')
@Controller()
export class UsersController {
  constructor(
    private readonly orgUsers: OrgUsers,
    private readonly invitations: Invitations,
    private readonly admin: UserAdmin,
    private readonly importer: UserImport,
  ) {}

  @Get('users')
  @Permission('users.invite')
  @ApiOperation({ summary: 'کاربران و دعوت‌های سازمان', operationId: 'getOrgUsers', description: 'W26؛ مخاطب فقط با users.manage (D11)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  list() {
    return this.orgUsers.list();
  }

  @Post('invitations')
  @Permission('users.invite')
  @ApiOperation({ summary: 'دعوت کاربر به پروژه', operationId: 'inviteUser', description: 'F01 ۵.۶؛ ۷ روز؛ سهم مجوز (AC-AC-09)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  invite(@Body() body: InviteUserRequest) {
    return this.invitations.invite(body);
  }

  @Post('invitations/:invitationId/resend')
  @HttpCode(HttpStatus.OK)
  @Permission('users.invite')
  @ApiOperation({ summary: 'ارسال دوبارهٔ دعوت', operationId: 'resendInvitation' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  resend(@Param('invitationId', uuid) id: string) {
    return this.invitations.resend(id);
  }

  @Delete('invitations/:invitationId')
  @Permission('users.invite')
  @ApiOperation({ summary: 'لغو دعوت', operationId: 'revokeInvitation' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  revoke(@Param('invitationId', uuid) id: string) {
    return this.invitations.revoke(id);
  }

  @Post('users/bulk')
  @HttpCode(HttpStatus.OK)
  @Permission('users.invite')
  @ApiOperation({ summary: 'عملیات گروهی W26', operationId: 'bulkUsers' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  bulk(@Body() body: BulkUsersRequest) {
    return this.admin.bulk(body);
  }

  @Post('users/import')
  @HttpCode(HttpStatus.OK)
  @Permission('users.invite')
  @ApiOperation({ summary: 'ورود کاربران از فایل', operationId: 'importUsers', description: 'commit=false فقط پیش‌نمایش؛ حداکثر ۵۰۰ ردیف' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  import(@Body() body: ImportUsersRequest, @Query() query: ImportUsersQuery) {
    return this.importer.run(body.rows, query.commit === 'true');
  }

  @Post('users/:userId/unlock')
  @HttpCode(HttpStatus.OK)
  @Permission('users.manage')
  @ApiOperation({ summary: 'بازکردن قفل حساب', operationId: 'unlockUser', description: 'AC-AC-01' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  unlock(@Param('userId', uuid) id: string) {
    return this.admin.unlock(id);
  }

  @Get('users/:userId/disable-impact')
  @Permission('users.manage')
  @ApiOperation({ summary: 'پیش‌نمایش پیامد غیرفعال‌سازی', operationId: 'getDisableImpact' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true })
  disableImpact(@Param('userId', uuid) id: string) {
    return this.admin.disableImpact(id);
  }

  @Post('users/:userId/disable')
  @HttpCode(HttpStatus.OK)
  @Permission('users.manage')
  @ApiOperation({ summary: 'غیرفعال‌سازی حساب', operationId: 'disableUser', description: 'نشست‌ها باطل؛ خروج از همهٔ پروژه‌ها' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  disable(@Param('userId', uuid) id: string, @Body() body: DisableUserRequest) {
    return this.admin.disable(id, body);
  }

  @Post('users/:userId/enable')
  @HttpCode(HttpStatus.OK)
  @Permission('users.manage')
  @ApiOperation({ summary: 'فعال‌سازی دوبارهٔ حساب', operationId: 'enableUser' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  enable(@Param('userId', uuid) id: string) {
    return this.admin.enable(id);
  }

  @Patch('users/:userId')
  @Permission('users.manage')
  @ApiOperation({ summary: 'مدیر سازمان', operationId: 'setOrgAdmin', description: 'AC-AC-12' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  update(@Param('userId', uuid) id: string, @Body() body: UpdateUserRequest) {
    return this.admin.setOrgAdmin(id, body.isOrgAdmin);
  }

  @Patch('org/security')
  @Permission('org.settings')
  @ApiOperation({ summary: 'ورود دومرحله‌ای اجباری سازمان', operationId: 'setRequire2fa' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  security(@Body() body: OrgSecurityRequest) {
    return this.admin.setRequire2fa(body.require2fa);
  }
}
