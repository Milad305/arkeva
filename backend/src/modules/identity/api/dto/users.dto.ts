import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PERMISSION_CODES } from '@projeyar/shared';
import { PERMISSION_SCOPES } from '../../domain/role.entity.js';

// قرارداد W26، W27، W32 و W04 — همان تایپ‌های `frontend/src/modules/{users,account,auth}/types`.

const ASSIGNABLE_ROLES = ['planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// ─── دعوت و کاربران (W26) ───

export class InviteUserRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'نام دعوت‌شده را بنویسید.' })
  @MaxLength(80, { message: 'نام حداکثر ۸۰ نویسه است.' })
  readonly fullName!: string;

  @ApiProperty({ example: '09121234567', description: 'همیشه لازم؛ ورود با «فراموشی رمز» همین شماره (تصمیم کاربر 1405/08/22)' })
  @IsString({ message: 'شمارهٔ همراه را بنویسید.' })
  @MaxLength(20)
  readonly mobile!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly email?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'پروژه را انتخاب کنید.' })
  readonly projectId!: string;

  @ApiProperty({ enum: ASSIGNABLE_ROLES, isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'دست‌کم یک نقش انتخاب کنید.' })
  @IsIn(ASSIGNABLE_ROLES, { each: true, message: 'این نقش در دعوت قابل انتخاب نیست.' })
  readonly roles!: AssignableRole[];
}

export class BulkUsersRequest {
  @ApiProperty({ enum: ['resend', 'revoke', 'set_roles', 'add_to_project'] })
  @IsIn(['resend', 'revoke', 'set_roles', 'add_to_project'])
  readonly action!: 'resend' | 'revoke' | 'set_roles' | 'add_to_project';

  @ApiProperty({ type: [String], description: 'شناسهٔ کاربر یا `inv:<invitationId>`' })
  @IsArray()
  @ArrayMinSize(1, { message: 'دست‌کم یک ردیف انتخاب کنید.' })
  @ArrayMaxSize(500)
  @IsString({ each: true })
  readonly rowIds!: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  readonly projectId?: string;

  @ApiPropertyOptional({ enum: ASSIGNABLE_ROLES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(ASSIGNABLE_ROLES, { each: true })
  readonly roles?: AssignableRole[];
}

export class ImportRowRequest {
  @ApiProperty() @IsInt() readonly line!: number;
  @ApiProperty() @IsString() @MaxLength(120) readonly fullName!: string;
  @ApiProperty() @IsString() @MaxLength(40) readonly mobile!: string;
  @ApiProperty() @IsString() @MaxLength(120) readonly email!: string;
  @ApiProperty() @IsString() @MaxLength(40) readonly projectCode!: string;
  @ApiProperty() @IsString() @MaxLength(60) readonly role!: string;
}

export class ImportUsersRequest {
  @ApiProperty({ type: [ImportRowRequest] })
  @IsArray()
  @ArrayMaxSize(500, { message: 'هر فایل حداکثر ۵۰۰ ردیف؛ فایل را چند بخش کنید.' })
  @ValidateNested({ each: true })
  @Type(() => ImportRowRequest)
  readonly rows!: ImportRowRequest[];
}

export class ImportUsersQuery {
  @ApiPropertyOptional({ description: 'false فقط پیش‌نمایش' })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly commit?: 'true' | 'false';
}

export class DisableUserRequest {
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string', nullable: true }, description: 'پروژه ← جانشین کار سرپرست (برش ۵)' })
  @IsOptional()
  readonly transfers?: Record<string, string | null>;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  readonly reason!: string;
}

export class UpdateUserRequest {
  @ApiProperty() @IsBoolean() readonly isOrgAdmin!: boolean;
}

export class OrgSecurityRequest {
  @ApiProperty() @IsBoolean() readonly require2fa!: boolean;
}

// ─── نقش‌ها (W27) ───

export class GrantRequest {
  @ApiProperty({ enum: PERMISSION_CODES })
  @IsIn(PERMISSION_CODES, { message: 'کد دسترسی شناخته نیست.' })
  readonly code!: (typeof PERMISSION_CODES)[number];

  @ApiProperty({ enum: PERMISSION_SCOPES })
  @IsIn(PERMISSION_SCOPES, { message: 'دامنهٔ دسترسی درست نیست.' })
  readonly scope!: (typeof PERMISSION_SCOPES)[number];
}

export class RoleChangeRequest {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly roleId!: string;

  @ApiProperty({ type: [GrantRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantRequest)
  readonly grants!: GrantRequest[];
}

export class RolesImpactRequest {
  @ApiProperty({ type: [RoleChangeRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleChangeRequest)
  readonly changes!: RoleChangeRequest[];
}

export class SaveRolePermissionsRequest {
  @ApiProperty({ type: [GrantRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantRequest)
  readonly grants!: GrantRequest[];

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string | null;
}

export class CreateRoleRequest {
  @ApiProperty()
  @IsString()
  @MaxLength(60, { message: 'نام نقش حداکثر ۶۰ نویسه است.' })
  readonly name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  readonly copyFromId?: string | null;
}

// ─── حساب من (W32) ───

class PreferencesRequest {
  @ApiProperty({ enum: ['jalali', 'gregorian'] }) @IsIn(['jalali', 'gregorian']) readonly calendar!: 'jalali' | 'gregorian';
  @ApiProperty({ enum: ['fa', 'latin'] }) @IsIn(['fa', 'latin']) readonly digits!: 'fa' | 'latin';
  @ApiProperty({ enum: ['auto', 'million', 'billion'] }) @IsIn(['auto', 'million', 'billion']) readonly amountScale!: 'auto' | 'million' | 'billion';
  @ApiProperty({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(200) readonly startPage!: string | null;
}

/** یا پروفایل یا ترجیحات — همان دو mutation فرانت روی `PATCH /me`. */
export class UpdateMeRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) readonly fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) readonly jobTitle?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @IsString() @MaxLength(80) readonly department?: string | null;

  @ApiPropertyOptional({ type: PreferencesRequest })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesRequest)
  readonly preferences?: PreferencesRequest;
}

export class ChangePasswordRequest {
  @ApiProperty({ format: 'password' }) @IsString() @IsNotEmpty({ message: 'رمز فعلی را بنویسید.' }) @MaxLength(200) readonly current!: string;
  @ApiProperty({ format: 'password' }) @IsString() @MaxLength(200) readonly next!: string;
  @ApiProperty() @IsBoolean() readonly signOutOthers!: boolean;
}

export class Enable2faRequest {
  @ApiProperty({ description: 'کد step-up با هدف account.enable_2fa', pattern: '^\\d{6}$' })
  @Matches(/^\d{6}$/, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly code!: string;
}

export class Disable2faRequest {
  @ApiProperty({ format: 'password' }) @IsString() @IsNotEmpty({ message: 'رمز عبور را بنویسید.' }) @MaxLength(200) readonly password!: string;
}

export class LoginHistoryQuery {
  @ApiPropertyOptional({ default: 30 }) @IsOptional() @Matches(/^\d{1,2}$/) readonly days?: string;
}

// ─── بازیابی رمز (W04) ───

export class ForgotPasswordRequest {
  @ApiProperty({ example: '09121234567' }) @IsString({ message: 'شمارهٔ موبایل را بنویسید.' }) @MaxLength(20) readonly mobile!: string;
}

export class ResetTokenRequest {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'بازیابی رمز را از نو شروع کنید.' }) @MaxLength(300) readonly resetToken!: string;
}

export class VerifyResetCodeRequest extends ResetTokenRequest {
  @ApiProperty({ pattern: '^\\d{6}$' }) @Matches(/^\d{6}$/, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' }) readonly code!: string;
}

export class ResetPasswordRequest extends ResetTokenRequest {
  @ApiPropertyOptional({ description: 'کد پیامک؛ برای رمز منقضی لازم نیست', pattern: '^\\d{6}$' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'کد ۶ رقمی پیامک را کامل بنویسید.' })
  readonly code?: string;

  @ApiProperty({ format: 'password' }) @IsString() @MaxLength(200) readonly newPassword!: string;
  @ApiProperty() @IsBoolean() readonly revokeOtherSessions!: boolean;
}

export class ForgotPasswordResponse {
  @ApiProperty() readonly resetToken!: string;
  @ApiProperty({ example: '0912 *** 4321' }) readonly maskedMobile!: string;
}
