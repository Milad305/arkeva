import { AuthSession } from './domain/auth-session.entity.js';
import { BackupCode, Invitation, TrustedDevice } from './domain/invitation.entity.js';
import { LoginAttempt } from './domain/login-attempt.entity.js';
import { OtpChallenge } from './domain/otp-challenge.entity.js';
import { Organization } from './domain/organization.entity.js';
import { OrgRoleCustom, OrgRoleGrant, Role, RolePermission } from './domain/role.entity.js';
import { SignupChallenge } from './domain/signup-challenge.entity.js';
import { StepUpChallenge } from './domain/step-up-challenge.entity.js';
import { User } from './domain/user.entity.js';
import { DeviceToken } from './domain/device-token.entity.js';

/** همهٔ Entityهای ماژول — برای پیکربندی ORM در ریشهٔ ترکیب. */
export const IDENTITY_ENTITIES = [
  Organization,
  User,
  Invitation,
  BackupCode,
  TrustedDevice,
  AuthSession,
  OtpChallenge,
  SignupChallenge,
  StepUpChallenge,
  LoginAttempt,
  Role,
  RolePermission,
  OrgRoleCustom,
  OrgRoleGrant,
  DeviceToken,
];

/** Entityهای دارای org_id که فیلتر tenant می‌گیرند (Organization، Role و SignupChallenge ستون org_id ندارند؛ 05 ۴.۵). */
export const IDENTITY_TENANT_ENTITIES = [
  User,
  Invitation,
  BackupCode,
  TrustedDevice,
  OrgRoleCustom,
  OrgRoleGrant,
  AuthSession,
  OtpChallenge,
  StepUpChallenge,
  LoginAttempt,
  DeviceToken,
];
