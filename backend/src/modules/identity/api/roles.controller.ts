import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CATALOG } from '@projeyar/shared';
import { ApiEnvelopedOk, ApiStandardResponses, FreeformResponse } from '../../../platform/http/swagger.decorators.js';
import { Permission } from '../../../platform/security/decorators.js';
import { Roles } from '../application/roles.js';
import { CreateRoleRequest, RolesImpactRequest, SaveRolePermissionsRequest } from './dto/users.dto.js';

// نقش‌ها و ماتریس دسترسی (W27؛ access-control ۵.۲–۵.۴، ۵.۸). همه roles.edit.

const uuid = new ParseUUIDPipe();

@ApiTags('نقش‌ها و دسترسی')
@Controller()
export class RolesController {
  constructor(private readonly roles: Roles) {}

  @Get('roles')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'نقش‌ها و کاتالوگ دسترسی', operationId: 'getRoles' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  list() {
    return this.roles.list();
  }

  @Get('permissions/catalog')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'کاتالوگ ماتریس W27', operationId: 'getPermissionsCatalog' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  catalog() {
    return PERMISSION_CATALOG;
  }

  @Post('roles/impact')
  @HttpCode(HttpStatus.OK)
  @Permission('roles.edit')
  @ApiOperation({ summary: 'اثر تغییر پیش از ذخیره', operationId: 'rolesImpact', description: 'کاربران متأثر و هشدار دسترسی ضروری (۵.۸)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  impact(@Body() body: RolesImpactRequest) {
    return this.roles.impact(body.changes);
  }

  @Put('roles/:roleId/permissions')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'ذخیرهٔ دسترسی‌های نقش', operationId: 'saveRolePermissions', description: 'AC-AC-08؛ RolePermissionChanged' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  save(@Param('roleId', uuid) id: string, @Body() body: SaveRolePermissionsRequest) {
    return this.roles.savePermissions(id, { grants: body.grants, reason: body.reason ?? null });
  }

  @Post('roles')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'نقش سفارشی', operationId: 'createRole', description: 'بی کپی هیچ دسترسی ندارد (OD-09)' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  create(@Body() body: CreateRoleRequest) {
    return this.roles.create({ name: body.name, copyFromId: body.copyFromId ?? null });
  }

  @Delete('roles/:roleId')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'حذف نقش سفارشی', operationId: 'deleteRole' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses({ notFound: true, conflict: true })
  delete(@Param('roleId', uuid) id: string) {
    return this.roles.delete(id);
  }

  @Get('roles/audit')
  @Permission('roles.edit')
  @ApiOperation({ summary: 'آخرین تغییرهای ماتریس', operationId: 'getRolesAudit' })
  @ApiEnvelopedOk(FreeformResponse)
  @ApiStandardResponses()
  audit() {
    return this.roles.auditTrail();
  }
}
