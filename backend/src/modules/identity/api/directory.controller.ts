import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { IdentityService } from '../application/identity.service.js';
import { MembershipPort } from '../application/ports.js';

class DirectoryQuery {
  @ApiPropertyOptional({ description: 'نام، موبایل یا ایمیل' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'با پروژه: alreadyMember برای «افزودن عضو» (W16)' })
  @IsOptional()
  @IsUUID()
  readonly projectId?: string;
}

// فهرست کاربران فعال سازمان برای انتخاب مدیر و عضو (W48، W16). کد users.invite: همان کسی که می‌تواند
// کسی را به پروژه بیاورد (مدیر سازمان؛ مدیر پروژه در پروژه‌های خودش) `[پیش‌فرض فنی]`.
@ApiTags('کاربران')
@Controller('org/users')
export class DirectoryController {
  constructor(
    private readonly identity: IdentityService,
    private readonly memberships: MembershipPort,
  ) {}

  @Get('search')
  @Permission('users.invite')
  @ApiOperation({
    summary: 'جستجوی کاربران سازمان',
    operationId: 'searchOrgUsers',
    description: 'حداکثر ۸ نفر؛ هر ردیف mobile و alreadyMember (در پروژهٔ projectId) هم دارد',
  })
  @ApiEnvelopedOk(FreeformResponse, { isArray: true })
  @ApiStandardResponses()
  async search(@Query() query: DirectoryQuery) {
    const users = await this.identity.directory(query.q ?? '');
    const members = query.projectId
      ? new Set(
          (await this.memberships.memberships(users.map((user) => user.userId)))
            .filter((entry) => entry.projectId === query.projectId)
            .map((entry) => entry.userId),
        )
      : new Set<string>();
    return users.map((user) => ({ ...user, mobile: user.contact, alreadyMember: members.has(user.userId) }));
  }
}
