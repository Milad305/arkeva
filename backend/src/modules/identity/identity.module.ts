import { Module } from '@nestjs/common';
import { AccountController } from './api/account.controller.js';
import { AppAuthController } from './api/app-auth.controller.js';
import { AuthController } from './api/auth.controller.js';
import { DirectoryController } from './api/directory.controller.js';
import { RefreshCookie } from './api/refresh-cookie.js';
import { RolesController } from './api/roles.controller.js';
import { UsersController } from './api/users.controller.js';
import { Account } from './application/account.js';
import { Credentials } from './application/credentials.js';
import { Invitations } from './application/invitations.js';
import { OrgUsers } from './application/org-users.js';
import { PasswordRecovery } from './application/password-recovery.js';
import { Roles } from './application/roles.js';
import { TrustedDevices } from './application/trusted-devices.js';
import { UserAdmin } from './application/user-admin.js';
import { UserImport } from './application/user-import.js';
import { IdentityService } from './application/identity.service.js';
import { IdentitySessions } from './application/identity-sessions.js';
import { AppLogin } from './application/app-login.js';
import { DeviceTokens } from './application/device-tokens.js';
import { LoginCommand } from './application/login.command.js';
import { OtpIssuer } from './application/otp-issuer.js';
import { ResendOtpCommand, VerifyOtpCommand } from './application/otp.commands.js';
import { SessionIssuer } from './application/session-issuer.js';
import { SessionViewBuilder } from './application/session-view.js';
import { LogoutCommand, RefreshSessionCommand } from './application/session.commands.js';
import { StepUpChallenges } from './application/step-up.js';
import { PasswordHasher } from './infrastructure/password-hasher.js';

// F01 — دسترسی و نشست (docs/backend/01 ۴). مالک Organization، User، Role، RolePermission،
// AuthSession، OtpChallenge، StepUpChallenge، LoginAttempt.
@Module({
  controllers: [AuthController, AppAuthController, DirectoryController, UsersController, AccountController, RolesController],
  providers: [
    PasswordHasher,
    SessionIssuer,
    OtpIssuer,
    SessionViewBuilder,
    LoginCommand,
    AppLogin,
    DeviceTokens,
    VerifyOtpCommand,
    ResendOtpCommand,
    RefreshSessionCommand,
    LogoutCommand,
    IdentitySessions,
    IdentityService,
    StepUpChallenges,
    RefreshCookie,
    TrustedDevices,
    Credentials,
    PasswordRecovery,
    OrgUsers,
    Invitations,
    UserAdmin,
    UserImport,
    Account,
    Roles,
  ],
  exports: [IdentityService, PasswordHasher, StepUpChallenges, Invitations, OrgUsers, DeviceTokens, Account],
})
export class IdentityModule {}
